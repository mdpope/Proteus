const path = require('node:path');
const { Worker } = require('node:worker_threads');

class HistoryWriter {
  constructor(file){this.file=file;this.worker=null;this.pending=new Map();this.sequence=0;}
  start(){
    if(this.worker)return this.worker;
    const worker=new Worker(path.join(__dirname,'browsing-history-worker.cjs'),{workerData:{file:this.file}});
    this.worker=worker;
    worker.on('message',result=>{
      const pending=this.pending.get(result.id);if(!pending)return;
      this.pending.delete(result.id);
      if(!this.pending.size)worker.unref();
      if(result.error)pending.reject(Object.assign(new Error(result.error.message),{code:result.error.code}));else pending.resolve(result.keptIndices);
    });
    const failed=error=>{
      if(this.worker===worker)this.worker=null;
      for(const pending of this.pending.values())pending.reject(error);this.pending.clear();worker.unref();
    };
    worker.on('error',failed);
    worker.on('exit',code=>{if(this.worker===worker)failed(new Error('Browser history writer exited before saving.'));});
    worker.unref();return worker;
  }
  save(data,now=Date.now()){
    const worker=this.start(),id=++this.sequence;worker.ref();
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      try{worker.postMessage({id,data,now});}catch(error){this.pending.delete(id);if(!this.pending.size)worker.unref();reject(error);}
    });
  }
  async close(){
    const worker=this.worker;this.worker=null;
    for(const pending of this.pending.values())pending.reject(new Error('Browser history writer closed before saving.'));this.pending.clear();
    if(worker)await worker.terminate();
  }
}
module.exports={HistoryWriter};
