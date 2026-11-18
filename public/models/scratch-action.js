// A structural edit keeps its identity until both the owner receipt and local
// acknowledgement are durable. Never issue a new operation after an uncertain
// create, move or delete, including after reopening the page.
export class ScratchAction {
 constructor({request,load=()=>null,save=()=>{}}){this.request=request;this.save=save;this.pending=load();this.running=null;}
 async perform(args){
  if(this.pending){
   const {operationId,...prior}=this.pending;
   const ordered=value=>JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))));
   if(ordered(prior)!==ordered(args))throw Error('Retry the unconfirmed Scratchpad action before choosing another action.');
  }else this.pending={...args,operationId:crypto.randomUUID()};
  if(this.running)return this.running;
  this.running=Promise.resolve().then(async()=>{this.save(this.pending);const result=await this.request(this.pending);this.save(null);this.pending=null;return result;});
  try{return await this.running;}catch(error){if(error.code==='SCRATCH_REJECTED'){this.save(null);this.pending=null;}throw error;}finally{this.running=null;}
 }
 retry(){if(!this.pending)throw Error('No Scratchpad action needs retrying.');const {operationId,...args}=this.pending;return this.perform(args);}
}
