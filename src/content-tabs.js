import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {safeHistoryURL,normalizeHistory}=require('../desktop/browser-history.cjs');
const ID=/^[a-zA-Z0-9_:.\-]{1,256}$/;
const title=value=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,'').slice(0,200):'';
export function contentTab(value){
  if(!value||!ID.test(value.id||'')||!['browser','document'].includes(value.type))throw new Error('Choose a bounded browser or document tab.');
  const tab={id:value.id,type:value.type,title:title(value.title)||'New tab'};if(title(value.customTitle))tab.customTitle=title(value.customTitle);
  if(tab.type==='browser') { if(tab.id.startsWith('document:'))throw new Error('Document tab IDs are reserved for host documents.');const url=value.url?safeHistoryURL(value.url):'';if(value.url&&!url)throw new Error('This private or sensitive browser URL cannot sync.');tab.url=url||'';const history=normalizeHistory(value.history);if(history&&history.entries[history.index].url===tab.url)tab.history=history; }
  else {if(!/^[a-f0-9]{64}$/.test(value.documentId||''))throw new Error('Choose a host-bound document ID.');tab.documentId=value.documentId;tab.mediaType=value.mediaType==='text/html'?'text/html':'text/markdown';tab.id='document:'+tab.documentId;}
  return tab;
}
export function workspaceContentScopes(session){
  const scopes=[];
  for(const parent of session?.tabs||[])if(parent.type==='run'){
    const tabs=[];for(const child of session.tabs.filter(tab=>tab.parentId===parent.id))try{
      if(child.type==='browser')tabs.push(contentTab({id:child.contentTabId||child.id,type:'browser',title:child.customTitle||child.label,customTitle:child.customTitle,url:child.url,history:child.history}));
      if(child.type==='markdown')tabs.push(contentTab({id:'document:x',type:'document',title:child.label,documentId:createHash('sha256').update(parent.id+'\0'+child.file).digest('hex')}));
    }catch{}scopes.push({scope:'chat',id:parent.id,tabs});
  }
  scopes.push({scope:'team',id:'team',tabs:(session?.team?.tabs||[]).filter(tab=>tab.type==='browser').flatMap(tab=>{try{return [contentTab({id:tab.contentTabId||tab.id,type:'browser',title:tab.customTitle||tab.title,customTitle:tab.customTitle,url:tab.url,history:tab.history})];}catch{return [];}})});
  return scopes;
}
/** Host-owned descriptors only. Selection, page state and document approval never enter this store. */
export class ContentTabs {
  constructor(home,{onChange=()=>{}}={}){this.file=path.join(home,'content-tabs.json');this.sourcesFile=path.join(home,'content-tab-sources.json');this.onChange=onChange;}
  read(){try{if(fs.statSync(this.file).size>2_000_000)throw new Error();const data=JSON.parse(fs.readFileSync(this.file,'utf8'));if(data.schemaVersion!==1||typeof data.scopes!=='object'||!data.scopes)throw new Error();if(Object.keys(data.scopes).length>1000)throw new Error();for(const [key,row]of Object.entries(data.scopes)){const [scope,...id]=key.split(':');this.key(scope,id.join(':'));if(!/^(chat|team):/.test(key)||!row||!Number.isSafeInteger(row.revision)||row.revision<0||!Array.isArray(row.tabs)||row.tabs.length>100||new Set(row.tabs.map(tab=>contentTab(tab).id)).size!==row.tabs.length)throw new Error();}return data;}catch(error){if(error.code==='ENOENT')return {schemaVersion:1,scopes:{}};throw new Error('Saved content tabs could not be read. The original file was preserved.');}}
  key(scope,id){if(!['chat','team'].includes(scope)||!ID.test(id||'')||scope==='team'&&id!=='team')throw new Error('Choose an explicit chat or Team tab scope.');return scope+':'+id;}
  get(scope,id){const key=this.key(scope,id),row=this.read().scopes[key];return {scope,id,revision:row?.revision||0,tabs:(row?.tabs||[]).map(contentTab)};}
  write(data){if(Object.keys(data.scopes).length>1000||Buffer.byteLength(JSON.stringify(data))>2_000_000)throw new Error('Content tab store exceeds its bounded limit.');fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(data)+'\n',{mode:0o600});fs.chmodSync(temp,0o600);fs.renameSync(temp,this.file);}finally{try{fs.unlinkSync(temp);}catch{}}}
  mutate({scope,id,expectedRevision,operations}){
    const key=this.key(scope,id),data=this.read(),current=data.scopes[key]||{revision:0,tabs:[]};
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==current.revision)throw new Error('Content tabs changed. Refresh before retrying this action.');
    if(!Array.isArray(operations)||operations.length>100)throw new Error('Choose at most 100 tab changes.');
    let tabs=current.tabs.map(contentTab);
    for(const op of operations){if(op.action==='open'){const tab=contentTab(op.tab);const existing=tabs.findIndex(item=>item.id===tab.id);if(existing<0)tabs.push(tab);else tabs[existing]=tab;}
      else if(op.action==='close')tabs=tabs.filter(tab=>tab.id!==op.id);
      else if(op.action==='rename'){const tab=tabs.find(tab=>tab.id===op.id);if(!tab)throw new Error('Tab is no longer open.');tab.title=title(op.title)||'New tab';tab.customTitle=tab.title;}
      else if(op.action==='reorder'){if(!Array.isArray(op.ids)||new Set(op.ids).size!==tabs.length||op.ids.length!==tabs.length||op.ids.some(id=>!tabs.some(tab=>tab.id===id)))throw new Error('Reorder must contain each current tab exactly once.');tabs=op.ids.map(id=>tabs.find(tab=>tab.id===id));}
      else throw new Error('Unknown tab change.');
    }
    if(tabs.length>100)throw new Error('At most 100 content tabs can be open in one scope.');
    if(JSON.stringify(tabs)===JSON.stringify(current.tabs))return {scope,id,revision:current.revision,tabs};
    if(current.revision>=Number.MAX_SAFE_INTEGER)throw new Error('Content tab revision limit reached.');const result={scope,id,revision:current.revision+1,tabs};data.scopes[key]={...current,revision:result.revision,tabs};this.write(data);this.onChange(result);return result;
  }
  documentSource(chatId,documentId){if(!this.get('chat',chatId).tabs.some(tab=>tab.documentId===documentId))throw new Error('This document tab is no longer open.');let records;try{if(fs.statSync(this.sourcesFile).size>2_000_000)throw new Error();records=JSON.parse(fs.readFileSync(this.sourcesFile,'utf8'));}catch{throw new Error('This chat document is not available on its host.');}const row=records[documentId];if(row?.chatId!==chatId||typeof row.file!=='string'||!path.isAbsolute(row.file))throw new Error('This document belongs to another chat or its source is unavailable.');return row.file;}
  rememberSources(session){
    let records={};try{if(fs.statSync(this.sourcesFile).size>2_000_000)throw new Error();records=JSON.parse(fs.readFileSync(this.sourcesFile,'utf8'));if(!records||typeof records!=='object'||Array.isArray(records))throw new Error();}catch(error){if(error.code!=='ENOENT')throw new Error('Saved document sources could not be read. The original file was preserved.');}
    for(const tab of session?.tabs||[])if(tab.type==='markdown'&&tab.parentId&&session.tabs.some(parent=>parent.type==='run'&&parent.id===tab.parentId)){const documentId=createHash('sha256').update(tab.parentId+'\0'+tab.file).digest('hex');records[documentId]={chatId:tab.parentId,file:tab.file};}
    if(Object.keys(records).length>1000)records=Object.fromEntries(Object.entries(records).slice(-1000));
    if(Buffer.byteLength(JSON.stringify(records))>2_000_000)throw new Error('Document source registry exceeds its bounded limit.');
    const temp=this.sourcesFile+'.tmp';fs.mkdirSync(path.dirname(this.sourcesFile),{recursive:true});try{fs.writeFileSync(temp,JSON.stringify(records)+'\n',{mode:0o600});fs.chmodSync(temp,0o600);fs.renameSync(temp,this.sourcesFile);}finally{try{fs.unlinkSync(temp);}catch{}}
  }
  seedWorkspace(session){this.rememberSources(session);for(const row of workspaceContentScopes(session))if(this.get(row.scope,row.id).revision===0&&row.tabs.length)this.mutate({...row,expectedRevision:0,operations:row.tabs.map(tab=>({action:'open',tab}))});}
  removeChat(id){const data=this.read(),key=this.key('chat',id);if(data.scopes[key]){delete data.scopes[key];this.write(data);}}
}
