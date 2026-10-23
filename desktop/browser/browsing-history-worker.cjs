const fs = require('node:fs/promises');
const path = require('node:path');
const { parentPort, workerData } = require('node:worker_threads');
const MAX_BYTES=8*1024*1024;
let tail=Promise.resolve();
parentPort.on('message',request=>{
  tail=tail.then(async()=>{
    const temporary=workerData.file+'.tmp';
    try {
      const cutoff=request.now-(request.data.retentionDays||90)*86400000;
      const indexed=request.data.items.map((item,index)=>({item,index})).filter(({item})=>Date.parse(item.visitedAt)>cutoff).slice(-10000);
      const clean={...request.data,items:indexed.map(row=>row.item)};
      let json=JSON.stringify(clean);
      while(Buffer.byteLength(json)>MAX_BYTES&&indexed.length){indexed.splice(0,Math.max(1,Math.ceil(indexed.length/10)));clean.items=indexed.map(row=>row.item);json=JSON.stringify(clean);}
      if(Buffer.byteLength(json)>MAX_BYTES)throw new Error('Browser history exceeds its size limit.');
      await fs.mkdir(path.dirname(workerData.file),{recursive:true});
      await fs.writeFile(temporary,json,{mode:0o600});
      await fs.chmod(temporary,0o600);
      await fs.rename(temporary,workerData.file);
      parentPort.postMessage({id:request.id,keptIndices:indexed.map(row=>row.index)});
    } catch(error) {
      await fs.unlink(temporary).catch(()=>{});
      parentPort.postMessage({id:request.id,error:{code:error.code||'WRITE_FAILED',message:error.message}});
    }
  });
});
