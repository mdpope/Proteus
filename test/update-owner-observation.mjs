// Test-only observation of the exact disposable owner, never a live installation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export async function observeUpdateOwner({pid,home,browserHome,executable,log,keys}){
 const text=fs.readFileSync(log,'utf8'),matches=[...text.matchAll(/Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+)/g)];
 assert.ok(matches.length,'Disposable owner inspector was not advertised');
 assert.ok(home.startsWith(path.dirname(browserHome)+path.sep),'Use a disposable sibling home/profile');
 assert.ok(keys.every(key=>/^(?:XDG_CURRENT_DESKTOP|XDG_SESSION_DESKTOP|DESKTOP_SESSION|KDE_FULL_SESSION|KDE_SESSION_VERSION|XDG_SESSION_TYPE)$/.test(key)),'Only desktop identity fields may be observed');
 const socket=new WebSocket(matches.at(-1)[1]),pending=new Map();let sequence=0;
 const rejectAll=error=>{for(const entry of pending.values())entry.reject(error);pending.clear();};
 socket.addEventListener('message',event=>{const value=JSON.parse(event.data);const entry=pending.get(value.id);if(entry){pending.delete(value.id);value.error?entry.reject(Error(value.error.message)):entry.resolve(value.result);}});
 socket.addEventListener('close',()=>rejectAll(Error('Disposable inspector closed')));
 socket.addEventListener('error',()=>rejectAll(Error('Disposable inspector failed')));
 const call=(method,params)=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Disposable inspector timed out'));},10000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
 try{
  await new Promise((resolve,reject)=>{if(socket.readyState===WebSocket.OPEN)return resolve();const timer=setTimeout(()=>reject(Error('Disposable inspector did not open')),10000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});socket.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Disposable inspector did not open'));},{once:true});});
  const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true});assert.equal(result.exceptionDetails,undefined,'Disposable observation must succeed');return result.result.value;};
  const identity=await evaluate('({pid:process.pid,home:process.env.PROTEUS_HOME,executable:process.execPath,browserHome:process.mainModule.require("electron").app.getPath("userData")})');
  assert.deepEqual(identity,{pid,home,executable,browserHome},'Inspector must belong to the exact relaunched disposable owner before reading context');
  const desktop=await evaluate('Object.fromEntries('+JSON.stringify(keys)+'.map(key=>[key,process.env[key]??null]))');
  // Stop this fixture's inspector before cleanup, so it cannot hold a process open.
  await evaluate('setTimeout(()=>process.mainModule.require("node:inspector").close(),0);true');
  return {identity,desktop};
 }finally{socket.close();rejectAll(Error('Disposable observation finished'));}
}
