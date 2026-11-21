// Delayed iCloud delivery shares the relay admission journal. The caller supplies an
// authorized library root; this module never discovers or widens folder access.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {admissionFromLegacy,LIFE_ASK_ENVELOPE_BYTES} from './life-ask.js';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function readBounded(file, limit=LIFE_ASK_ENVELOPE_BYTES) {
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
  try {
    const stat=fs.fstatSync(fd);
    if(!stat.isFile()||stat.size>limit)throw Error('Life Ask cloud file is unavailable or too large.');
    const bytes=Buffer.alloc(stat.size+1);
    let size=0,count;
    while(size<bytes.length&&(count=fs.readSync(fd,bytes,size,bytes.length-size,size))>0)size+=count;
    if(size!==stat.size)throw Error('Life Ask cloud file changed while reading.');
    return JSON.parse(bytes.subarray(0,size).toString('utf8'));
  } finally {fs.closeSync(fd);}
}

export class LifeAskCloud {
  constructor({store,libraryRoot,now=Date.now}) {Object.assign(this,{store,libraryRoot,now});this.cursor='';this.scanning=null;}
  folder(name,{create=false}={}) {
    const root=this.libraryRoot();
    if(typeof root!=='string'||!path.isAbsolute(root)||fs.realpathSync(root)!==root)throw Error('An authorized canonical Mnemosyne library is required.');
    const folder=path.join(root,name);
    if(create&&!fs.existsSync(folder))fs.mkdirSync(folder,{mode:0o700});
    if(!fs.lstatSync(folder).isDirectory()||fs.realpathSync(folder)!==folder)throw Error('Life Ask cloud folder must be a real directory.');
    return folder;
  }
  scan({limit=25}={}) {
    if(this.scanning)return this.scanning;
    this.scanning=this.scanBatch(Math.max(1,Math.min(100,limit))).finally(()=>{this.scanning=null;});
    return this.scanning;
  }
  async scanBatch(limit) {
    const binding=this.store.binding(),counts={examined:0,accepted:0,duplicate:0,held:0};
    if(!binding.accountID||!this.store.enabled())return counts;
    const folder=this.folder('AgentRequests');
    const names=fs.readdirSync(folder).filter(name=>name.endsWith('.json')&&uuid.test(name.slice(0,-5))).sort();
    const ordered=[...names.filter(name=>name>this.cursor),...names.filter(name=>name<=this.cursor)].slice(0,limit);
    for(const name of ordered){
      // Account switches stop the batch; admission rechecks after every await too.
      if(JSON.stringify(this.store.binding())!==JSON.stringify(binding))break;
      this.cursor=name;counts.examined++;
      try {
        const value=readBounded(path.join(folder,name));
        if(value.version!==1||value.status!=='queued'||value.id!==name.slice(0,-5)||value.executionOwner!=='proteus-life'||value.accountID!==binding.accountID||value.hostID!==binding.hostID){counts.held++;continue;}
        const receipt=await this.store.admit(admissionFromLegacy(value),{source:'icloud'});
        if(receipt.state==='accepted'||receipt.state==='duplicate')counts[receipt.state]++;else counts.held++;
      } catch {counts.held++;} // Partial cloud downloads stay untouched for the next pass.
    }
    return counts;
  }
  mirror(receipt,result) {
    const binding=this.store.binding();
    if(!uuid.test(receipt.requestId)||!binding.accountID||receipt.accountID!==binding.accountID||receipt.hostID!==binding.hostID)throw Error('Life Ask answer binding changed.');
    if(receipt.state!=='answered'||!uuid.test(receipt.chatId||'')||!Number.isSafeInteger(receipt.times?.answeredAt)||receipt.times.answeredAt<=0||typeof result.transcript!=='string'||typeof result.answer!=='string'||!result.answer.trim())throw Error('A completed Life Ask answer is required.');
    const folder=this.folder('AgentAnswers',{create:true}),file=path.join(folder,receipt.requestId+'.json');
    const value={id:receipt.requestId,status:'completed',transcript:result.transcript,answer:result.answer,savedPath:result.savedPath||null,...(result.reminder?{reminder:result.reminder}:{}),...(result.destination?{destination:result.destination}:{}),model:result.model,reasoningEffort:result.reasoningEffort,completedAt:receipt.times.answeredAt/1000,executor:'proteus',hostId:receipt.hostID,accountID:receipt.accountID,chatId:receipt.chatId,audioSha256:receipt.audioSha256,times:receipt.times};
    const bytes=JSON.stringify(value)+'\n';
    if(Buffer.byteLength(bytes)>1_000_000)throw Error('Life Ask answer mirror is too large.');
    const temporary=path.join(folder,'.proteus-answer-'+randomUUID());
    try {
      const fd=fs.openSync(temporary,'wx',0o600);
      try {fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
      // Linking publishes the complete bytes without replacing an existing answer.
      // Unsupported filesystems fail closed; the durable execution receipt can retry.
      try {fs.linkSync(temporary,file);}
      catch(error){
        if(error.code!=='EEXIST')throw error;
        const existing=readBounded(file,1_000_000);
        if(existing.executor!=='proteus'||existing.id!==value.id||existing.accountID!==value.accountID||existing.hostId!==value.hostId||existing.chatId!==value.chatId||existing.audioSha256!==value.audioSha256)throw Error('An existing answer belongs to a different execution; it was preserved.');
        return {written:false,preserved:true};
      }
      return {written:true,at:this.now()};
    } finally {fs.rmSync(temporary,{force:true});}
  }
}
