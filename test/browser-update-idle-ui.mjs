import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-idle-ui-'));let app;
const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/octet-stream','content-length':req.url==='/done'?7:1048576});if(req.url==='/done')res.end('fixture');else{const timer=setInterval(()=>res.write(Buffer.alloc(1024)),50);res.on('close',()=>clearInterval(timer));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 app=await electron.launch({args:['test/account-queue-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home}});
 const page=await app.firstWindow();await page.locator('[data-page=runs]').first().waitFor();
 const result=await app.evaluate(async({BrowserWindow},{home,origin})=>{
  const require=process.mainModule.require.bind(process.mainModule),{browserUpdateActivity,STALL_MS}=require(process.cwd()+'/desktop/browser/browser-update-activity.cjs');
  const wc=BrowserWindow.getAllWindows()[0].webContents,partition=wc.session,rows=[];
  const observe=item=>browserUpdateActivity([{id:'fixture-tab',title:'Fixture download',downloads:new Set([item])}])[0];
  const acquire=url=>new Promise(resolve=>{partition.once('will-download',(_e,item)=>{item.setSavePath(require('node:path').join(home,'file-'+rows.length));resolve(item);});wc.downloadURL(url);});
  const slow=await acquire(origin+'/slow');rows.push(observe(slow));slow.pause();rows.push(observe(slow));
  const cancelled=new Promise(r=>slow.once('done',()=>{rows.push(observe(slow));r();}));slow.cancel();await cancelled;
  const done=await acquire(origin+'/done');await new Promise(r=>done.once('done',()=>{rows.push(observe(done));r();}));
  await new Promise(resolve=>{partition.once('will-download',(_e,item)=>{rows.push(observe(item));item.cancel();resolve();});partition.createInterruptedDownload({path:require('node:path').join(home,'interrupted'),urlChain:[origin+'/slow'],offset:1,length:1048576});});
  const agents=browserUpdateActivity([{id:'hung',title:'Hung',agentActions:1,lastAgentProgressAt:1},{id:'active',title:'Active',agentActions:1,lastAgentProgressAt:STALL_MS+1}],STALL_MS+1);
  return {rows,agents};
 },{home,origin:'http://127.0.0.1:'+server.address().port});
 assert.deepEqual(result.rows.map(r=>[r.state,r.blocking]),[['progressing',true],['paused',false],['cancelled',false],['completed',false],['interrupted',false]]);
 assert.deepEqual(result.agents.map(r=>[r.state,r.blocking]),[['stalled',false],['progressing',true]]);
 console.log(JSON.stringify({passed:true,synthetic:true,realElectronDownloads:true,...result}));
}finally{await app?.close();server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(home,{recursive:true,force:true});}
