import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {atomicJSONAsync} from '../../shared/files.js';

// Human-only text transport. Tab inventories and ordinary chat projections never
// contain these bodies; files, model choices and approvals remain device-local.
export class SharedDrafts {
 constructor(home,{validate,changed=()=>{}}){this.file=path.join(home,'shared-text-drafts.json');this.validate=validate;this.changed=changed;this.tail=Promise.resolve();this.rows={};if(fs.existsSync(this.file)){if(fs.statSync(this.file).size>24*1024*1024)throw Error('Shared draft storage exceeds its limit.');this.rows=JSON.parse(fs.readFileSync(this.file,'utf8')).rows||{};}}
 key(value){if(!['setup','reply'].includes(value.kind)||!/^[a-zA-Z0-9_:.-]{1,256}$/.test(value.id||''))throw Error('Choose a valid draft.');this.validate(value);return value.kind+':'+value.id;}
 get(value){const key=this.key(value),row=this.rows[key];return {kind:value.kind,id:value.id,text:row?.text||'',revision:row?.revision||0,updatedAt:row?.updatedAt||null,...(Number.isSafeInteger(row?.clearedRevision)?{clearedRevision:row.clearedRevision}:{})};}
 save(value,{clearSent=false}={}){const work=this.tail.then(async()=>{const key=this.key(value);if(typeof value.text!=='string'||Buffer.byteLength(value.text)>200000||!Number.isSafeInteger(value.expectedRevision)||value.expectedRevision<0||!/^[a-zA-Z0-9_-]{1,100}$/.test(value.operationId||''))throw Error('Choose bounded draft text and its current revision.');
   const row=this.rows[key]||{revision:0,text:'',receipts:[]},digest=createHash('sha256').update(value.text).digest('hex'),receipt=row.receipts?.find(item=>item.id===value.operationId);
   if(receipt){if(receipt.digest!==digest)throw Error('Draft operation ID was already used.');return {...this.get(value),appliedRevision:receipt.revision};}
   if(value.expectedRevision!==row.revision&&value.text!==row.text)return {...this.get(value),conflict:true};
   const revision=row.revision+(value.text===row.text?0:1),next={...row,text:value.text,revision,updatedAt:new Date().toISOString(),receipts:[...(row.receipts||[]),{id:value.operationId,digest,revision}].slice(-32)};
   if(clearSent)next.clearedRevision=row.revision;else if(value.text)delete next.clearedRevision;
   const rows={...this.rows,[key]:next},encoded=JSON.stringify({schemaVersion:1,rows});if(Object.keys(rows).length>2048||Buffer.byteLength(encoded)>24*1024*1024)throw Error('Shared draft storage is full. Existing drafts are preserved.');
   await atomicJSONAsync(this.file,{schemaVersion:1,rows});this.rows=rows;this.changed({kind:value.kind,id:value.id,revision});return {...this.get(value),appliedRevision:revision};
  });this.tail=work.catch(()=>{});return work;}
 async clearSent(value,text){await this.tail;const current=this.get(value);if(!text||current.text!==text)return;return this.save({...value,text:'',expectedRevision:current.revision,operationId:randomUUID()},{clearSent:true});}
 async close(){await this.tail;}
}
