import {createHash} from 'node:crypto';
// Model projection only: persistence and renderer icons remain unchanged. Content
// identity deduplicates identical icons without assuming URL/domain equivalence.
export function browserObservation(value){
 if(Array.isArray(value))return value.map(browserObservation);
 if(!value||typeof value!=='object')return value;
 const result={};
 for(const [key,item] of Object.entries(value)){
  if(key==='favicon'&&typeof item==='string'&&item.startsWith('data:')){
   result.faviconRef='sha256:'+createHash('sha256').update(item).digest('hex');
  }else result[key]=browserObservation(item);
 }
 return result;
}
