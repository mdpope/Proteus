// Test-only launch isolation and optional failed-health injection. Never packaged.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const [file,modulePath,...flags]=process.argv.slice(2);
const {supervise,verifyLive,environment}=require(modulePath);
const {readJob}=require(path.join(path.dirname(modulePath),'update-package.cjs'));
const rollback=flags.includes('--rollback'),mock=flags.includes('--mock-keychain');
const root=path.resolve(path.dirname(file),'../../../..');
function assertFixture(job){
 if(job.home!==path.join(root,'data')||job.installation!==path.join(root,process.platform==='darwin'?'Proteus.app':'Proteus')||!fs.existsSync(path.join(root,'receipt')))throw Error('Use only the disposable packaged-update fixture.');
}
const launchApp=job=>{
 assertFixture(job);if(process.platform!=='darwin')throw Error('Mock Keychain isolation is Mac only.');
 const executable=path.join(job.installation,'Contents/MacOS/Proteus');
 const log=fs.openSync(path.join(path.dirname(file),'launch.log'),'a',0o600);
 try{
  const child=spawn(executable,['--use-mock-keychain','--user-data-dir='+job.browserHome],{detached:true,stdio:['ignore',log,log],env:environment(job.home,false,{PROTEUS_UPDATE_JOB:job.file})});
  child.unref();return child;
 }finally{fs.closeSync(log);}
};
(async()=>{
 assertFixture(readJob(file));process.send({ready:readJob(file).id});process.disconnect();
 const deadline=Date.now()+60000;
 while(readJob(file).phase!=='stopping'){
  if(Date.now()>deadline)throw Error('Disposable host did not hand off.');
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 await supervise(file,{
  ...(mock?{launchApp}:{}),
  ...(rollback?{verify:async(job,identity)=>{
   const receipt=await verifyLive(job,identity);
   if(identity.sourceFingerprint===job.candidate.sourceFingerprint&&job.outcome!=='rollback')throw Error('Explicit isolated health-failure injection after actual packaged candidate verification');
   return receipt;
  }}:{})
 });
})().catch(error=>{console.error(error);process.exitCode=1;});
