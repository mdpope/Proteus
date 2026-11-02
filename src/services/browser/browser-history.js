import { RemoteCommandJournal } from '../remote/remote-command-journal.js';
import { EventEmitter } from 'node:events';

// Owner-side catalogs are projections, never account refreshes or pairing grants.
export async function browserHistorySettings(service,value={}) {
  const history=service.browserHistory,paired=service.peers?.list() || [];
  const mutation=['enabled','retentionDays','peers'].some(key=>Object.hasOwn(value,key));
  if(mutation && Object.hasOwn(value,'peers')) {
    if(!Array.isArray(value.peers))throw new Error('Choose a valid history peer list.');
    const known=new Set(paired.map(peer=>peer.hostId)),previous=await history.settings();
    for(const peer of value.peers) {
      if(known.has(peer?.hostId))continue;
      const old=previous.peers.find(row=>row.hostId===peer?.hostId);
      const unchangedGrant=old && peer.enabled===old.enabled && String(peer.backfill)===old.backfill && JSON.stringify(peer.profileIds)===JSON.stringify(old.profileIds);
      if(!old || (peer.enabled!==false && !unchangedGrant))throw new Error('Choose a computer already paired with the owning desktop.');
    }
  }
  const result=await history.settings(mutation?value:{});
  if(mutation)void service.peers?.syncHistory()?.catch(()=>{});
  const text=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,200):'';
  const availablePeers=paired.map(peer=>({hostId:text(peer.hostId),label:text(peer.label)||text(peer.hostId),status:text(peer.status)||'offline',paused:peer.paused===true}));
  const profiles=service.browserProfiles?.list()?.items || [];
  const availableProfiles=[{id:'default',name:'Default'},...profiles.filter(profile=>typeof profile.id==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(profile.id)).map(profile=>({id:profile.id,name:text(profile.name)||'Profile'}))];
  return {...result,availablePeers,availableProfiles};
}

// All reads, imports and commits occur in the worker. No main-thread visit cache.
export class BrowserHistory extends EventEmitter {
  constructor(home,options={}) {
    super();this.client=new RemoteCommandJournal(home,{workerURL:new URL('./browser-history-worker.js',import.meta.url),maxRequests:64,workerOptions:{hostId:typeof options.hostId==='function'?(options.hostId() || ''):(options.hostId || '')}});
    // The journal client's worker transport is shared; history owns a separate worker/database.
    this.ready=this.client.ready;this.options=options;
    this.timer=setInterval(()=>this.scheduleMaintenance(),3600000);this.timer.unref?.();
    this.ready.then(()=>this.scheduleMaintenance()).catch(()=>{});
  }
  async request(method,value={}){if(method==='record'){const rows=value.events || value.visits || (value.eventId?[value]:[]),hostId=typeof this.options.hostId==='function'?this.options.hostId():this.options.hostId;value={...value,events:rows.map(row=>({...row,sourceHostId:row.sourceHostId || row.hostId || row.deviceId || hostId || ''}))};}if(['navigation','seed'].includes(method))value={...value,sourceHostId:value.sourceHostId || (typeof this.options.hostId==='function'?this.options.hostId():this.options.hostId) || ''};const result=await this.client.request(method,value);if((['record','apply','settings'].includes(method)&&result.changed)||(method==='delete'&&result.deleted>0)||(method==='navigation'&&value.action!=='seed'&&!result.replayed))this.emit('changed',{method});if((['record','apply'].includes(method)&&result.inserted>0)||(method==='settings'&&result.changed)||(method==='navigation'&&value.action!=='seed'&&!result.replayed))this.scheduleMaintenance();return result;}
  suggest(value){return this.request('suggest',value);}
  record(value){return this.request('record',value);} query(value){return this.request('query',value);}
  settings(value){return this.request('settings',value);} delete(value){return this.request('delete',value);}
  sync(value){return this.request('sync',value);} apply(value){return this.request('apply',value);}
  peerError(value){return this.request('peerError',value);} async importLegacy(value){const result=await this.request('importLegacy',value);if(result.imported>0){this.emit('changed',{method:'importLegacy'});this.scheduleMaintenance();}return result;}
  async importAccount(account,snapshot) {
    if(this.accountImportPending)return this.accountImportPending;
    this.accountImportPending=(async()=>{
      account.life.api.load();const identity=account.life.api.identity();if(!identity)return {connected:false};
      const source=JSON.stringify([identity.endpoint || '',identity.accountId,identity.workspaceId]);
      const old=await this.client.request('accountImport',{source});if(old)return {...old,alreadyImported:true};
      if(snapshot?.identity)account.life.api.assertIdentity(snapshot.identity);
      const response=snapshot || await account.request({path:'/history'});account.life.api.assertIdentity(identity);
      if(!Array.isArray(response.items)||response.items.length>500)throw new Error('Invalid legacy account history.');
      let imported=0,excluded=0;
      for(let offset=0;offset<response.items.length;offset+=200){account.life.api.assertIdentity(identity);const result=await this.importLegacy({source,items:response.items.slice(offset,offset+200)});imported+=result.imported;excluded+=result.excluded;}
      account.life.api.assertIdentity(identity);
      // The cloud source is read only and retained. A failure before this marker retries
      // stable import IDs without duplicating already committed batches.
      return this.client.request('accountImport',{source,complete:true,imported,excluded});
    })().finally(()=>{this.accountImportPending=null;});return this.accountImportPending;
  }
  async status(){return {...await this.request('status'),maintenance:{running:!!this.maintenancePromise,lastPruned:this.lastMaintenancePruned || 0,...(this.lastMaintenanceError?{error:this.lastMaintenanceError}:{})}};} navigation(value){return this.request('navigation',value);} navigationGet(value){return this.request('navigationGet',value);} seed(value){return this.request('seed',value);} batchNavigation(value){return this.request('batchNavigation',value);}
  relocateNavigation(value){return this.request('relocateNavigation',value);}
  prune(value){return this.request('prune',value);}
  async handle(value={}) {const action=value.action || 'query';if(!['query','record','settings','delete','status','navigation','navigationGet'].includes(action))throw new Error('Unknown history action.');return this[action](action==='settings'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='action')):value);}
  scheduleMaintenance(){
    if(this.closing || this.maintenanceScheduled)return;
    this.maintenanceScheduled=setImmediate(()=>{this.maintenanceScheduled=null;void this.maintenance().catch(()=>{});});
    this.maintenanceScheduled.unref?.();
  }
  maintenance(value={}){
    if(this.maintenancePromise){if(value.now && value.now!==this.maintenanceNow)return this.maintenancePromise.then(()=>this.maintenance(value));return this.maintenancePromise;}
    if(this.closing)return Promise.resolve({pruned:0,stopped:true});
    const now=value.now || Date.now();this.maintenanceNow=now;
    this.maintenancePromise=(async()=>{
      let pruned=0,batches=0;
      while(!this.closing){
        // Each bounded transaction is isolated in the worker. Yield between batches
        // so reads/navigation already waiting on that worker can interleave.
        const result=await this.prune({now});pruned+=result.pruned;batches++;
        if(!result.hasMore)break;
        await new Promise(resolve=>setImmediate(resolve));
      }
      this.lastMaintenancePruned=pruned;this.lastMaintenanceError=null;
      if(pruned>0)this.emit('changed',{method:'prune'});
      return {pruned,batches,stopped:this.closing===true};
    })().catch(error=>{this.lastMaintenanceError='History retention maintenance could not finish; Proteus will retry.';this.emit('maintenance-error',{message:this.lastMaintenanceError,code:error.code});throw error;}).finally(()=>{this.maintenancePromise=null;});
    return this.maintenancePromise;
  }
  close(){
    if(this.closePromise)return this.closePromise;
    this.closing=true;clearInterval(this.timer);clearImmediate(this.maintenanceScheduled);this.maintenanceScheduled=null;
    this.closePromise=(async()=>{try{await this.maintenancePromise;}catch{}await this.client.close();})();return this.closePromise;
  }
}

// Optional desktop-owned cache lookup; headless owners return globe fallbacks.
export async function historyWithSavedIcons(service,result,value={}) {
  if(!service.browserHistoryIcons||!Array.isArray(result.items)||!result.items.length)return result;
  const {icons}=await service.browserHistoryIcons({profileId:value.profileId||'default',urls:result.items.slice(0,100).map(item=>item.url)});
  const items=result.items.map(item=>({...item,...(icons[item.url]?{favicon:icons[item.url]}:{})}));return {...result,items,...(result.entries?{entries:items}:{})};
}
