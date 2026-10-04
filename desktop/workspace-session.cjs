const fs = require('node:fs');
const path = require('node:path');
const {normalizeHistory,safeHistoryURL}=require('./browser-history.cjs');
const MAX_SESSION_BYTES=2*1024*1024, MAX_TOTAL_HISTORY_BYTES=512*1024;
const text = (value, max = 4096) => typeof value === 'string' ? value.slice(0, max) : '';
function normalizeSession(value) {
  const tabs = [], seen = new Set();let historyBytes=0;
  for (const item of Array.isArray(value?.tabs) ? value.tabs.slice(0, 100) : []) {
    if (!item || !['overview','schedule','run','markdown','browser','standup','omi','life','terminal','remote-run'].includes(item.type)) continue;
    const tab = {id:text(item.id,256),type:item.type,label:text(item.label,200)};
    if (!tab.id || seen.has(tab.id) || (tab.id==='overview') !== (tab.type==='overview')) continue;
    if (tab.type === 'remote-run') { if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.hostId||'')||!/^[a-zA-Z0-9_-]{1,128}$/.test(item.runId||''))continue;tab.hostId=item.hostId;tab.runId=item.runId;tab.id='peer:'+tab.hostId+':'+tab.runId; }
    if (tab.type === 'markdown') { tab.file=text(item.file); if (!path.isAbsolute(tab.file)) continue; }
    if (tab.type === 'browser') {
      const history=normalizeHistory(item.history), url=history?.entries[history.index].url || safeHistoryURL(item.url);
      if(item.url&&!url)continue;
      tab.url=url||'';
      if(history){const bytes=Buffer.byteLength(JSON.stringify(history));if(historyBytes+bytes<=MAX_TOTAL_HISTORY_BYTES){tab.history=history;historyBytes+=bytes;}}
    }
    if (tab.type === 'terminal') {
      if (!item.terminal?.id) continue;
      tab.terminal=Object.fromEntries(['id','profileId','rootId','directory'].map(key=>[key,text(item.terminal[key])]));
    }
    if(seen.has(tab.id))continue;
    seen.add(tab.id); tabs.push(tab);
  }
  const overview=tabs.findIndex(tab=>tab.type==='overview');
  if(overview<0)tabs.unshift({id:'overview',type:'overview',label:'Schedules'});
  else if(overview>0)tabs.unshift(...tabs.splice(overview,1));
  const pages=['schedules','runs','attention','context','credentials','providers','remote','settings'];
  return {schemaVersion:1,tabs,active:tabs.some(tab=>tab.id===value?.active)?value.active:'overview',page:pages.includes(value?.page)?value.page:'schedules'};
}
class WorkspaceSession {
  constructor(home) { this.file=path.join(home,'desktop-workspace.json'); this.last=''; }
  get() { try { if(fs.statSync(this.file).size>MAX_SESSION_BYTES)throw new Error('Workspace record exceeds size limit');return normalizeSession(JSON.parse(fs.readFileSync(this.file,'utf8'))); } catch(error) { if(error.code==='ENOENT')return null; throw new Error('Saved desktop workspace could not be read. The original file was preserved.'); } }
  save(value) {
    const clean=normalizeSession(value), json=JSON.stringify(clean,null,2)+'\n';
    if(Buffer.byteLength(json)>MAX_SESSION_BYTES)throw new Error('Workspace record exceeds size limit.');
    if(json===this.last)return;
    const temporary=this.file+'.tmp';fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(temporary,json,{mode:0o600});fs.chmodSync(temporary,0o600);fs.renameSync(temporary,this.file);this.last=json;
  }
}
module.exports={WorkspaceSession,normalizeSession};
