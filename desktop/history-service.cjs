const {randomUUID}=require('node:crypto');
const {safeHistoryURL}=require('./browser-history.cjs');
class HistoryService {
  constructor(store,{onError=()=>{}}={}){this.store=store;this.onError=onError;this.pending=new Set();}
  visit(url,title,appOrigin,profileId='default',details={}){
    url=safeHistoryURL(url,appOrigin);if(!url)return;
    // Shared tabs are committed once by their owning computer's navigation transaction.
    if(details.scope)return;
    const task=this.store.record({events:[{eventId:details.eventId||randomUUID(),url,title,profileId,visitedAt:new Date().toISOString(),tabId:details.tabId,entryId:details.entryId}]}).catch(error=>this.onError(error)).finally(()=>this.pending.delete(task));this.pending.add(task);
  }
  async list(value={}){const result=await this.store.query({...value,profileId:value.profileId||'default',limit:value.pageSize||50});return {...result,page:1,pageSize:value.pageSize||50};}
  async update(value){
    if(value.action==='history-delete')await this.store.delete({eventIds:[value.id]});
    else if(value.action==='history-clear')await this.store.delete({before:new Date().toISOString(),profileId:value.profileId});
    else if(value.action==='history-settings')await this.store.settings({enabled:value.enabled,retentionDays:value.retentionDays});
    else throw new Error('Unknown browser history operation.');return this.list(value);
  }
  async close(){await Promise.allSettled(this.pending);}
}
module.exports={HistoryService};
