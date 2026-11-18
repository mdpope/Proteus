// Only accepts the application handle returned by this test's electron.launch.
// A closed inspector transport is not proof the actual Electron process exited.
export async function closeTestElectron(app,{timeout=3000}={}){
 if(!app)return;
 const child=app.process(),alive=()=>child.exitCode===null&&child.signalCode===null;
 const wait=async task=>{let timer;try{await Promise.race([task,new Promise(resolve=>{timer=setTimeout(resolve,timeout);})]);}finally{clearTimeout(timer);}};
 await wait(app.close().catch(()=>{}));
 if(alive()){
  const exited=new Promise(resolve=>child.once('exit',resolve));
  child.kill('SIGTERM');await wait(exited);
  if(alive()){child.kill('SIGKILL');await exited;}
 }
 await app.context().request.dispose().catch(()=>{});
}
