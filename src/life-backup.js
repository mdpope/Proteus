import fs from 'node:fs';
import path from 'node:path';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { atomicJSON } from './files.js';
const MAX_DUMP = 2 * 1024 * 1024 * 1024;
const MAX_ROWS = 200_000;
const MAX_ROW_BYTES = 256 * 1024 * 1024;
const MAX_AGE = 30 * 60_000;
export const PROTECTED_TABLES = ['workspaces','memberships','vehicles','captures','attachments','service_records','fuel_fills','odometer_readings','maintenance_tasks','foods','food_versions','meal_entries','audit_events','migrations','proteus_life_schema','proteus_life_mutations'];
const ident = value => { if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error('Unsupported backup table identifier.'); return '`' + value + '`'; };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => Buffer.isBuffer(value) ? { binary: value.toString('base64') } : Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : typeof value === 'bigint' ? String(value) : value;
export function privateFile(file, maxSize = MAX_DUMP) {
    if (!path.isAbsolute(file || '')) throw new Error('Choose an absolute private backup path.');
    let info; try { info = fs.lstatSync(file); } catch { throw new Error('The private backup file is unavailable.'); }
    if (!info.isFile() || info.mode & 0o077 || (process.getuid && info.uid !== process.getuid()) || info.size > maxSize) throw new Error('Backup inputs must be owner-only regular files within the supported size limit.');
    return info;
}
export async function fileDigest(file) {
    privateFile(file); const digest = createHash('sha256');
    for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
    return digest.digest('hex');
}
export async function databaseIdentity(db) {
    if (db.driver === 'sqlite') return hash({ driver: 'sqlite', file: fs.realpathSync(db.profile.database) });
    const row = (await db.all('SELECT DATABASE() AS database_name, @@hostname AS server_hostname, @@server_id AS server_id, @@port AS server_port'))[0];
    if (!row?.database_name || !row?.server_hostname) throw new Error('Could not establish the database identity.');
    return hash({ driver: 'mysql', ...canonical(row) });
}
export async function databaseSnapshot(db) {
    const tables = (await db.tables()).filter(table => PROTECTED_TABLES.includes(table)).sort();
    if (!['foods','food_versions','meal_entries','migrations'].every(table => tables.includes(table))) throw new Error('The protected Life tables are incomplete.'); const result = {}; let rowCount = 0, totalBytes = 0;
    await db.beginSnapshot();
    try {
        for (const table of tables) {
            let schema;
            if (db.driver === 'sqlite') schema = await db.all('SELECT type,name,sql FROM sqlite_master WHERE tbl_name=? AND sql IS NOT NULL ORDER BY type,name', [table]);
            else {
                const create = await db.all('SHOW CREATE TABLE ' + ident(table));
                if (!create[0]?.['Create Table']) throw new Error('Backup verification requires ordinary tables; views need the server administrator workflow.');
                schema = create[0]['Create Table'];
            }
            const columns = (await db.columns(table)).sort(); const rows = []; let offset = 0;
            for (;;) {
                const batch = await db.all('SELECT * FROM ' + ident(table) + ' ORDER BY ' + columns.map(ident).join(',') + ' LIMIT 1000 OFFSET ' + offset);
                for (const row of batch) { const text = JSON.stringify(canonical(row)); totalBytes += Buffer.byteLength(text); rowCount++; if (rowCount > MAX_ROWS || totalBytes > MAX_ROW_BYTES) throw new Error('This backup requires the administrator workflow because it exceeds desktop verification limits.'); rows.push(createHash('sha256').update(text).digest('hex')); }
                offset += batch.length; if (batch.length < 1000) break;
            }
            // A sorted row multiset also covers tables with no unique primary key.
            result[table] = { count: rows.length, schema: hash(canonical(schema)), rows: hash(rows.sort()) };
        }
        await db.commit();
    } catch (error) { await db.rollback().catch(() => {}); throw error; }
    return { digest: hash(result), tables: result, tableCount: tables.length, rowCount };
}
function signingKey(home, create) {
    const file = path.join(home, 'backup-verifier.key');
    if (!fs.existsSync(file) && create) { fs.mkdirSync(home, { recursive: true, mode: 0o700 }); fs.writeFileSync(file, randomBytes(32), { flag: 'wx', mode: 0o600 }); }
    privateFile(file, 32); const key = fs.readFileSync(file); if (key.length !== 32) throw new Error('Backup verifier key is invalid.'); return key;
}
const sign = (key, value) => createHmac('sha256', key).update(JSON.stringify(value)).digest('hex');
export async function verifyRestoredBackup({ source, restored, dumpFile, home, now = Date.now() }) {
    const info = privateFile(dumpFile); if (!info.size) throw new Error('The SQL backup is empty.');
    if (source.driver !== restored.driver) throw new Error('Verify a restoration using the same database engine.');
    const sourceIdentity = await databaseIdentity(source), restoreIdentity = await databaseIdentity(restored);
    if (sourceIdentity === restoreIdentity) throw new Error('The restore check must use an independent database, never the live source.');
    const dumpHash = await fileDigest(dumpFile);
    const original = await databaseSnapshot(source), recovered = await databaseSnapshot(restored);
    if (original.digest !== recovered.digest) throw new Error('The restored database does not exactly match the live schema and records. Create a fresh backup and restore it before continuing.');
    // Recheck the source after the independent restore read; an active writer invalidates the receipt.
    if ((await databaseSnapshot(source)).digest !== original.digest || (await fileDigest(dumpFile)) !== dumpHash) throw new Error('The database or backup changed during verification. Repeat the restore check.');
    const payload = { version: 1, sourceIdentity, restoreIdentity, dumpFile: fs.realpathSync(dumpFile), dumpHash, dumpBytes: info.size, snapshot: original, verifiedAt: new Date(now).toISOString(), expiresAt: new Date(now + MAX_AGE).toISOString() };
    const receipt = { ...payload, proof: sign(signingKey(home, true), payload) };
    const file = path.join(home, 'verified-backup.json'); atomicJSON(file, receipt);
    return { file, receipt };
}
export async function validateBackupReceipt(db, home, { now = Date.now(), receiptFile = db.profile.backupReceipt } = {}) {
    privateFile(receiptFile, 512_000); let receipt;
    try { receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8')); } catch { throw new Error('The backup verification receipt is invalid.'); }
    const { proof, ...payload } = receipt;
    const expected = sign(signingKey(home, false), payload);
    if (!/^[a-f0-9]{64}$/.test(proof || '') || !timingSafeEqual(Buffer.from(proof), Buffer.from(expected))) throw new Error('The backup receipt was not created by this computer’s restore verifier.');
    const verified = Date.parse(payload.verifiedAt), expires = Date.parse(payload.expiresAt);
    if (payload.version !== 1 || !Number.isFinite(verified) || !Number.isFinite(expires) || verified > now || expires < now || expires - verified > MAX_AGE) throw new Error('The backup verification expired. Verify a fresh restored backup before upgrading.');
    if (await databaseIdentity(db) !== payload.sourceIdentity) throw new Error('This backup belongs to a different source database.');
    if ((await fileDigest(payload.dumpFile)) !== payload.dumpHash) throw new Error('The SQL backup checksum no longer matches its verified receipt.');
    if ((await databaseSnapshot(db)).digest !== payload.snapshot.digest) throw new Error('Database records changed since the backup was verified. Create and verify a fresh backup.');
    return { verified: true, verifiedAt: payload.verifiedAt, expiresAt: payload.expiresAt, tableCount: payload.snapshot.tableCount, rowCount: payload.snapshot.rowCount };
}
