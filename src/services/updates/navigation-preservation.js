import {createHash} from 'node:crypto';
import {windowContentTabId} from '../../../public/models/content-tab-descriptor.js';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const fields=(value,keys)=>Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));

// Private receipts retain identity and hashes, never prompts, paths, credentials
// or browser URLs. Full recovery snapshots and history acceptance remain separate.
export function captureNavigation(service){
 if(!service.contentTabs||!service.workspaceProjects||!service.context)return undefined;
 const context=service.context.config(),projects=service.workspaceProjects.read(),content=service.contentTabs.read();
 const workspaces=(context.workspaces||[]).map(row=>({id:row.id,hash:hash(fields(row,['name','folders','defaults','modes','favorites']))}));
 const projectRows=(projects.projects||[]).map(row=>({id:row.id,hash:hash(fields(row,['workspaceId','name']))}));
 const scopes=Object.entries(content.scopes).map(([id,row])=>({id,tabs:row.tabs.map(tab=>({id:tab.id,hash:hash(fields(tab,['type','chatId','terminalId','documentId','profileId','url','history','customTitle','hidden','persist']))})),closed:hash(row.closed||{})}));
 const windows=(service.navigationSessions?.()||[]).map(({id,session})=>{
  const tabs=session?.tabs||[],logical=new Map(tabs.map(tab=>[tab.id,windowContentTabId(tab)])),key=id=>logical.get(id)||id;
  return {id,hash:hash({tabs:tabs.map(tab=>[key(tab.id),tab.parentId?key(tab.parentId):null,!!tab.hidden,!!tab.navigationClosed]),active:key(session.active),selectedChildren:Object.fromEntries(Object.entries(session.selectedChildren||{}).map(([parent,child])=>[key(parent),key(child)])),drafts:session.chatDrafts||{}})};
 });
 return {schemaVersion:1,workspaces,projects:projectRows,projectDefaults:hash(projects.defaultProjectIds||{}),memberships:hash(projects.memberships||{}),scopes,windows};
}
export function verifyNavigation(before,after){
 if(!after||before.schemaVersion!==1)throw Error('Navigation preservation inventory is unavailable. Keep the recovery generation.');
 for(const key of ['workspaces','projects','windows'])for(const row of before[key])if(!after[key].some(current=>current.id===row.id&&current.hash===row.hash))throw Error('A saved '+key+' identity, assignment or state changed during upgrade. Keep the recovery generation for review.');
 if(before.projectDefaults!==after.projectDefaults||before.memberships!==after.memberships)throw Error('Project defaults or chat membership changed during upgrade. Keep the recovery generation for review.');
 for(const row of before.scopes){
  const current=after.scopes.find(scope=>scope.id===row.id),known=new Set(row.tabs.map(tab=>tab.id));
  if(!current||current.closed!==row.closed||JSON.stringify(current.tabs.filter(tab=>known.has(tab.id)))!==JSON.stringify(row.tabs))throw Error('Saved tab membership, order, descriptors or closed identities changed during upgrade. Keep the recovery generation for review.');
 }
 return {workspaces:before.workspaces.length,projects:before.projects.length,scopes:before.scopes.length,tabs:before.scopes.reduce((sum,row)=>sum+row.tabs.length,0),windows:before.windows.length};
}
