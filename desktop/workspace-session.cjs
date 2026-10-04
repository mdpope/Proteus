const fs = require('node:fs');
const path = require('node:path');
const text = (value, max = 4096) => typeof value === 'string' ? value.slice(0, max) : '';
function normalizeSession(value) {
  const tabs = [], seen = new Set();
  for (const item of Array.isArray(value?.tabs) ? value.tabs.slice(0, 100) : []) {
    if (!item || !['overview','schedule','run','markdown','browser','standup','omi','life','terminal'].includes(item.type)) continue;
    const tab = {id:text(item.id,256),type:item.type,label:text(item.label,200)};
    if (!tab.id || seen.has(tab.id) || (tab.id==='overview') !== (tab.type==='overview')) continue;
    if (tab.type === 'markdown') { tab.file=text(item.file); if (!path.isAbsolute(tab.file)) continue; }
    if (tab.type === 'browser') {
      try { const url = item.url ? new URL(item.url) : null; if (url && (!['http:','https:'].includes(url.protocol) || url.username || url.password)) continue; tab.url = url?.href || ''; } catch { continue; }
    }
    if (tab.type === 'terminal') {
      if (!item.terminal?.id) continue;
      tab.terminal=Object.fromEntries(['id','profileId','rootId','directory'].map(key=>[key,text(item.terminal[key])]));
    }
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
  get() { try { return normalizeSession(JSON.parse(fs.readFileSync(this.file,'utf8'))); } catch(error) { if(error.code==='ENOENT')return null; throw new Error('Saved desktop workspace could not be read. The original file was preserved.'); } }
  save(value) {
    const clean=normalizeSession(value), json=JSON.stringify(clean,null,2)+'\n';
    if(json===this.last)return;
    const temporary=this.file+'.tmp';fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(temporary,json,{mode:0o600});fs.renameSync(temporary,this.file);this.last=json;
  }
}
module.exports={WorkspaceSession,normalizeSession};
