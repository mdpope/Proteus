// Isolated copy of local Proteus data for load and smoothness testing (N11-17).
// Usage: node scripts/prepare-load-test-copy.mjs [--source DATA_HOME]
// The source is only read/APFS-cloned; every modification applies to the copy, which is a
// private temporary preview home. Run the profile with:
//   node test/scroll-smoothness-profile.mjs --live-copy PRINTED_ROOT
// Delete the printed root afterwards: it contains private chat and browsing history.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const sourceIndex=process.argv.indexOf('--source'),live=sourceIndex>0?path.resolve(process.argv[sourceIndex+1]):path.join(os.homedir(),'Library/Application Support/Proteus');
if(!fs.existsSync(path.join(live,'runs')))throw Error('Choose an existing Proteus data home with --source.');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-live-copy-'));fs.chmodSync(root,0o700);
let prepared=false;process.on('exit',()=>{if(!prepared)fs.rmSync(root,{recursive:true,force:true});});
const home=path.join(root,'app-data');for(const dir of ['app-data','electron','codex','workspaces','source-library'])fs.mkdirSync(path.join(root,dir),{mode:0o700});
fs.writeFileSync(path.join(root,'.proteus-design-preview.json'),JSON.stringify({schemaVersion:1,purpose:'proteus-isolated-desktop-design-preview'})+'\n',{mode:0o600});
fs.writeFileSync(path.join(root,'.credential-mode.json'),JSON.stringify({schemaVersion:1,mode:'mock'})+'\n',{mode:0o600});
// Allowlist: presentation/history data needed for realistic load. Excluded on purpose:
// credentials, pairing/relay identity, encrypted peer/index stores, browser cookie partitions,
// extensions, agent browser grants, terminal sessions, remote command journals and locks.
const include=['runs','content-tabs.json','content-tab-sources.json','context.json','context-catalog.json','projects.json','desktop-workspace.json','desktop-windows.json','window-sessions','window-layouts','window-layouts.json','view-positions.json','browser-profiles.json','browser-sites.json','browser-history.sqlite','browser-history.sqlite-wal','browser-history.sqlite-shm','browsing-history.json','tab-thumbnails','settings.json','permissions.json','attention-acknowledgements.json','activity.json','chat-attachments','chat-control','schedules','scheduler.json','workspace-deletions.json','browser-media.json'];
// Atomic writers create and rename temporary siblings while the owner is running. They are
// never durable inputs, and copying them can race their rename. Clone only committed files.
const copied=[];for(const name of include){const from=path.join(live,name);if(!fs.existsSync(from))continue;fs.cpSync(from,path.join(home,name),{recursive:true,preserveTimestamps:true,mode:fs.constants.COPYFILE_FICLONE,filter:file=>!path.basename(file).endsWith('.tmp')});copied.push(name);}
const json=file=>JSON.parse(fs.readFileSync(file,'utf8')),write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{mode:0o600});
// Preview mode reads its project catalog from preview-projects.json.
if(fs.existsSync(path.join(home,'projects.json')))fs.copyFileSync(path.join(home,'projects.json'),path.join(home,'preview-projects.json'));
fs.writeFileSync(path.join(home,'desktop-preview.json'),JSON.stringify({schemaVersion:1,isolatedDesktopPreview:true,home:fs.realpathSync(home),createdAt:new Date().toISOString(),label:'Isolated load-test copy of live data; schedules disabled; no credentials',providerDefaultsInitialized:true})+'\n',{mode:0o600});
// Never let a copied schedule fire.
let schedules=0;for(const file of fs.existsSync(path.join(home,'schedules'))?fs.readdirSync(path.join(home,'schedules')):[]){if(!file.endsWith('.json'))continue;const p=path.join(home,'schedules',file);try{const value=json(p);value.enabled=false;fs.rmSync(p);write(p,value);schedules++;}catch{fs.rmSync(p);}}
// Restored sessions: drop terminals (no shell/startup command replay) and keep browser pages unloaded.
let terminals=0,browsers=0;const sanitize=file=>{const p=path.join(home,file);if(!fs.existsSync(p))return;const value=json(p);if(!Array.isArray(value.tabs))return;value.tabs=value.tabs.filter(tab=>{if(['terminal','agent-terminal'].includes(tab.type)){terminals++;return false;}if(tab.type==='browser'){tab.unloaded=true;delete tab.persist;browsers++;}return true;});if(!value.tabs.some(tab=>tab.id===value.active))value.active=value.tabs[0]?.id;fs.rmSync(p);write(p,value);};
sanitize('desktop-workspace.json');for(const file of fs.existsSync(path.join(home,'window-sessions'))?fs.readdirSync(path.join(home,'window-sessions')):[])if(file.endsWith('.json'))sanitize(path.join('window-sessions',file));
const runs=fs.readdirSync(path.join(home,'runs')).length;
prepared=true;console.log(JSON.stringify({root,copied,runs,schedulesDisabled:schedules,terminalTabsRemoved:terminals,browserTabsUnloaded:browsers}));
