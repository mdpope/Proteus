import {atomicRename} from '../../shared/atomic-rename.cjs';
import {hostRunningChatCount} from '../../../public/services/remote/computer-identity.js';
import { readHostPlatformMetadata } from '../../shared/host-platform.js';
import { requireProtectedStorage } from '../integrations/credential-storage.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { BrowserRemoteClient, parsePairing, pairingRelayOrigin, importKey } from './remote-client.js';
const recordsFrom=records=>[...records.values()].filter(record=>!record.paused);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const methods=new Set(['inference.catalog','inference.trim','inference.start','inference.poll','inference.cancel','attention.snapshot','attention.clear','updates.releases','computer.access.get','computer.access.update','integrations.list','projects.get','projects.update','sources.get','sources.update','chat.move','context.update','workspace.delete','tabs.manage',"chat.paths","chat.export","chat.previews.list","chat.previews.read","chat.documents.asset",'browser.live.list','browser.live.frame','browser.live.instruct','tabs.follow','tabs.get','tabs.mutate','tabs.history','browser.history.suggest','browser.history.query','browser.history.record','browser.history.delete','browser.history.settings','browser.history.sync','browser.history.status','sync','runs.page','runs.list','chat.get','chat.watch','chat.review','chat.archive','chat.delete','chat.rename','chat.promote','chat.documents.request','chat.documents.status','chat.documents.read','chat.image','chat.start','chat.attachments.begin','chat.attachments.chunk','chat.attachments.finish','chat.attachments.authorize','chat.reply','chat.resume','chat.recover','chat.cancel','chat.send','chat.steer-queued','chat.edit-queued','chat.remove-queued','context.refresh','context.get','context.preview','provider.status','provider.usage','schedule.run','schedule.save','schedule.preview','chat.permissions','chat.context','mcp.status','mcp.login','context.mode','context.favorite','context.addFolders','notifications.list','notifications.read','notifications.open','logs.list','logs.get','resources.list','resources.action']);
function valid(record) {
  pairingRelayOrigin(record.relay,{allowLocalNetwork:true});
  if(!uuid.test(record.hostId)||!uuid.test(record.deviceId)||!/^[a-f0-9]{64}$/i.test(record.key))throw new Error('Invalid protected desktop pairing.');
  return {hostId:record.hostId,relay:record.relay,deviceId:record.deviceId,key:record.key,label:String(record.label||'Paired computer').slice(0,80),pairedAt:String(record.pairedAt||'').slice(0,64),paused:record.paused===true};
}
// A peer is a separately authorized device. Host registration tokens are never used here.
export class DesktopPeers extends EventEmitter {
  constructor(home,{safeStorage,localHostId,clientFactory,deviceName='Proteus on '+os.hostname(),retryBaseMs=1000,retryMaxMs=30000,heartbeatMs=30000,random=Math.random,diagnostics,browserHistory,accessPolicy}={}) {
    super();this.browserHistory=browserHistory;this.historyPending=new Map();this.diagnostics=diagnostics;this.retryBaseMs=retryBaseMs;this.retryMaxMs=retryMaxMs;this.heartbeatMs=heartbeatMs;this.random=random;this.recovery=new Map();this.file=path.join(home,'desktop-peers.enc');this.safeStorage=safeStorage;this.localHostId=localHostId;this.deviceName=deviceName;this.clientFactory=clientFactory||((host,options)=>new BrowserRemoteClient(host,{...options,socketFactory:url=>new WebSocket(url,{maxPayload:8_000_000,handshakeTimeout:8000})}));this.cacheFile=path.join(home,'desktop-chat-index.enc');this.cache=new Map();this.lifecycleOverrides=new Map();this.membershipOverrides=new Map();this.reviewOverrides=new Map();this.indexPending=null;this.indexAt=0;this.records=new Map();this.sessions=new Map();this.loaded=false;this.closed=false;this.pairing=new Map();this.accessPolicy=accessPolicy;this.accessGeneration=0;this.accessListener=()=>this.accessChanged();accessPolicy?.on('change',this.accessListener);
  }
  blocked(){return this.accessPolicy?.get().managed===true;}
  assertOutgoing(generation){this.accessPolicy?.assertOutgoing();if(generation!==undefined&&generation!==this.accessGeneration)throw Error('Computer access changed during this request. Refresh before continuing.');}
  accessChanged(){
    this.accessGeneration++;this.indexAt=0;this.lastIndex=null;
    if(!this.blocked()){this.emitState('',{indexChanged:true});return;}
    const ids=new Set([...this.records.keys(),...this.sessions.keys(),...this.pairing.keys()]);
    for(const id of this.recovery.keys())this.cancelRecovery(id);
    for(const session of this.sessions.values())session.client.close();
    for(const client of this.pairing.values())client.close();
    this.sessions.clear();this.pairing.clear();this.cache.clear();
    for(const hostId of ids)this.emitState(hostId,{paused:true,policyBlocked:true,status:'disconnected'});
    this.emitState('',{indexChanged:true,policyBlocked:true});
  }
  timedSync(name,fn){return this.diagnostics?this.diagnostics.measureSync(name,fn):fn();}
  timed(name,fn){return this.diagnostics?this.diagnostics.measure(name,fn):fn();}
  protectedStorage(){requireProtectedStorage(this.safeStorage,'manage desktop pairings');}
  load(){
    if(this.loaded)return;
    let stat;
    try{stat=fs.lstatSync(this.file);}catch(error){
      // An unpaired computer has nothing to decrypt. Do not consult the credential store or an orphan cache.
      if(error.code==='ENOENT'){this.loaded=true;return;}
      throw new Error('Protected desktop pairings could not be read. The original file was preserved.');
    }
    this.protectedStorage();
    try{
      if(!stat.isFile()||stat.size>200_000)throw new Error('Invalid pairing store');
      const rows=JSON.parse(this.safeStorage.decryptString(fs.readFileSync(this.file)));
      if(!Array.isArray(rows)||rows.length>32)throw new Error('Invalid pairing store');
      const records=new Map();
      for(const row of rows){const record=valid(row);if(records.has(record.hostId))throw new Error('Duplicate pairing');records.set(record.hostId,record);}
      // Publish only a completely validated store; failed retries cannot retain partial authority.
      this.records=records;
    }catch{throw new Error('Protected desktop pairings could not be read. The original file was preserved.');}
    if(this.records.size)try{if(fs.statSync(this.cacheFile).size<4000000){const cached=JSON.parse(this.safeStorage.decryptString(fs.readFileSync(this.cacheFile)));for(const [id,row]of Object.entries(cached))if(this.records.has(id)&&Array.isArray(row.items))this.cache.set(id,{...row,items:row.items.map(item=>({...item,destinationName:this.records.get(id).label}))});}}catch{}
    this.loaded=true;
  }
  save(){this.protectedStorage();const temp=this.file+'.tmp';fs.mkdirSync(path.dirname(this.file),{recursive:true});try{fs.writeFileSync(temp,this.safeStorage.encryptString(JSON.stringify([...this.records.values()])),{mode:0o600});fs.chmodSync(temp,0o600);atomicRename(temp,this.file);}finally{try{fs.unlinkSync(temp);}catch{}}}
  list(){if(this.blocked())return [];this.load();return [...this.records.values()].map(({hostId,label,pairedAt,paused})=>({hostId,label,pairedAt,paused,...readHostPlatformMetadata(this.sessions.get(hostId)?.metadata),status:paused?'paused':this.sessions.get(hostId)?.ready&&this.sessions.get(hostId)?.client.status==='online'?'online':this.recovery.get(hostId)?.blocked?'needs-action':(this.recovery.get(hostId)?.timer||this.sessions.get(hostId)?.connecting)?'reconnecting':'offline',unread:this.sessions.get(hostId)?.unread||false}));}
  adoptHostState(hostId,session,state){
    if(this.blocked()||this.closed||this.sessions.get(hostId)!==session||session.client.status!=='online'||!this.records.has(hostId))return;
    session.metadata=readHostPlatformMetadata(state);
    this.adoptHostName(hostId,session,state?.hostName);
  }
  adoptHostName(hostId,session,name){
    if(this.blocked()||this.closed||this.sessions.get(hostId)!==session||session.client.status!=='online'||typeof name!=='string')return;
    const label=name.trim(),record=this.records.get(hostId);
    if(!record||!label||label.length>80||/[\x00-\x1f\x7f]/.test(label)||record.label===label)return;
    const previous=record.label;record.label=label;
    try{this.save();}catch{record.label=previous;this.emitState(hostId,{metadataError:'The computer name could not be saved. Existing connection settings were preserved.'});return;}
    session.client.host.label=label;
    const cached=this.cache.get(hostId);if(cached)cached.items=cached.items.map(item=>({...item,destinationName:label}));
    this.lastIndex=null;this.indexAt=0;this.emitState(hostId,{renamed:true,label});
  }
  emitState(hostId,extra={}){if(!this.closed)this.emit('event',{hostId,...extra});}
  async pair(code,label){this.assertOutgoing();const accessGeneration=this.accessGeneration;this.load();if(this.closed)throw new Error('Desktop connections are closing.');const capsule=parsePairing(code,{allowLocalNetwork:true});if(capsule.hostId===this.localHostId)throw new Error('This computer is already the local destination.');if(this.records.has(capsule.hostId)||this.pairing.has(capsule.hostId))throw new Error('This computer is already paired or pairing.');if(this.records.size+this.pairing.size>=32)throw new Error('Remove a paired computer before adding another.');this.protectedStorage();let saved;
    const client=this.clientFactory({hostId:capsule.hostId,relay:capsule.relay,inviteKey:capsule.key,label:String(capsule.label||label||'Paired computer').trim().slice(0,80)||'Paired computer'},{name:this.deviceName,onCredential:async record=>{this.assertOutgoing(accessGeneration);if(this.closed)throw new Error('Desktop connections are closing.');saved=valid(record);this.records.set(saved.hostId,saved);try{this.save();}catch(error){this.records.delete(saved.hostId);throw error;}}});this.pairing.set(capsule.hostId,client);
    try{await client.connect();this.assertOutgoing(accessGeneration);return this.list();}finally{client.close();this.pairing.delete(capsule.hostId);this.emitState(capsule.hostId,{status:'offline'});}
  }
  recoveryFor(hostId){let state=this.recovery.get(hostId);if(!state){state={attempt:0,timer:null,heartbeat:null,suspended:false,blocked:false};this.recovery.set(hostId,state);}return state;}
  cancelRecovery(hostId){const state=this.recovery.get(hostId);if(state){clearTimeout(state.timer);clearTimeout(state.heartbeat);state.timer=null;state.heartbeat=null;}}
  scheduleRecovery(hostId,session){
    if(this.blocked()||this.closed||!this.records.has(hostId)||this.sessions.get(hostId)!==session)return;
    const state=this.recoveryFor(hostId);clearTimeout(state.heartbeat);state.heartbeat=null;
    if(state.suspended||state.blocked||state.timer)return;
    const delay=Math.min(this.retryMaxMs,this.retryBaseMs*2**Math.min(state.attempt++,8))*(0.75+this.random()*0.5);
    state.timer=setTimeout(()=>{state.timer=null;void this.connect(hostId,{automatic:true}).catch(()=>{});},delay);state.timer.unref?.();
    this.indexAt=0;this.lastIndex=null;this.emitState(hostId,{status:'reconnecting',retryAt:new Date(Date.now()+delay).toISOString()});
  }
  heartbeat(hostId,session){
    const state=this.recoveryFor(hostId);clearTimeout(state.heartbeat);
    if(this.blocked()||!this.heartbeatMs||this.closed||state.suspended||state.blocked)return;
    state.heartbeat=setTimeout(async()=>{if(this.sessions.get(hostId)!==session)return;try{await this.timed('peer.heartbeat',()=>this.request(hostId,'sync',{}, {timeoutMs:15000}));if(this.sessions.get(hostId)===session){void this.syncHistory(hostId).catch(()=>{});this.heartbeat(hostId,session);}}catch{if(this.sessions.get(hostId)===session){session.ready=false;session.client.close();this.scheduleRecovery(hostId,session);}}},this.heartbeatMs);state.heartbeat.unref?.();
  }
  resumeConnections(){if(this.blocked())return;for(const [hostId,state]of this.recovery){if(state.suspended||state.blocked)continue;this.cancelRecovery(hostId);const session=this.sessions.get(hostId);if(session?.ready&&session.client.status==='online'){void this.request(hostId,'sync',{}, {timeoutMs:8000}).then(()=>this.heartbeat(hostId,session)).catch(()=>{if(this.sessions.get(hostId)===session){session.ready=false;session.client.close();this.scheduleRecovery(hostId,session);}});}else void this.connect(hostId,{automatic:true}).catch(()=>{});}}
  async connect(hostId,{automatic=false}={}){
    this.assertOutgoing();const accessGeneration=this.accessGeneration;this.load();if(this.closed)throw new Error('Desktop connections are closing.');const record=this.records.get(hostId);if(!record)throw new Error('Pair this computer first.');
    if(record.paused)throw new Error('This connection is paused on this computer. Choose Resume in computer Connections.');
    const recovery=this.recoveryFor(hostId);
    if(automatic&&(recovery.suspended||recovery.blocked))throw new Error(recovery.blocked?'Review this computer’s authentication in Connections.':'This computer was disconnected. Choose Connect to resume.');
    if(automatic&&recovery.timer)throw new Error('Reconnecting to this computer automatically.');
    if(!automatic){recovery.suspended=false;recovery.blocked=false;}
    let session=this.sessions.get(hostId);if(session?.connecting)return session.connecting;if(session?.ready&&session.client.status==='online')return {hostId,status:'online'};
    this.cancelRecovery(hostId);const previous=session;session={client:null,unread:previous?.unread||false,ready:false};this.sessions.set(hostId,session);previous?.client?.close();
    const client=session.client=this.clientFactory({...record,key:null},{name:this.deviceName});
    client.addEventListener('status',event=>{if(this.sessions.get(hostId)!==session)return;if(event.detail==='offline'){session.ready=false;this.scheduleRecovery(hostId,session);}else if(event.detail!=='online')this.emitState(hostId,{status:event.detail});});
    client.addEventListener('recovery-blocked',()=>{if(this.sessions.get(hostId)!==session)return;recovery.blocked=true;this.cancelRecovery(hostId);this.emitState(hostId,{status:'needs-action'});});
    client.addEventListener('change',event=>{if(this.sessions.get(hostId)!==session)return;const value=event.detail;if(value.event==='browser.history.changed')void this.syncHistory(hostId).catch(()=>{});if(value.event==='chat.lifecycle'&&value.data?.id)this.reconcileChat(hostId,value.data);if(value.event==='run'||value.event==='run.changed')session.unread=true;if(value.event==='state'){this.adoptHostState(hostId,session,value.data);this.reconcileProjects(hostId,value.data?.workspaceProjects);session.runningChatCount=hostRunningChatCount(value.data);this.indexAt=0;this.lastIndex=null;const signature=JSON.stringify(value.data?.runs||[]);if(session.runsSignature&&signature!==session.runsSignature)session.unread=true;session.runsSignature=signature;}this.emitState(hostId,{changed:value.event!=='project-follow',unread:session.unread,event:value.event,runId:value.runId,...(['project-follow','tabs'].includes(value.event)?{data:value.data}:{})});});
    client.addEventListener('revoked',event=>{if(!event.detail?.authenticated||this.sessions.get(hostId)!==session)return;this.cancelRecovery(hostId);this.recovery.delete(hostId);this.records.delete(hostId);this.cache.delete(hostId);this.lastIndex=null;this.indexAt=0;try{this.save();this.saveCache();}catch{}this.sessions.delete(hostId);this.emitState(hostId,{revoked:true,status:'offline'});});
    session.connecting=(async()=>{try{client.host.key=await importKey(record.key);if(this.closed||this.sessions.get(hostId)!==session||!this.records.has(hostId))throw new Error('Desktop connection changed.');await client.connect();this.assertOutgoing(accessGeneration);const snapshot=await client.request('sync',{});this.assertOutgoing(accessGeneration);if(this.closed||this.sessions.get(hostId)!==session||!this.records.has(hostId))throw new Error('Desktop connection changed.');this.adoptHostState(hostId,session,snapshot.state);this.reconcileProjects(hostId,snapshot.state?.workspaceProjects);session.runningChatCount=hostRunningChatCount(snapshot.state);session.runsSignature=JSON.stringify(snapshot.state?.runs||[]);session.ready=true;recovery.attempt=0;this.cancelRecovery(hostId);this.heartbeat(hostId,session);this.indexAt=0;this.lastIndex=null;this.emitState(hostId,{status:'online',recovered:true,changed:true});void this.syncHistory(hostId).catch(()=>{});return {hostId,status:'online'};}catch(error){if(this.sessions.get(hostId)===session){session.ready=false;client.close();this.scheduleRecovery(hostId,session);}throw error;}finally{session.connecting=null;}})();return session.connecting;
  }
  async request(hostId,method,args={},options={}){this.assertOutgoing();const accessGeneration=this.accessGeneration;if(!methods.has(method))throw new Error('Unsupported desktop peer command.');if(JSON.stringify(args).length>1_000_000)throw new Error('Remote request is too large.');this.load();const session=this.sessions.get(hostId);if(this.records.get(hostId)?.paused)throw new Error('This connection is paused on this computer. Choose Resume in computer Connections.');if(!this.records.has(hostId))throw new Error('This computer is not paired. Open Connections to pair it.');if(!session?.ready||session?.client?.status!=='online'){const recovery=this.recoveryFor(hostId);if(recovery.suspended)throw new Error('This computer was disconnected. Choose Connect in Connections to resume.');if(recovery.blocked)throw new Error('Review this computer’s authentication in Connections.');if(!session?.connecting&&!recovery.timer)void this.connect(hostId,{automatic:true}).catch(()=>{});throw new Error('Reconnecting to this computer automatically. This request was not sent; try again when connected.');}const result=await session.client.request(method,args,options);this.assertOutgoing(accessGeneration);if(this.sessions.get(hostId)!==session||!this.records.has(hostId))throw new Error('The selected computer connection changed. Refresh before continuing.');if(method==='chat.move'&&result?.memberships)this.reconcileProjects(hostId,result);else if(method==='chat.review'||method==='chat.move')this.reconcileChat(hostId,result);if(['projects.get','projects.update','sources.get','sources.update'].includes(method))this.reconcileProjects(hostId,result);if(method==='sync'){this.adoptHostState(hostId,session,result.state);this.reconcileProjects(hostId,result.state?.workspaceProjects);session.runningChatCount=hostRunningChatCount(result.state);session.runsSignature=JSON.stringify(result.state?.runs||[]);}return result;}
  async syncHistory(hostId) {
    if(this.blocked()||!this.browserHistory)return {supported:false};
    const accessGeneration=this.accessGeneration;
    this.load();const settings=await this.browserHistory.settings();this.assertOutgoing(accessGeneration);
    const configured=settings.peers.filter(peer=>peer.enabled && (!hostId || peer.hostId===hostId));
    const results=[];
    for(const peer of configured){
      if(this.blocked() || this.closed || !this.records.has(peer.hostId) || this.records.get(peer.hostId).paused)continue;
      if(this.historyPending.has(peer.hostId)){results.push(await this.historyPending.get(peer.hostId));continue;}
      const task=(async()=>{
        const signature=JSON.stringify([peer.profileIds.slice().sort(),peer.backfill]),from=peer.backfill==='all'?undefined:new Date(Date.now()-Number(peer.backfill)*86400000).toISOString();
        let cursor=peer.signature===signature?peer.cursor:null,pages=0,inserted=0;
        try {
          // A bounded round avoids monopolizing the connection. The durable cursor resumes
          // the next heartbeat; every page and its acknowledgement commit together.
          while(pages++<20){
            const page=await this.request(peer.hostId,'browser.history.sync',{cursor,limit:200,profileIds:peer.profileIds,from});
            if(page.rebootstrap){cursor=null;continue;}
            if(this.blocked() || this.closed || !this.records.has(peer.hostId) || this.records.get(peer.hostId).paused)throw new Error('History connection changed.');
            const current=await this.browserHistory.settings(),authorized=current.peers.find(row=>row.hostId===peer.hostId && row.enabled);
            this.assertOutgoing(accessGeneration);
            if(!authorized || JSON.stringify([authorized.profileIds.slice().sort(),authorized.backfill])!==signature)throw new Error('History sharing settings changed.');
            if((page.events || []).some(event=>!peer.profileIds.includes(event.profileId)) || (page.tombstones || []).some(event=>!peer.profileIds.includes(event.profileId)))throw new Error('History peer returned an unselected profile.');
            const result=await this.browserHistory.apply({events:page.events,tombstones:page.tombstones,peerHostId:peer.hostId,cursor:page.cursor,signature});inserted+=result.inserted;cursor=page.cursor;
            if(!page.hasMore)break;
          }
          this.emitState(peer.hostId,{historyChanged:true});return {hostId:peer.hostId,inserted,pages:pages-1};
        }catch(error){await this.browserHistory.peerError({hostId:peer.hostId,error:error.message});return {hostId:peer.hostId,error:error.message};}
      })().finally(()=>this.historyPending.delete(peer.hostId));this.historyPending.set(peer.hostId,task);results.push(await task);
    }
    return {supported:true,results};
  }
  saveCache(){this.protectedStorage();const temp=this.cacheFile+'.tmp';try{const serialized=this.timedSync('peer.cache.serialize',()=>JSON.stringify(Object.fromEntries(this.cache)));const encrypted=this.timedSync('peer.cache.encrypt',()=>this.safeStorage.encryptString(serialized));this.timedSync('peer.cache.disk',()=>{fs.writeFileSync(temp,encrypted,{mode:0o600});fs.chmodSync(temp,0o600);atomicRename(temp,this.cacheFile);});}finally{try{fs.unlinkSync(temp);}catch{}}}
  async index(){if(this.blocked())return {items:[],hosts:[],partial:false,managed:true};const accessGeneration=this.accessGeneration;this.load();if(!this.records.size)return {items:[],hosts:[],partial:false};if(this.indexPending)return this.lastIndex||{items:recordsFrom(this.records).flatMap(r=>this.cache.get(r.hostId)?.items||[]),hosts:recordsFrom(this.records).map(r=>({id:r.hostId,name:r.label,...readHostPlatformMetadata(this.sessions.get(r.hostId)?.metadata),runningChatCount:this.sessions.get(r.hostId)?.runningChatCount,online:this.sessions.get(r.hostId)?.client?.status==='online',lastSyncAt:this.cache.get(r.hostId)?.lastSyncAt||null,loading:true})),partial:true};if(Date.now()-this.indexAt<5000&&this.lastIndex)return this.lastIndex;this.indexPending=(async()=>{const records=recordsFrom(this.records).slice(0,32);const hosts=[];for(let i=0;i<records.length;i+=4)await Promise.all(records.slice(i,i+4).map(async record=>{let error;try{await this.connect(record.hostId,{automatic:true});const rows=[];for(let offset=0;offset<100000;offset+=100){const page=await this.request(record.hostId,'runs.list',{offset,includeArchived:true});rows.push(...page.slice(0,100));if(page.length!==100)break;if(offset===99900)throw new Error('Chat inventory exceeds the complete index budget.');}const items=rows.filter(r=>!this.lifecycleOverrides.get(record.hostId+':'+r.id)?.deleted).map(r=>this.membershipStatus(record.hostId,this.reviewStatus(record.hostId,r))).map(r=>({id:r.id,chatId:r.id,hostId:record.hostId,local:false,title:String(r.title||'Chat').slice(0,200),titleRevision:r.titleRevision||null,provider:r.provider||'',status:r.status,createdAt:r.createdAt,updatedAt:r.updatedAt,lastActivityAt:r.lastActivityAt,archivedAt:(this.lifecycleOverrides.has(record.hostId+':'+r.id)?this.lifecycleOverrides.get(record.hostId+':'+r.id).archivedAt:r.archivedAt)||null,archived:!!(this.lifecycleOverrides.has(record.hostId+':'+r.id)?this.lifecycleOverrides.get(record.hostId+':'+r.id).archivedAt:r.archivedAt),attentionRequired:r.attentionRequired&&!((this.lifecycleOverrides.has(record.hostId+':'+r.id)?this.lifecycleOverrides.get(record.hostId+':'+r.id).archivedAt:r.archivedAt)),failureEventAt:r.failureEventAt||null,failureReviewedAt:r.failureReviewedAt||null,workspaceId:r.workspaceId||null,workspaceName:r.workspaceName||'',projectId:r.projectId||null,projectName:r.projectName||'',scheduleName:r.scheduleName||'',destinationName:record.label}));if(!this.blocked()&&accessGeneration===this.accessGeneration&&!this.closed&&this.records.has(record.hostId))this.cache.set(record.hostId,{items,lastSyncAt:new Date().toISOString()});}catch{error='This computer is offline or its connection needs attention.';}hosts.push({id:record.hostId,name:record.label,...readHostPlatformMetadata(this.sessions.get(record.hostId)?.metadata),online:!error,runningChatCount:error?0:this.sessions.get(record.hostId)?.runningChatCount,lastSyncAt:this.cache.get(record.hostId)?.lastSyncAt||null,...(error?{error}:{})});}));if(this.blocked()||accessGeneration!==this.accessGeneration)return {items:[],hosts:[],partial:false,managed:this.blocked()};if(!this.closed&&this.records.size)this.saveCache();this.indexAt=Date.now();const currentHosts=hosts.filter(h=>this.records.has(h.id)&&!this.records.get(h.id).paused);return this.lastIndex={items:records.filter(r=>this.records.has(r.hostId)&&!this.records.get(r.hostId).paused).flatMap(r=>this.cache.get(r.hostId)?.items||[]),hosts:currentHosts,partial:currentHosts.some(h=>!h.online)};})();void this.indexPending.then(()=>this.emitState('',{indexChanged:true})).catch(()=>{}).finally(()=>{this.indexPending=null;});return this.lastIndex||{items:recordsFrom(this.records).flatMap(r=>this.cache.get(r.hostId)?.items||[]),hosts:recordsFrom(this.records).map(r=>({id:r.hostId,name:r.label,...readHostPlatformMetadata(this.sessions.get(r.hostId)?.metadata),runningChatCount:this.sessions.get(r.hostId)?.runningChatCount,online:this.sessions.get(r.hostId)?.client?.status==='online',lastSyncAt:this.cache.get(r.hostId)?.lastSyncAt||null,loading:true})),partial:true};}
  reviewStatus(hostId,row){const key=hostId+':'+row.id,reviewed=this.reviewOverrides.get(key);if(!reviewed)return row;if(!['failed','interrupted'].includes(row.status)||row.failureEventAt&&reviewed.failureEventAt&&row.failureEventAt!==reviewed.failureEventAt&&Date.parse(row.failureEventAt)>Date.parse(reviewed.failureEventAt)){this.reviewOverrides.delete(key);return row;}return {...row,failureReviewedAt:reviewed.failureReviewedAt,attentionRequired:false};}
  reconcileProjects(hostId,catalog){
    if(!catalog?.memberships||!Array.isArray(catalog.projects)||!this.records.has(hostId))return;
    const fields=['workspaceId','workspaceName','projectId','projectName'];
    for(const [id,member]of Object.entries(catalog.memberships)){
      if(!member||!fields.every(key=>Object.hasOwn(member,key)))continue;
      this.membershipOverrides.set(hostId+':'+id,Object.fromEntries(fields.map(key=>[key,member[key]])));
    }
    const cached=this.cache.get(hostId);let changed=false;
    if(cached){cached.items=cached.items.map(item=>{const member=this.membershipOverrides.get(hostId+':'+(item.chatId||item.id));if(!member||fields.every(key=>item[key]===member[key]))return item;changed=true;return {...item,...member};});if(changed)try{this.saveCache();}catch{this.emitState(hostId,{metadataError:'Project membership could not be cached securely. Reconnect to refresh it.'});}}
    this.lastIndex=null;this.indexAt=0;if(changed)this.emitState(hostId,{indexChanged:true});
  }
  membershipStatus(hostId,row){const key=hostId+':'+(row.id||row.chatId),moved=this.membershipOverrides.get(key);if(!moved)return row;const fields=Object.hasOwn(moved,'projectId')?['workspaceId','workspaceName','projectId','projectName']:['workspaceId'];if(fields.every(name=>row[name]===moved[name])||moved.updatedAt&&Date.parse(row.updatedAt)>Date.parse(moved.updatedAt)){this.membershipOverrides.delete(key);return row;}return {...row,...Object.fromEntries(['workspaceId','workspaceName','projectId','projectName','updatedAt'].filter(name=>Object.hasOwn(moved,name)).map(name=>[name,moved[name]]))};}
  reconcileChat(hostId,result){if(result.moved===true&&Object.hasOwn(result,'workspaceId')){this.membershipOverrides.set(hostId+':'+result.id,result);const cached=this.cache.get(hostId);if(cached){cached.items=cached.items.map(item=>item.chatId===result.id?{...item,workspaceId:result.workspaceId,workspaceName:result.workspaceName,updatedAt:result.updatedAt}:item);this.saveCache();}this.lastIndex=null;this.indexAt=0;this.emitState(hostId,{indexChanged:true,runId:result.id});return;}if(Object.hasOwn(result,'failureReviewedAt')){this.reviewOverrides.set(hostId+':'+result.id,result);const cached=this.cache.get(hostId);if(cached){cached.items=cached.items.map(item=>item.chatId===result.id?this.reviewStatus(hostId,item):item);this.saveCache();}this.lastIndex=null;this.indexAt=0;this.emitState(hostId,{indexChanged:true,runId:result.id});return;}this.lifecycleOverrides.set(hostId+':'+result.id,result);const cached=this.cache.get(hostId);if(cached){cached.items=result.deleted?cached.items.filter(item=>item.chatId!==result.id):cached.items.map(item=>item.chatId===result.id?{...item,archivedAt:result.archivedAt||null,archived:!!result.archivedAt,attentionRequired:!!result.archivedAt?false:(item.status==='awaiting_input'||(['failed','interrupted'].includes(item.status)&&!item.failureReviewedAt))}:item);this.saveCache();}this.lastIndex=null;this.indexAt=0;this.emitState(hostId,{indexChanged:true,runId:result.id});}
  remove(hostId){this.load();const record=this.records.get(hostId);if(!record)throw new Error('Unknown paired computer.');this.records.delete(hostId);try{this.save();}catch(error){this.records.set(hostId,record);throw error;}this.cache.delete(hostId);this.lastIndex=null;this.indexAt=0;this.saveCache();this.cancelRecovery(hostId);this.recovery.delete(hostId);const session=this.sessions.get(hostId);this.sessions.delete(hostId);session?.client.close();this.emitState(hostId,{removed:true,status:'offline'});return this.list();}
  async pause(hostId,paused){
    this.load();const record=this.records.get(hostId);if(!record)throw new Error('Unknown paired computer.');
    const previous=record.paused;record.paused=paused;try{this.save();}catch(error){record.paused=previous;throw error;}
    this.indexAt=0;this.lastIndex=null;
    if(paused){this.disconnect(hostId);this.emitState(hostId,{status:'paused',paused:true,indexChanged:true});}
    else {this.recoveryFor(hostId).suspended=false;this.emitState(hostId,{status:'offline',paused:false,indexChanged:true});await this.connect(hostId);}
    return this.list();
  }
  disconnect(hostId){this.recoveryFor(hostId).suspended=true;this.cancelRecovery(hostId);const session=this.sessions.get(hostId);this.sessions.delete(hostId);session?.client.close();this.indexAt=0;this.lastIndex=null;this.emitState(hostId,{status:'disconnected'});return this.list();}
  async handle(value){if(!value||typeof value!=='object'||this.closed)throw new Error('Desktop connections are unavailable.');if(value.action==='network-restored'){this.resumeConnections();return this.list();}if(value.action==='list')return this.list();if(value.action==='pair')return this.pair(value.code,value.label);if(!uuid.test(value.hostId||''))throw new Error('Choose an explicit paired computer.');if(value.action==='connect')return this.connect(value.hostId,{automatic:value.automatic===true});if(value.action==='pause'||value.action==='resume')return this.pause(value.hostId,value.action==='pause');if(value.action==='remove')return this.remove(value.hostId);if(value.action==='disconnect')return this.disconnect(value.hostId);if(value.action==='read'){const session=this.sessions.get(value.hostId);if(session)session.unread=false;return this.list();}if(value.action==='request')return this.request(value.hostId,value.method,value.args,value.options);throw new Error('Unknown desktop peer action.');}
  close(){this.accessPolicy?.off('change',this.accessListener);this.closed=true;for(const hostId of this.recovery.keys())this.cancelRecovery(hostId);this.recovery.clear();for(const session of this.sessions.values())session.client.close();for(const client of this.pairing.values())client.close();this.sessions.clear();this.pairing.clear();}
}
