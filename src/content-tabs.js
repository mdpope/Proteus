import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {safeContentTabURL as safeHistoryURL,normalizeContentTabHistory as normalizeHistory,contentTabTitle as title,sameContentTabs,contentTabMetadata,mergeContentTabMetadata} from '../public/content-tab-descriptor.js';
const ID=/^[a-zA-Z0-9_:.\-]{1,256}$/;
export function contentTab(value){
  if(!value||!ID.test(value.id||'')||!['browser','document','chat','terminal'].includes(value.type))throw new Error('Choose a bounded browser or document tab.');
  const tab={id:value.id,type:value.type,title:title(value.title)||'New tab',...contentTabMetadata(value)};if(title(value.customTitle))tab.customTitle=title(value.customTitle);
  if(tab.type==='browser') { if(value.profileId&&value.profileId!=='default'){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.profileId))throw new Error('Invalid browser profile.');tab.profileId=value.profileId;} if(tab.id.startsWith('document:'))throw new Error('Document tab IDs are reserved for host documents.');const url=value.url?safeHistoryURL(value.url):'';if(value.url&&!url)throw new Error('This private or sensitive browser URL cannot sync.');tab.url=url||'';const history=normalizeHistory(value.history);if(history&&(!history.entries.length||history.entries[history.index]?.url===tab.url))tab.history=history; }
  else if(tab.type==='chat') { if(!ID.test(value.chatId||''))throw new Error('Choose a host-owned chat.');tab.chatId=value.chatId;tab.id='chat:'+value.chatId; }
  else if(tab.type==='terminal') { if(!ID.test(value.terminalId||''))throw new Error('Choose a bounded host-owned terminal descriptor.');tab.terminalId=value.terminalId;tab.id='terminal:'+tab.terminalId; }
  else {if(!/^[a-f0-9]{64}$/.test(value.documentId||''))throw new Error('Choose a host-bound document ID.');tab.documentId=value.documentId;if(value.chatId&&ID.test(value.chatId))tab.chatId=value.chatId;tab.mediaType=value.mediaType==='text/html'?'text/html':'text/markdown';tab.id='document:'+tab.documentId;}
  return tab;
}
export function workspaceContentScopes(session){
  const descriptor=(child,owner)=>{
    if(child.hostId)return null;
    const common={title:child.customTitle||child.label||child.title,...(child.customTitle?{customTitle:child.customTitle}:{}),...contentTabMetadata(child)};
    if(child.type==='browser'){
      // Preserve navigation identity even when its current URL cannot be shared.
      // Dropping the descriptor lets an authoritative partial registry close the
      // native local tab on the first synchronization.
      const url=child.privateLocal?'':safeHistoryURL(child.url)||'';
      return contentTab({id:child.contentTabId||child.id,type:'browser',profileId:child.profileId,...common,url,history:url?child.history:undefined,...(!url?{title:child.customTitle||'New tab'}:{})});
    }
    if(child.type==='markdown'){const documentId=child.contentTabId?.startsWith('document:')?child.contentTabId.slice(9):createHash('sha256').update(owner+'\0'+(child.file||child.markdown?.file)).digest('hex');return contentTab({id:'document:'+documentId,type:'document',documentId,...(child.associationChatId?{chatId:child.associationChatId}:{}),mediaType:/\.html?$/i.test(child.file||child.markdown?.file||'')?'text/html':'text/markdown',...common});}
    if(['run','workspace-chat'].includes(child.type))return contentTab({id:child.id,type:'chat',chatId:child.runId||child.chatId||child.id,...common});
    if(child.type==='terminal')return contentTab({id:child.id,type:'terminal',terminalId:child.terminal?.id||child.terminalId,...common});
    return null;
  };
  const make=(scope,id,children,owner)=>({scope,id,tabs:children.flatMap(child=>{try{const tab=descriptor(child,owner);return tab?[tab]:[];}catch{return [];}})});
  const scopes=[];
  for(const parent of session?.tabs||[])if(!parent.hostId&&['run','workspace'].includes(parent.type))scopes.push(make(parent.type==='workspace'?(parent.projectId?'project':'workspace'):'chat',parent.projectId||parent.workspaceId||parent.runId||parent.id,session.tabs.filter(child=>child.parentId===parent.id),parent.type==='workspace'?(parent.projectId?'project:'+parent.projectId:'workspace:'+parent.workspaceId):parent.runId||parent.id));
  scopes.push(make('main',session?.windowId&&session.windowId!=='main'?'window:'+session.windowId:'main',(session?.tabs||[]).filter(tab=>!tab.parentId&&!['workspace'].includes(tab.type)),'main'));
  scopes.push(make('team',session?.windowId&&session.windowId!=='main'?'window:'+session.windowId:'team',session?.team?.tabs||[],'team'));
  return scopes;
}
/** Host-owned descriptors only. Selection, page state and document approval never enter this store. */
export class ContentTabs {
  constructor(home,{onChange=()=>{},history}={}){this.file=path.join(home,'content-tabs.json');this.sourcesFile=path.join(home,'content-tab-sources.json');this.onChange=onChange;this.historyStore=history;this.asyncTail=Promise.resolve();}
  navigationKey(scope,id,tabId){this.key(scope,id);if(!ID.test(tabId||''))throw new Error('Choose an existing browser tab.');return `${scope}:${id}:${tabId}`;}
  async history({scope,id,tabId,...query}){const tab=this.get(scope,id).tabs.find(tab=>tab.id===tabId&&tab.type==='browser');if(!tab){const error=new Error('This browser tab is no longer open.');error.code='NAVIGATION_TAB_CLOSED';throw error;}return this.historyStore.navigationGet({...query,tabId:this.navigationKey(scope,id,tabId)});}
  async getAsync(scope,id){
    const result=this.get(scope,id);if(!this.historyStore)return result;
    const hydrated=[];for(let offset=0;offset<result.tabs.length;offset+=8)hydrated.push(...await Promise.all(result.tabs.slice(offset,offset+8).map(async tab=>{
      if(tab.type!=='browser')return tab;
      const tabId=this.navigationKey(scope,id,tab.id);
      await this.historyStore.navigation({action:'seed',tabId,profileId:tab.profileId||'default',history:tab.history,url:tab.url,title:tab.title});
      let navigation;try{navigation=await this.historyStore.navigationGet({tabId,limit:10000});}catch(error){if(error.code!=='HISTORY_PAGE_REQUIRED'&&!/requires paging/.test(error.message))throw error;navigation=await this.historyStore.navigationGet({tabId});}
      const history=navigation?.history?{...navigation.history,offset:navigation.offset,total:navigation.total,nextCursor:navigation.nextCursor,hasMore:navigation.hasMore}:undefined;
      const selected=history?.entries?.[history.index];return selected?{...tab,url:selected.url,title:tab.customTitle || selected.title || tab.title,history}:history?{...tab,history}:tab;
    })));result.tabs=hydrated;return result;
  }
  mutateAsync(value){
    const work=this.asyncTail.then(async()=>{
      if(!this.historyStore)return this.mutate(value);
      const {scope,id,operations}=value,current=await this.getAsync(scope,id);
      if(!Array.isArray(operations)||operations.length>100)throw new Error('Choose at most 100 tab changes.');
      const navigation=operations.filter(op=>/^browser-(navigate|traverse|redirect)$/.test(op.action));
      if(navigation.length){
        if(operations.length!==1)throw new Error('Send each browser navigation separately from other tab changes.');
        const op=navigation[0],tab=current.tabs.find(tab=>tab.id===op.tabId&&tab.type==='browser');
        if(!tab){const error=new Error('This browser tab is no longer open.');error.code='NAVIGATION_TAB_CLOSED';throw error;}
        // The navigation store validates its own revision and durable operation receipt.
        // Scope metadata revisions do not invalidate an otherwise current traversal.
        const navigationResult=await this.historyStore.navigation({...op,action:op.action.slice(8),tabId:this.navigationKey(scope,id,tab.id),visitTabId:tab.id,profileId:tab.profileId||'default'});
        const result=await this.getAsync(scope,id);if(!navigationResult.replayed)this.onChange(result);return result;
      }
      const safe=operations.map(op=>{
        if(op.action!=='open'||op.tab?.type!=='browser')return op;
        const prior=current.tabs.find(tab=>tab.id===op.tab.id);
        if(!prior)return op;
        if((op.tab.profileId||'default')!==(prior.profileId||'default'))throw new Error('Open a separate tab to change browser profiles.');
        // Metadata snapshots cannot clear or replace authoritative navigation.
        const metadata=this.get(scope,id).tabs.find(tab=>tab.id===op.tab.id);
        return {...op,tab:{...op.tab,url:metadata.url,history:metadata.history}};
      });
      this.mutate({...value,operations:safe});const result=await this.getAsync(scope,id);
      return result;
    });this.asyncTail=work.catch(()=>{});return work;
  }
  read(){try{if(fs.statSync(this.file).size>16_000_000)throw new Error();const data=JSON.parse(fs.readFileSync(this.file,'utf8'));if(data.schemaVersion!==1||typeof data.scopes!=='object'||!data.scopes)throw new Error();if(Object.keys(data.scopes).length>1000)throw new Error();for(const [key,row]of Object.entries(data.scopes)){const [scope,...id]=key.split(':');this.key(scope,id.join(':'));if(!/^(chat|team|workspace|project|main):/.test(key)||!row||!Number.isSafeInteger(row.revision)||row.revision<0||!Array.isArray(row.tabs)||row.tabs.length>1000||new Set(row.tabs.map(tab=>contentTab(tab).id)).size!==row.tabs.length)throw new Error();}return data;}catch(error){if(error.code==='ENOENT')return {schemaVersion:1,scopes:{}};throw new Error('Saved content tabs could not be read. The original file was preserved.');}}
  key(scope,id){if(!['chat','team','workspace','project','main'].includes(scope)||!ID.test(id||'')||(scope==='team'&&id!=='team'&&!/^window:[a-f0-9-]{36}$/i.test(id))||(scope==='main'&&id!=='main'&&!/^window:[a-f0-9-]{36}$/i.test(id)))throw new Error('Choose an explicit chat or Team tab scope.');return scope+':'+id;}
  get(scope,id){const key=this.key(scope,id),row=this.read().scopes[key];return {scope,id,revision:row?.revision||0,tabs:(row?.tabs||[]).map(contentTab)};}
  list({scope,id,type}={}){
    if(scope&&!['chat','workspace','project','main','team'].includes(scope))throw new Error('Choose a tab scope.');
    if(type&&!['browser','document','terminal','chat'].includes(type))throw new Error('Choose a tab type.');
    return Object.entries(this.read().scopes).flatMap(([key,row])=>{const [kind,...parts]=key.split(':'),owner=parts.join(':');return (!scope||kind===scope)&&(!id||owner===id)?row.tabs.map(contentTab).filter(tab=>!type||tab.type===type).map(tab=>({...tab,scope:kind,scopeId:owner,revision:row.revision})):[];});
  }
  moveAsync({scope,id,tabId,expectedRevision,destination,beforePublish}){
    const task=this.asyncTail.then(async()=>{
      const sourceKey=this.key(scope,id),targetKey=this.key(destination?.scope,destination?.id);
      if(sourceKey===targetKey)return this.getAsync(scope,id);
      const source=await this.getAsync(scope,id),tab=source.tabs.find(tab=>tab.id===tabId);
      if(!tab)throw new Error('Tab is no longer open.');
      const data=this.read(),sourceRow=data.scopes[sourceKey],target=data.scopes[targetKey]||{revision:0,tabs:[]};
      if(sourceRow.revision!==expectedRevision||target.revision!==destination.expectedRevision)throw new Error('Content tabs changed. Refresh before moving this tab.');
      if(target.tabs.length>=1000||target.tabs.some(item=>item.id===tab.id))throw new Error('Destination already contains this tab or is full.');
      sourceRow.tabs=sourceRow.tabs.filter(item=>item.id!==tab.id);sourceRow.revision++;
      target.tabs.push(tab);target.revision++;data.scopes[targetKey]=target;
      if(tab.type==='document')this.authorizeDocumentPlacement(tab.documentId,destination.scope,destination.id);
      // Copy the complete worker-owned stack, including Forward and paged entries.
      // If the descriptor write fails, the original remains authoritative and intact.
      if(tab.type==='browser'&&this.historyStore)await this.historyStore.relocateNavigation({source:this.navigationKey(scope,id,tab.id),target:this.navigationKey(destination.scope,destination.id,tab.id)});
      this.write(data);await beforePublish?.(tab);this.onChange(this.get(scope,id));this.onChange(this.get(destination.scope,destination.id));
      return {source:this.get(scope,id),destination:this.get(destination.scope,destination.id),tab};
    });this.asyncTail=task.catch(()=>{});return task;
  }
  write(data){if(Object.keys(data.scopes).length>1000||Buffer.byteLength(JSON.stringify(data))>16_000_000)throw new Error('Content tab store exceeds its bounded limit.');fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(data)+'\n',{mode:0o600});fs.chmodSync(temp,0o600);fs.renameSync(temp,this.file);}finally{try{fs.unlinkSync(temp);}catch{}}}
  mutate({scope,id,expectedRevision,operations}){
    const key=this.key(scope,id),data=this.read(),current=data.scopes[key]||{revision:0,tabs:[]};
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==current.revision)throw new Error('Content tabs changed. Refresh before retrying this action.');
    if(!Array.isArray(operations)||operations.length>100)throw new Error('Choose at most 100 tab changes.');
    let tabs=current.tabs.map(contentTab);
    for(const op of operations){if(op.action==='open'){const tab=contentTab(op.tab);if(tab.type==='chat'&&!['workspace','project','main'].includes(scope))throw new Error('Chats can appear in workspace or main navigation.');const existing=tabs.findIndex(item=>item.id===tab.id);if(existing<0)tabs.push(tab);else tabs[existing]=mergeContentTabMetadata(tabs[existing],tab);}
      else if(op.action==='close')tabs=tabs.filter(tab=>tab.id!==op.id);
      else if(op.action==='rename'){const tab=tabs.find(tab=>tab.id===op.id);if(!tab)throw new Error('Tab is no longer open.');tab.title=title(op.title)||'New tab';tab.customTitle=tab.title;}
      else if(op.action==='visibility'){const tab=tabs.find(tab=>tab.id===op.id);if(!tab||typeof op.hidden!=='boolean')throw new Error('Choose an open tab and visibility.');if(op.hidden)tab.hidden=true;else delete tab.hidden;}
      else if(op.action==='touch'){const tab=tabs.find(tab=>tab.id===op.id);if(!tab)throw new Error('Tab is no longer open.');tab.lastTouchedAt=new Date().toISOString();}
      else if(op.action==='persist'){const tab=tabs.find(tab=>tab.id===op.id);if(tab?.type!=='browser'||typeof op.enabled!=='boolean')throw new Error('Choose a browser persistence preference.');if(op.enabled)tab.persist=true;else delete tab.persist;}
      else if(op.action==='reorder'){if(!Array.isArray(op.ids)||new Set(op.ids).size!==tabs.length||op.ids.length!==tabs.length||op.ids.some(id=>!tabs.some(tab=>tab.id===id)))throw new Error('Reorder must contain each current tab exactly once.');tabs=op.ids.map(id=>tabs.find(tab=>tab.id===id));}
      else throw new Error('Unknown tab change.');
    }
    if(tabs.length>1000)throw new Error('At most 1000 content tabs can be open in one scope.');
    if(sameContentTabs(tabs,current.tabs))return {scope,id,revision:current.revision,tabs};
    if(current.revision>=Number.MAX_SAFE_INTEGER)throw new Error('Content tab revision limit reached.');const result={scope,id,revision:current.revision+1,tabs};data.scopes[key]={...current,revision:result.revision,tabs};this.write(data);this.onChange(result);return result;
  }
  documentSource(chatId,documentId,scope='chat'){if(!this.get(scope,chatId).tabs.some(tab=>tab.documentId===documentId)&&!(scope==='chat'&&this.list({type:'document'}).some(tab=>tab.documentId===documentId&&tab.chatId===chatId)))throw new Error('This document tab is no longer open.');let records;try{if(fs.statSync(this.sourcesFile).size>2_000_000)throw new Error();records=JSON.parse(fs.readFileSync(this.sourcesFile,'utf8'));}catch{throw new Error('This chat document is not available on its host.');}const row=records[documentId];const original=scope==='workspace'?row?.workspaceId===chatId:scope==='chat'?row?.chatId===chatId:row?.scope===scope&&row?.scopeId===chatId;const moved=row?.placements?.includes(this.key(scope,chatId));if((!original&&!moved)||typeof row?.file!=='string'||!path.isAbsolute(row.file))throw new Error('This document belongs to another chat or its source is unavailable.');return row.file;}
  authorizeDocumentPlacement(documentId,scope,id){const key=this.key(scope,id),records=JSON.parse(fs.readFileSync(this.sourcesFile,'utf8')),row=records[documentId];if(!row)throw new Error('This viewer source is unavailable.');row.placements=[...new Set([...(row.placements||[]),key])];const temp=this.sourcesFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(records)+'\n',{mode:0o600});fs.renameSync(temp,this.sourcesFile);}
  rememberSources(session){
    let records={};try{if(fs.statSync(this.sourcesFile).size>2_000_000)throw new Error();records=JSON.parse(fs.readFileSync(this.sourcesFile,'utf8'));if(!records||typeof records!=='object'||Array.isArray(records))throw new Error();}catch(error){if(error.code!=='ENOENT')throw new Error('Saved document sources could not be read. The original file was preserved.');}
    for(const tab of [...(session?.tabs||[]),...(session?.team?.tabs||[])])if(tab.type==='markdown'&&!tab.hostId){
      const parent=session?.tabs?.find(parent=>['run','workspace'].includes(parent.type)&&parent.id===tab.parentId);
      if(parent?.hostId||tab.parentId&&!parent)continue;
      const team=session?.team?.tabs?.includes(tab),owner=parent?(parent.type==='workspace'?(parent.projectId?'project:'+parent.projectId:'workspace:'+parent.workspaceId):parent.runId||parent.id):team?'team':'main';
      const file=tab.file||tab.markdown?.file;if(!file||!path.isAbsolute(file))continue;
      const documentId=tab.contentTabId?.startsWith('document:')?tab.contentTabId.slice(9):createHash('sha256').update(owner+'\0'+file).digest('hex');
      if(parent?.projectId&&records[documentId])records[documentId].placements=[...new Set([...(records[documentId].placements||[]),'project:'+parent.projectId])];
      if(!records[documentId])records[documentId]={...(parent?.projectId?{placements:['project:'+parent.projectId]}:{}),...(parent?(parent.type==='workspace'?(tab.associationChatId?{chatId:tab.associationChatId}:parent.projectId?{scope:'project',scopeId:parent.projectId}:{workspaceId:parent.workspaceId}):{chatId:parent.runId||parent.id}):{scope:owner,scopeId:owner}),file};
    }
    if(Object.keys(records).length>1000)throw new Error('Document source registry exceeds its bounded limit; the original registry was preserved.');
    if(Buffer.byteLength(JSON.stringify(records))>2_000_000)throw new Error('Document source registry exceeds its bounded limit.');
    const temp=this.sourcesFile+'.tmp';fs.mkdirSync(path.dirname(this.sourcesFile),{recursive:true});try{fs.writeFileSync(temp,JSON.stringify(records)+'\n',{mode:0o600});fs.chmodSync(temp,0o600);fs.renameSync(temp,this.sourcesFile);}finally{try{fs.unlinkSync(temp);}catch{}}
  }
  seedWorkspace(session){
    this.rememberSources(session);
    for(const row of workspaceContentScopes(session)){
      const key=this.key(row.scope,row.id),data=this.read(),saved=data.scopes[key];
      if(saved?.desktopSeedVersion===2)continue;
      // Older main/Team registries described browsers only. They cannot close
      // the saved chat, terminal and viewer surfaces newly included in sync.
      const introduced=row.scope==='main'?['chat','terminal','document']:row.scope==='team'?['terminal','document']:row.scope==='chat'?['terminal']:[];
      const tabs=(saved?.tabs||[]).map(contentTab),added=[];
      for(const tab of row.tabs){
        if(tab.type==='chat'&&!['main','workspace','project'].includes(row.scope))continue;
        if(tabs.some(existing=>existing.id===tab.id)||saved?.revision&& !introduced.includes(tab.type))continue;
        const index=row.tabs.indexOf(tab),preceding=row.tabs.slice(0,index).reverse().find(item=>tabs.some(existing=>existing.id===item.id));
        const following=row.tabs.slice(index+1).find(item=>tabs.some(existing=>existing.id===item.id));
        let at=preceding?tabs.findIndex(item=>item.id===preceding.id)+1:following?tabs.findIndex(item=>item.id===following.id):tabs.length;
        if(added.length)at=Math.max(at,tabs.findIndex(item=>item.id===added.at(-1))+1);
        tabs.splice(at,0,tab);added.push(tab.id);
      }
      if(!saved&&!tabs.length)continue;
      if(tabs.length>1000)throw new Error('The restored navigation exceeds the content-tab limit; the original registry was preserved.');
      const changed=!sameContentTabs(tabs,(saved?.tabs||[]).map(contentTab));
      const revision=(saved?.revision||0)+(changed?1:0);
      if(!Number.isSafeInteger(revision))throw new Error('Content tab revision limit reached.');
      data.scopes[key]={...saved,revision,tabs,desktopSeedVersion:2};this.write(data);
      if(changed)this.onChange({scope:row.scope,id:row.id,revision,tabs});
    }
  }
  rehouseChat(chatId,membership,name,options={}){return this.rehouseChats([{chatId,...membership,name}],options);}
  rehouseChats(changes,{preserveMain=false}={}){
    const data=this.read(),changed=new Set();
    // Commit the ordered migration once. A crash or a validation failure must not
    // leave a partially appended project that changes the next attempt's order.
    for(const {chatId,workspaceId,projectId,name} of changes){
      const targetKey=this.key(projectId?'project':workspaceId?'workspace':'main',projectId||workspaceId||'main');
      const placements=Object.entries(data.scopes).filter(([key,row])=>((!preserveMain&&key==='main:main')||key.startsWith('workspace:')||key.startsWith('project:'))&&row.tabs.some(tab=>tab.type==='chat'&&tab.chatId===chatId));
      if(!placements.length)continue; // Moving a closed chat does not reopen its view.
      const target=data.scopes[targetKey]||{revision:0,tabs:[]},existing=target.tabs.find(tab=>tab.type==='chat'&&tab.chatId===chatId);
      const source=existing||placements[0][1].tabs.find(tab=>tab.type==='chat'&&tab.chatId===chatId);
      const descriptor={...source,title:source.customTitle||name||source.title};
      const tabs=target.tabs.filter(tab=>!(tab.type==='chat'&&tab.chatId===chatId));
      if(tabs.length>=1000)throw new Error('The destination workspace has too many tabs.');
      tabs.splice(existing?target.tabs.indexOf(existing):tabs.length,0,descriptor);
      for(const [key,row]of placements)if(key!==targetKey){row.tabs=row.tabs.filter(tab=>!(tab.type==='chat'&&tab.chatId===chatId));if(!Number.isSafeInteger(++row.revision))throw new Error('Content tab revision limit reached.');changed.add(key);}
      if(!sameContentTabs(target.tabs,tabs)){target.tabs=tabs;if(!Number.isSafeInteger(++target.revision))throw new Error('Content tab revision limit reached.');data.scopes[targetKey]=target;changed.add(targetKey);}
    }
    if(changed.size){this.write(data);for(const key of changed){const [scope,...id]=key.split(':');this.onChange(this.get(scope,id.join(':')));}}
  }
  clearScopes(scopes){const data=this.read();for(const {scope,id}of scopes){const key=this.key(scope,id),row=data.scopes[key]||{revision:0,tabs:[]};row.tabs=[];row.revision++;data.scopes[key]=row;}this.write(data);for(const {scope,id}of scopes)this.onChange(this.get(scope,id));}
  removeChat(id){const data=this.read(),key=this.key('chat',id);if(data.scopes[key]){delete data.scopes[key];this.write(data);}}
}
