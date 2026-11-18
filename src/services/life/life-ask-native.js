// Fixed Omi helpers only. This is independent of the legacy recording-service
// takeover: the helper owns its per-request lock, ASR cache and create-only filing.
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {atomicJSON,readJSON} from '../../shared/files.js';

const run = promisify(execFile);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const roundedTimes = value => Object.fromEntries(Object.entries(value || {}).flatMap(([key,time]) =>
  ['asrStartedAt','asrEndedAt'].includes(key) && typeof time==='number' && Number.isSafeInteger(Math.round(time)) && time>0 ? [[key,Math.round(time)]] : []));

export class LifeAskNative {
  constructor({store,omi,execute=run}) { Object.assign(this,{store,omi,execute}); }
  request(receipt) {
    if(!uuid.test(receipt?.requestId||''))throw Error('Invalid Life Ask request identity.');
    const binding=this.store.binding();
    if(!binding.accountID||binding.accountID!==receipt.accountID||binding.hostID!==receipt.hostID)throw Error('Life Ask account binding changed.');
    const file=path.join(this.store.directory(receipt.requestId),'request.json');
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>3_000_000)throw Error('Frozen Life Ask envelope is unavailable.');
    const value=readJSON(file);
    if(value.id!==receipt.requestId||value.accountID!==receipt.accountID||value.hostID!==receipt.hostID||value.executionOwner!=='proteus-life'||value.audioDigest?.sha256!==receipt.audioSha256||value.audioDigest?.bytes!==receipt.audioBytes)throw Error('Frozen Life Ask envelope binding differs.');
    return file;
  }
  async invoke(verb,receipt,extra=[]) {
    const request=this.request(receipt),settings=this.omi.getSettings();
    this.omi.verifyRuntime(settings);
    const helper=path.join(path.dirname(settings.workerPath),'agent_requests.py');
    if(!fs.statSync(helper).isFile())throw Error('The native Life Ask helper is unavailable.');
    let output;
    try { output=await this.execute(settings.pythonPath,[helper,'--config',settings.configPath,verb,'--request',request,...extra],{encoding:'utf8',timeout:180_000,maxBuffer:1_000_000,windowsHide:true}); }
    catch { throw Error('The native Life Ask '+verb+' helper did not complete. Its same-request receipt is retained for recovery.'); }
    let result;try{result=JSON.parse(output.stdout);}catch{throw Error('The native Life Ask helper returned invalid JSON.');}
    if(result?.status==='error')throw Error('The native Life Ask '+verb+' helper reported an error.');
    if(result?.requestId!==receipt.requestId||result?.audioSha256!==receipt.audioSha256)throw Error('The native Life Ask result belongs to another request.');
    this.request(receipt); // Account changes during ASR cannot advance another account's execution.
    return result;
  }
  async transcribe(receipt) {
    const result=await this.invoke('transcribe',receipt);
    if(typeof result.transcript!=='string'||!result.transcript.trim()||result.transcript.length>100_000)throw Error('The native Life Ask transcript is empty or too large.');
    return {requestId:receipt.requestId,audioSha256:receipt.audioSha256,transcript:result.transcript,times:roundedTimes(result.times)};
  }
  async file(receipt,result) {
    if(!['task','memory'].includes(result?.kind)||typeof result.item!=='string'||!result.item.trim()||typeof result.answer!=='string'||!result.answer.trim())throw Error('Life Ask filing needs a task or memory with an item and answer.');
    if(result.item.length>100_000||result.answer.length>100_000)throw Error('Life Ask filing result is too large.');
    this.request(receipt);
    const intent={kind:result.kind,item:result.item,answer:result.answer},file=path.join(this.store.directory(receipt.requestId),'filing-intent.json');
    if(fs.existsSync(file)){if(JSON.stringify(readJSON(file))!==JSON.stringify(intent))throw Error('Life Ask filing intent changed; preserve the original.');}
    else atomicJSON(file,intent);
    const response=await this.invoke('file',receipt,['--result',file]);
    if(response.kind!==intent.kind||typeof response.savedPath!=='string'||!response.savedPath||path.isAbsolute(response.savedPath)||response.savedPath.split(/[\\/]/).includes('..'))throw Error('The native Life Ask filing receipt is invalid.');
    return {requestId:receipt.requestId,audioSha256:receipt.audioSha256,kind:response.kind,savedPath:response.savedPath};
  }
}
