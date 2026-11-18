// Local composition only. Mnemosyne's scoped pairing exposes admission/status, never
// these settings, chats, files or execution controls.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {revision} from '../scheduling/schedules.js';
import {validateModelOptions} from '../../models/model-catalog.js';
import {LifeAskNative} from './life-ask-native.js';
import {LifeAskCloud} from './life-ask-cloud.js';
import {LifeAskExecutor} from './life-ask-executor.js';
import {LifeAskChats} from './life-ask-chats.js';
import {LifeAskPlacement} from './life-ask-placement.js';
import {LifeReminderIntent} from './life-reminder-intent.js';
import {LifeAskActions} from './life-ask-actions.js';

export class LifeAskHost {
  constructor(service,{timers=true}={}){
    this.service=service;this.store=service.lifeAsk;this.file=path.join(service.home,'life-ask-settings.json');this.closed=false;
    this.placement=new LifeAskPlacement(service);
    this.cloud=new LifeAskCloud({store:this.store,libraryRoot:()=>this.settings().libraryRoot});
    this.chat=new LifeAskChats({store:this.store,engine:service.engine,buildChatSchedule:service.buildChatSchedule,catalog:service.catalogs.codex,attachments:service.attachments,place:(run,receipt)=>this.placement.associate(run,receipt,this.settings().projectId),settings:()=>{const value=this.settings();return {model:value.model,reasoningEffort:value.reasoningEffort};}});
    this.actions=new LifeAskActions(this);
    this.executor=new LifeAskExecutor({home:service.life.homeAssistant,actions:this.actions,documents:(receipt,filing)=>this.documentTarget(receipt,filing),reminders:new LifeReminderIntent(service.life,()=>this.reminderScopes()),store:this.store,native:new LifeAskNative({store:this.store,omi:service.omi}),chat:this.chat,mirror:(...args)=>this.cloud.mirror(...args),notify:(receipt,result)=>result.confirmation?service.activity.localLifeConfirmation(receipt,result):service.activity.lifeAnswer({accountID:receipt.accountID,eventId:receipt.notificationEventId,requestId:receipt.requestId,hostId:receipt.hostID,chatId:receipt.chatId,title:service.engine.getRun(receipt.chatId).title,answer:result.answer,destination:result.destination})});
    this.change=(run,change)=>{if(run?.schedule?.lifeAsk&&!change?.stream){this.actions.cancel(run);this.wake();}};service.engine.on('change',this.change);
    this.timer=timers?setInterval(()=>{this.wake();void this.scan();this.compact();},30_000):null;
    if(timers){this.wake();void this.scan();this.compact();}
  }
  /** Life workspace: its operator-chosen folder and the default project for each Life feature. */
  workspace(){return {...this.placement.state(this.store.binding()),signedIn:!!this.store.binding().accountID};}
  setWorkspaceFolder(folder){if(!this.store.binding().accountID)throw Error('Sign in to Life first.');this.placement.setFolder(this.store.binding(),folder);this.service.notify();return this.workspace();}
  ensureLifeProject(kind){const value=this.placement.ensureKind(this.store.binding(),kind);this.service.notify();return value;}
  /** Names the pendant may use for "remind me ... for project ..."; ids never leave the owner. */
  reminderScopes(){
    const workspaces=(this.service.context.config().workspaces||[]).filter(row=>!row.deletedAt).map(row=>({id:row.id,name:row.name}));
    const known=new Set(workspaces.map(row=>row.id)),projects=(this.service.workspaceProjects.read().projects||[]).filter(row=>!row.deletedAt&&known.has(row.workspaceId)).map(row=>({id:row.id,name:row.name,workspaceId:row.workspaceId}));
    return {workspaces,projects};
  }
  settings(){return readJSON(this.file,{schemaVersion:1,enabled:false,model:'gpt-6.1-terra',reasoningEffort:'medium'});}
  documentTarget(receipt,filing){
    const settings=this.service.omi.getSettings(),configured=readJSON(settings.configPath)?.agent_requests?.inbox;
    if(typeof configured!=='string'||path.basename(filing.savedPath)!==receipt.requestId+'.md')throw Error('The saved memory reference is invalid.');
    const inbox=configured.startsWith('~/')?path.join(os.homedir(),configured.slice(2)):configured;
    const file=fs.realpathSync(path.join(inbox,receipt.requestId+'.md')),stat=fs.statSync(file);
    if(!stat.isFile()||stat.size>10_000_000)throw Error('Saved memory is unavailable for document viewing.');
    const targetFile=path.join(this.store.directory(receipt.requestId),'document-target.json');
    if(!fs.existsSync(targetFile))atomicJSON(targetFile,{accountID:receipt.accountID,file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
    return {kind:'document',accountId:receipt.accountID,hostId:receipt.hostID,documentId:receipt.requestId};
  }
  documentReference(id,accountId,workspaceIds){
    if(!/^[a-f0-9-]{36}$/.test(id||'')||accountId!==this.store.binding().accountID)throw Error('This memory belongs to another Life account.');
    const receipt=this.store.read(id),target=readJSON(path.join(this.store.directory(id),'document-target.json'),null);
    if(!receipt||receipt.accountID!==accountId||!target||target.accountID!==accountId)throw Error('This saved memory document is unavailable.');
    if(!fs.existsSync(target.file)||fs.realpathSync(target.file)!==target.file||fs.statSync(target.file).size>10_000_000||createHash('sha256').update(fs.readFileSync(target.file)).digest('hex')!==target.sha256)throw Error('The saved memory moved or changed. Open the vault to locate it.');
    for(const workspaceId of workspaceIds){try{return this.service.workspaceExplorer.reference({workspaceId,file:target.file});}catch{}}
    throw Error('The memory was saved. Add its vault folder to Source Library and enable workspace file viewing for this device in Connections to open it here.');
  }
  bound(){const settings=this.settings(),binding=this.store.binding();return !!binding.accountID&&settings.accountID===binding.accountID&&settings.hostID===binding.hostID;}
  enabled(){return !this.closed&&this.settings().enabled===true&&this.bound()&&this.service.life.get().enabled;}
  view(){
    const settings=this.settings(),binding=this.store.binding();
    const items=this.store.list().filter(row=>binding.accountID&&row.accountID===binding.accountID&&row.hostID===binding.hostID).sort((a,b)=>b.times.admittedAt-a.times.admittedAt).slice(0,200).map(row=>({requestId:row.requestId,chatId:row.chatId,state:row.state,summary:row.summary||'',times:row.times,resultRevision:row.resultRevision,deliveryNeedsAttention:row.deliveryNeedsAttention===true,title:row.chatId?this.service.engine.runs.get(row.chatId)?.title||'Life Ask':'Life Ask'}));
    return {accountID:binding.accountID,hostID:binding.hostID,settings:{enabled:this.enabled(),model:settings.model,reasoningEffort:settings.reasoningEffort,actionMcpIds:settings.actionMcpIds||[],configured:this.bound(),libraryConfigured:!!settings.libraryRoot},actionMcpOptions:this.service.context.get().entries.filter(e=>e.kind==='mcp').map(({id,name})=>({id,name})),models:this.service.catalogs.codex?.value?.models||[],revision:revision(settings),items};
  }
  async save(value,expectedRevision){
    const before=this.settings();if(revision(before)!==expectedRevision)throw Error('Life Ask settings changed. Reload before saving.');
    if(typeof value.enabled!=='boolean')throw Error('Choose whether Life Ask is enabled.');
    let next={...before,enabled:value.enabled};
    if(value.actionMcpIds!==undefined){const options=this.service.context.get().entries.filter(e=>e.kind==='mcp');if(!Array.isArray(value.actionMcpIds)||value.actionMcpIds.length>20||value.actionMcpIds.some(id=>typeof id!=='string'||!options.some(e=>e.id===id)))throw Error('Choose available MCP sources for Life Ask.');next.actionMcpIds=[...new Set(value.actionMcpIds)];}
    if(value.enabled){
      const binding=this.store.binding();if(!binding.accountID||!this.service.life.get().enabled)throw Error('Enable Life and sign in before enabling Life Ask.');
      if(!this.placement.folder()&&!this.placement.state(binding).workspaceId)throw Error('Choose a folder for the Life workspace before enabling Life Ask.');
      const model=value.model??before.model,reasoningEffort=value.reasoningEffort??before.reasoningEffort;
      const catalog=await this.service.catalogs.codex?.get(true),entry=catalog?.models?.find(item=>item.id===model);
      if(!entry||catalog.stale||catalog.error)throw Error('Refresh Codex and choose an available Life Ask model.');
      validateModelOptions({model,reasoningEffort},entry);
      const native=this.service.omi.getSettings();this.service.omi.verifyRuntime(native);
      if(fs.statSync(native.configPath).size>1_000_000)throw Error('Native configuration is too large.');
      const configured=readJSON(native.configPath)?.library?.root;
      if(typeof configured!=='string'||!configured)throw Error('Configure the Mnemosyne library in the existing native integration first.');
      const libraryRoot=fs.realpathSync(configured.startsWith('~/')?path.join(os.homedir(),configured.slice(2)):configured);
      if(!fs.statSync(libraryRoot).isDirectory())throw Error('The Mnemosyne library is unavailable.');
      if(JSON.stringify(this.store.binding())!==JSON.stringify(binding))throw Error('Life account changed during setup.');
      next={...next,model,reasoningEffort,libraryRoot,...binding,projectId:this.placement.ensure(binding,before)};
    }
    if(revision(this.settings())!==expectedRevision)throw Error('Life Ask settings changed during setup.');
    atomicJSON(this.file,next);this.wake();this.service.notify();return this.view();
  }
  wake(){
    if(this.closed||!this.bound())return;
    if(this.executor.pending){this.needsWake=true;return;}
    this.needsWake=false;
    void this.executor.tick().then(result=>{if(result)this.service.notify();if(this.needsWake||(result&&['answered','needs-attention'].includes(result.state)&&this.store.unfinished().length))queueMicrotask(()=>this.wake());}).catch(()=>{this.service.activity.log('warning','life.ask','Life Ask execution needs attention.');});
  }
  async scan(){
    if(this.closed||!this.enabled())return;
    try{await this.cloud.scan();}catch{/* Offline iCloud does not block the relay path. */}
  }
  compact(){
    if(this.closed||this.lastCompaction&&Date.now()-this.lastCompaction<60*60*1000)return;
    this.lastCompaction=Date.now();
    try{this.store.compact();}catch{this.service.activity.log('warning','life.ask','Completed Life Ask payload cleanup needs attention. Replay receipts and chat recordings are retained.');}
  }
  async close(){this.closed=true;this.actions.close();clearInterval(this.timer);this.service.engine.off('change',this.change);await this.executor.close();await this.cloud.scanning;}
}
