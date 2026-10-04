import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DatabaseSync, backup } from 'node:sqlite';
import { validateBackupReceipt } from './life-backup.js';
import { atomicJSON } from './files.js';
import { validateEvidenceProfile } from './life-evidence.js';
const runFile = promisify(execFile);
export const LIFE_SCHEMA = JSON.parse(fs.readFileSync(fileURLToPath(new URL('./life-schema.json', import.meta.url)), 'utf8'));
export const LIFE_VERSION = 2;
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const portableMigration = [
  'CREATE TABLE IF NOT EXISTS proteus_life_schema (version INTEGER PRIMARY KEY, checksum VARCHAR(64) NOT NULL, applied_at VARCHAR(32) NOT NULL)',
  'CREATE TABLE IF NOT EXISTS proteus_life_mutations (workspace_id BIGINT NOT NULL, user_id BIGINT NOT NULL, idempotency_key VARCHAR(100) NOT NULL, request_hash VARCHAR(64) NOT NULL, result_json TEXT NOT NULL, created_at VARCHAR(32) NOT NULL, PRIMARY KEY(workspace_id,user_id,idempotency_key))'
];
export const LIFE_MIGRATION = { version:2, name:'Native action retry protection', checksum:digest(portableMigration), statements:portableMigration };
const ident = value => {if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error('Invalid database identifier.');return '`'+value+'`';};

export function readLifeProfile(file) {
  if (!path.isAbsolute(file)) throw new Error('Choose an absolute private connection profile path.');
  const info = fs.lstatSync(file);
  if (!info.isFile() || (process.getuid && info.uid !== process.getuid()) || info.mode & 0o077 || info.size > 64_000) throw new Error('The connection profile must be an owner-only file (0600).');
  const p = JSON.parse(fs.readFileSync(file,'utf8'));
  if (!['sqlite','mysql'].includes(p.driver)) throw new Error('Choose SQLite or MariaDB/MySQL.');
  if (!Number.isSafeInteger(p.userId) || p.userId < 1 || !Number.isSafeInteger(p.workspaceId) || p.workspaceId < 1) throw new Error('The private profile must bind one existing user and workspace.');
  if (p.password || p.url) throw new Error('Use a Keychain credential reference, never a password or connection URL in the profile.');
  if (p.driver === 'sqlite' && (!path.isAbsolute(p.database || '') || !fs.existsSync(p.database))) throw new Error('The selected existing database is unavailable.');
  if (p.driver === 'mysql') {
    if (p.port !== undefined && (!Number.isInteger(p.port) || p.port < 1 || p.port > 65535)) throw new Error('Choose a valid database port.');
    if (!p.host || !p.database || !p.username || !p.credential?.service || !p.credential?.account) throw new Error('The private database profile is incomplete.');
    if (!p.ssh && !p.tls) throw new Error('Remote database profiles require TLS or an authenticated SSH tunnel.');
    if (p.ssh && (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(p.ssh.alias || '') || p.host !== '127.0.0.1')) throw new Error('SSH profiles must use a saved SSH alias and the database loopback host.');
  }
  validateEvidenceProfile(p);
  p.readOnly = p.readOnly !== false;
  return p;
}
async function keychainSecret(ref) {
  if (process.platform !== 'darwin') throw new Error('Configure a supported OS credential resolver for this host.');
  try { const {stdout}=await runFile('/usr/bin/security',['find-generic-password','-s',ref.service,'-a',ref.account,'-w'],{maxBuffer:64_000,timeout:15_000}); return stdout.replace(/\r?\n$/,''); } catch { const error = new Error('Unlock the login Keychain and approve the Proteus credential prompt, then retry.'); error.keychainLocked = true; throw error; }
}
async function sshTunnel(p) {
  const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
  const child=spawn('/usr/bin/ssh',['-N','-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes','-o','ConnectTimeout=10','-L',`127.0.0.1:${port}:127.0.0.1:${Number(p.port || 3306)}`,p.ssh.alias],{stdio:['ignore','ignore','pipe']});
  let exited=false; child.on('exit',()=>{exited=true;}); child.on('error',()=>{exited=true;}); child.stderr.resume();
  for(let i=0;i<100;i++) {
    if(exited) throw new Error('The saved SSH connection could not establish a database tunnel.');
    const ready=await new Promise(resolve=>{const s=net.connect({port,host:'127.0.0.1'});s.once('connect',()=>{s.destroy();resolve(true);});s.once('error',()=>resolve(false));});
    if(ready)return {port,close:()=>child.kill('SIGTERM')};
    await new Promise(r=>setTimeout(r,100));
  }
  child.kill('SIGTERM');throw new Error('Database tunnel timed out.');
}
export async function openLifeDatabase(profile,{resolveSecret=keychainSecret,createConnection,evidenceOptions}={}) {
  if(profile.driver==='sqlite') {
    const db=new DatabaseSync(profile.database,{readOnly:profile.readOnly===true});
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    return {driver:'sqlite',profile,evidenceOptions,
      all:async(sql,args=[])=>db.prepare(sql).all(...args),
      run:async(sql,args=[])=>{const r=db.prepare(sql).run(...args);return {insertId:Number(r.lastInsertRowid),changes:Number(r.changes)};},
      exec:async(sql)=>db.exec(sql),
      beginSnapshot:async()=>db.exec('BEGIN'),
      begin:async()=>db.exec('BEGIN IMMEDIATE'),commit:async()=>db.exec('COMMIT'),rollback:async()=>db.exec('ROLLBACK'),
      columns:async(table)=>db.prepare('PRAGMA table_info('+ident(table)+')').all().map(x=>x.name),
      tables:async()=>db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(x=>x.name),
      backup:async(file)=>{fs.writeFileSync(file,'',{flag:'wx',mode:0o600});await backup(db,file);fs.chmodSync(file,0o600);const copy=new DatabaseSync(file,{readOnly:true});try {if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Backup integrity check failed.');}finally{copy.close();}},
      close:async()=>db.close()};
  }
  let tunnel,connection;
  try {
    if(profile.ssh)tunnel=await sshTunnel(profile);
    const mysql=await import('mysql2/promise');
    const tls=profile.tls ? {rejectUnauthorized:true,...(profile.tls.caFile?{ca:fs.readFileSync(profile.tls.caFile)}:{}),...(profile.tls.certFile?{cert:fs.readFileSync(profile.tls.certFile),key:fs.readFileSync(profile.tls.keyFile)}:{})}:undefined;
    connection=await (createConnection||mysql.createConnection)({host:tunnel?'127.0.0.1':profile.host,port:tunnel?.port || Number(profile.port || 3306),user:profile.username,password:await resolveSecret(profile.credential),database:profile.database,ssl:tls,connectTimeout:10_000,dateStrings:true,decimalNumbers:false,multipleStatements:false});
    if(profile.readOnly===true)await connection.query('SET SESSION TRANSACTION READ ONLY');
    const writable=()=>{if(profile.readOnly===true)throw new Error('This connection is read-only.');};
    const adapter = {driver:'mysql',profile,evidenceOptions,
      all:async(sql,args=[])=>{const [rows]=await connection.execute({sql,timeout:15_000},args);return rows;},
      run:async(sql,args=[])=>{writable();const [r]=await connection.execute({sql,timeout:15_000},args);return {insertId:r.insertId,changes:r.affectedRows};},
      exec:async(sql)=>{writable();return connection.query({sql,timeout:15_000});},beginSnapshot:()=>connection.query({sql:'START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY',timeout:15_000}),begin:()=>connection.beginTransaction(),commit:()=>connection.commit(),rollback:()=>connection.rollback(),
      columns:async(table)=>{const [rows]=await connection.query({sql:'SHOW COLUMNS FROM '+ident(table),timeout:15_000});return rows.map(x=>x.Field);},
      tables:async()=>{const [rows]=await connection.query({sql:'SHOW TABLES',timeout:15_000});return rows.map(x=>Object.values(x)[0]);},
      backup:async(file,{verificationHome}={})=>{if(!verificationHome)throw new Error('Verify a restored server backup on this Mac before applying the upgrade.');const checked=await validateBackupReceipt(adapter,verificationHome);atomicJSON(file,{...checked,receipt:JSON.parse(fs.readFileSync(profile.backupReceipt,'utf8'))});},
      close:async()=>{try{await connection.end();}finally{tunnel?.close();}}};
    return adapter;
  } catch (error) {await connection?.end().catch(()=>{});tunnel?.close();if(error.keychainLocked)throw error;throw new Error('Database connection failed. Check the private profile, Keychain credential, TLS or SSH access.');}
}
export async function nutritionFingerprint(db) {
  const tables=await db.tables(); const rows={};
  for(const table of ['foods','food_versions','meal_entries']) rows[table]=tables.includes(table)?await db.all('SELECT * FROM '+ident(table)+' ORDER BY id'):[];
  return {digest:digest(rows),counts:Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,v.length]))};
}
export async function inspectLifeSchema(db) {
  const tables=await db.tables(); if(!tables.length)return {current:0,available:LIFE_VERSION,empty:true,migrations:[{version:1,name:'Compatible personal records schema'},LIFE_MIGRATION],compatible:true};
  for(const table of ['users','workspaces','memberships','vehicles','captures','attachments','service_records','fuel_fills','odometer_readings','maintenance_tasks','foods','food_versions','meal_entries','audit_events','migrations']) if(!tables.includes(table))throw new Error('This database is not a compatible personal-records installation.');
  for(const [table,required] of Object.entries({meal_entries:['food_version_id','idempotency_key','request_hash','deleted_at'],food_versions:['food_id','calories','protein','carbs','fat'],foods:['current_version_id','user_id','workspace_id']})) {
    const columns=await db.columns(table); if(required.some(x=>!columns.includes(x)))throw new Error('This database needs its original Laravel migrations before native Life can connect.');
  }
  const migrations=await db.all('SELECT migration FROM migrations');
  if(LIFE_SCHEMA.laravelMigrations.some(id=>!migrations.some(row=>row.migration===id)))throw new Error('The existing Laravel migration history is incomplete. No automatic repair was attempted.');
  let current=1;
  if(tables.includes('proteus_life_schema')) {
    const records=await db.all('SELECT version, checksum FROM proteus_life_schema ORDER BY version');
    if(records.some(r=>Number(r.version)>LIFE_VERSION))throw new Error('This database requires a newer Proteus app.');
    const applied=records.find(r=>Number(r.version)===2);
    if(applied){if(!tables.includes('proteus_life_mutations'))throw new Error('The native migration is incomplete. Restore or review the schema before connecting.');if(applied.checksum!==LIFE_MIGRATION.checksum)throw new Error('The native migration checksum changed.');current=2;}
  }
  return {current,available:LIFE_VERSION,compatible:true,empty:false,migrations:current<2?[LIFE_MIGRATION]:[]};
}
export async function installCompatibleSchema(db,{ownerName,ownerEmail,workspaceName}) {
  if(db.driver!=='sqlite')throw new Error('New installations use a local SQLite database. Connect an existing MariaDB installation through a private profile.');
  for(const sql of LIFE_SCHEMA.sqlite)await db.exec(sql);
  for(const migration of LIFE_SCHEMA.laravelMigrations)await db.run('INSERT INTO migrations(migration,batch) VALUES(?,1)',[migration]);
  const now=new Date().toISOString();
  const workspace=await db.run('INSERT INTO workspaces(name,slug,timezone,created_at,updated_at) VALUES(?,?,?,?,?)',[workspaceName,'personal',Intl.DateTimeFormat().resolvedOptions().timeZone,now,now]);
  const user=await db.run('INSERT INTO users(name,email,password,current_workspace_id,created_at,updated_at) VALUES(?,?,?,?,?,?)',[ownerName,ownerEmail,'!proteus-device-local-no-password',workspace.insertId,now,now]);
  await db.run('INSERT INTO memberships(workspace_id,user_id,role,created_at,updated_at) VALUES(?,?,?,?,?)',[workspace.insertId,user.insertId,'owner',now,now]);
  return {userId:user.insertId,workspaceId:workspace.insertId};
}
export async function applyNativeMigration(db) {
  for(const sql of portableMigration)await db.exec(sql);
  const old=await db.all('SELECT checksum FROM proteus_life_schema WHERE version=2');
  if(old.length){if(old[0].checksum!==LIFE_MIGRATION.checksum)throw new Error('Migration checksum conflict.');return;}
  await db.run('INSERT INTO proteus_life_schema(version,checksum,applied_at) VALUES(?,?,?)',[2,LIFE_MIGRATION.checksum,new Date().toISOString()]);
}
