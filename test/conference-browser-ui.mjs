import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,X509Certificate} from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';

const fixture=await sidebarFixture();
const screenOnly=process.argv.includes('--screen-only');
const chromiumDisplay=process.argv.includes('--chromium-display');
const zoomWebSharing=chromiumDisplay&&process.argv.includes('--zoom-web-sharing');
const embeddedMedia=process.argv.includes('--embedded-media');
const allowBoth=embeddedMedia&&process.argv.includes('--allow-both');
let siteServer,origin=fixture.origin,trustSwitch;
let app;
try{
 if(embeddedMedia){
  siteServer=http.createServer((request,response)=>{
   response.setHeader('Content-Type','text/html');
   response.end(request.url==='/device-frame'?'<style>body{margin:0}usermedia{margin:20px}</style><usermedia id="microphone" type="microphone"></usermedia>':'<style>body{margin:0}</style><iframe title="Devices" src="/device-frame" width="420" height="150" allow="microphone; camera"></iframe>');
  });
  await new Promise(resolve=>siteServer.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+siteServer.address().port;
 }
 if(chromiumDisplay){
  const key=path.join(fixture.temporary,'screen-key.pem'),cert=path.join(fixture.temporary,'screen-cert.pem');
  const site=zoomWebSharing?'app.zoom.us':'127.0.0.1';
  const san=zoomWebSharing?'DNS:app.zoom.us':'IP:127.0.0.1';
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN='+site,'-addext','subjectAltName='+san],{stdio:'ignore'});
  const certificate=fs.readFileSync(cert),spki=new X509Certificate(certificate).publicKey.export({type:'spki',format:'der'});
  trustSwitch='--ignore-certificate-errors-spki-list='+createHash('sha256').update(spki).digest('base64');
  siteServer=https.createServer({key:fs.readFileSync(key),cert:certificate},(req,res)=>{
   res.setHeader('Content-Type','text/html');
   const frame=zoomWebSharing&&req.url==='/conference-fixture'?'<iframe src="/capture-frame" allow="display-capture"></iframe>':'';
   res.end('<!doctype html><title>Screen capture fixture</title>'+frame);
  });
  await new Promise(resolve=>siteServer.listen(0,'127.0.0.1',resolve));
  origin='https://'+site+':'+siteServer.address().port;
 }
 app=await electron.launch({executablePath:process.env.PROTEUS_TEST_EXECUTABLE,args:['.','--use-mock-keychain',...(screenOnly?[]:['--use-fake-device-for-media-stream']),...(embeddedMedia?['--enable-blink-features=UserMediaElement,UserMediaElementLegacy','--enable-features=UserMediaElement,UserMediaElementLegacy']:[]),...(trustSwitch?[trustSwitch]:[]),...(zoomWebSharing?['--no-proxy-server','--host-resolver-rules=MAP app.zoom.us 127.0.0.1']:[])],
  env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_AUTH:'none',PROTEUS_PREVIEW_HOME:fixture.locations.root,PORT:'0'}});
 const shell=await app.firstWindow(),errors=[];
 shell.on('pageerror',error=>errors.push(error.message));
 await shell.locator('#topbar-home').waitFor();
 await shell.locator('#sidebar [data-page=engine]').click();
 await shell.locator('[data-engine-section=preferences]').click();
 await shell.getByRole('tab',{name:'Security & DNS',exact:true}).click();
 await shell.getByRole('heading',{name:'Browser DNS'}).waitFor();
 await shell.getByRole('tab',{name:'Site Permissions',exact:true}).click();
 const media=shell.locator('[data-media]');
 await media.getByLabel('Website origin').fill(origin);
 await media.getByLabel('Website origin').blur();
 for(const kind of ['microphone','camera']){
  await media.getByLabel('Device').selectOption(kind);
  await media.getByLabel('Access').selectOption('allow');
  await media.getByRole('button',{name:'Save device permission'}).click();
  await media.getByRole('button',{name:'Remove '+kind+' permission for '+origin,exact:true}).waitFor();
 }
 for(const kind of ['microphone','camera']){
  const remove=media.getByRole('button',{name:'Remove '+kind+' permission for '+origin,exact:true});
  await remove.click();
  await remove.waitFor({state:'detached'});
 }
 const {id,screenStatus}=await app.evaluate(async({app,desktopCapturer,systemPreferences,dialog,nativeImage},{origin,screenOnly,allowBoth})=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  const permissions=browser.permissions.conference;
  // Only the OS boundary is simulated. Chromium gets actual fake tracks and
  // the picker uses a synthetic list, without enumerating or capturing the Mac.
  permissions.system=()=> 'granted';
  if(screenOnly){
   const active=permissions.active.bind(permissions);
   permissions.active=tab=>active(tab);
  }
  const check=permissions.check.bind(permissions);
  permissions.testChecks=[];
  permissions.check=(wc,profileId,permission,origin,details)=>{
   const outcome=check(wc,profileId,permission,origin,details);
   if(permission!=='media')permissions.testChecks.push({permission,origin,details,outcome,wc:!!wc});
   return outcome;
  };
  const display=permissions.display.bind(permissions);
  permissions.display=async(profileId,request)=>{
   permissions.testDisplay={profileId,origin:request.securityOrigin,userGesture:request.userGesture,video:request.videoRequested,frame:!!request.frame,active:browser.active};
   try{
    const streams=await display(profileId,request);
    // Accept only the synthetic fixture's web frame as a source in this test.
    if(streams?.video?.id==='window:fixture')return {video:request.frame};
    return null;
   }catch(error){permissions.testDisplay.error=error.message;throw error;}
  };
  desktopCapturer.getSources=async({thumbnailSize})=>{
   if(thumbnailSize.width!==288||thumbnailSize.height!==324)throw Error('Expected bounded portrait thumbnails.');
   const thumbnail=(width,height,color)=>nativeImage.createFromBitmap(Buffer.alloc(width*height*4,Buffer.from([...color,255])),{width,height});
   return [
    {id:'screen:fixture',name:'Synthetic Display',thumbnail:thumbnail(288,162,[115,77,52])},
    {id:'screen:portrait',name:'Portrait Display',thumbnail:thumbnail(144,324,[101,124,102])},
    {id:'window:fixture',name:'Synthetic Call Window',thumbnail:thumbnail(288,162,[77,97,53])},
    {id:'window:square',name:'Square App Window',thumbnail:thumbnail(288,288,[109,83,112])},
    {id:'window:no-preview',name:'Minimized Window',thumbnail:nativeImage.createEmpty()},
   ];
  };
  const showMessageBox=dialog.showMessageBox;
  permissions.testPrompts=[];
  permissions.testRequests=[];
  const request=permissions.request.bind(permissions);
  permissions.request=(wc,profileId,details)=>{
   const row={main:details?.isMainFrame,mediaTypes:details?.mediaTypes??null,hasSecurityOrigin:!!details?.securityOrigin};
   permissions.testRequests.push(row);
   return request(wc,profileId,details).then(result=>{row.allowed=result;return result;});
  };
  dialog.showMessageBox=async(parent,options)=>{
   if(options.message==='Allow media access for '+origin+'?'){
    permissions.testEmbeddedChoices=options.buttons;
    return {response:allowBoth?3:1};
   }
   if(!options.message.startsWith('Allow a screen-sharing request from ')&&!options.message.startsWith('Allow '+origin+' to use your '))return showMessageBox(parent,options);
   permissions.testPrompts.push(options.message);
   await new Promise(resolve=>setTimeout(resolve,150));
   return {response:1};
  };
  const info=await browser.create(origin+'/conference-fixture');
  return {id:info.id,screenStatus:process.platform==='darwin'?systemPreferences.getMediaAccessStatus('screen'):null};
 },{origin,screenOnly,allowBoth});
 await shell.locator('[data-tab="'+id+'"]').click();
 const web=expression=>app.evaluate(({app},{id,expression,zoomWebSharing})=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  const wc=browser.get(id).view.webContents;
  const target=zoomWebSharing?wc.mainFrame.frames.find(frame=>new URL(frame.url).pathname==='/capture-frame'):wc;
  return target.executeJavaScript(expression,true);
 },{id,expression,zoomWebSharing});
 if(embeddedMedia){
  const control=`(()=>{const frame=document.querySelector('iframe'),node=frame.contentDocument.querySelector('#microphone');const box=node.getBoundingClientRect(),outer=frame.getBoundingClientRect();return {supported:node.constructor.name,x:outer.left+frame.clientLeft+box.left+box.width/2,y:outer.top+frame.clientTop+box.top+box.height/2,width:box.width,valid:node.isValid,invalidReason:node.invalidReason,status:node.permissionStatus};})()`;
  let point=await web(control);
  for(let i=0;i<50&&!point.valid;i++){await new Promise(resolve=>setTimeout(resolve,60));point=await web(control);}
  assert.equal(point.valid,true,JSON.stringify(point));
  assert.equal(point.supported,'HTMLUserMediaElement');
  assert.ok(point.width>0);
  await app.evaluate(async({app},{id,point})=>{
   const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents;
   wc.focus();
   for(const type of ['mouseMove','mouseDown','mouseUp'])wc.sendInputEvent({type,x:Math.round(point.x),y:Math.round(point.y),button:'left',clickCount:1});
  },{id,point});
  const outcome=await app.evaluate(async({app})=>{
   const permissions=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().permissions.conference;
   for(let i=0;i<100&&permissions.testRequests[0]?.allowed===undefined;i++)await new Promise(resolve=>setTimeout(resolve,30));
   return {requests:permissions.testRequests,choices:permissions.testEmbeddedChoices};
  });
  assert.deepEqual(outcome.requests[0],{main:false,mediaTypes:null,hasSecurityOrigin:false,allowed:allowBoth},JSON.stringify({point,outcome,after:await web(control)}));
  assert.deepEqual(outcome.choices,['Cancel','Allow microphone','Allow camera','Allow microphone and camera']);
  const grants=await shell.evaluate(()=>window.desktop.browser({action:'conference-site-list'}));
  const devices=allowBoth?['microphone','camera']:['microphone'];
  assert.deepEqual(grants.filter(row=>row.origin===origin),devices.map(kind=>({origin,kind,permission:'allow'})));
  if(!allowBoth){
   await app.evaluate(({app},id)=>{
    const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents;
    return new Promise(resolve=>{wc.once('did-finish-load',()=>resolve());wc.reload();});
   },id);
   assert.equal((await web(control)).status,'granted','the embedded microphone control sees the saved microphone-only choice after reload');
  }
  const capture=kind=>web(`(async()=>{const stream=await document.querySelector('iframe').contentWindow.navigator.mediaDevices.getUserMedia({${kind}:true});const track=stream.getTracks()[0];track.stop();return track.kind;})()`);
  assert.equal(await capture('audio'),'audio');
  if(allowBoth)assert.equal(await capture('video'),'video');
  assert.deepEqual(await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().permissions.conference.testPrompts),[],'Typed requests reuse the saved embedded permission.');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,embeddedMediaPrompt:true,devices,untypedCallbackAllowed:allowBoth,reloaded:!allowBoth,extraProteusPrompts:0}));
 }else if(!screenOnly){
  const reset=await shell.evaluate(()=>window.desktop.browser({action:'conference-site-list'}));
  assert.equal(reset.filter(item=>item.origin===origin).length,0);
  assert.deepEqual(await web(`(async()=>Promise.all(['microphone','camera'].map(async name=>(await navigator.permissions.query({name})).state)))()`),['prompt','prompt']);
  const tracks=await web(`(async()=>{
  const devices=await navigator.mediaDevices.enumerateDevices();
  if(!devices.some(device=>device.kind==='audioinput')||!devices.some(device=>device.kind==='videoinput'))throw Error('Devices missing before capture');
  const streams=await Promise.all([navigator.mediaDevices.getUserMedia({audio:true}),navigator.mediaDevices.getUserMedia({video:true})]);
  const tracks=streams.flatMap(stream=>stream.getTracks());
  tracks.forEach(track=>track.stop());
  return tracks.map(track=>track.kind).sort();
 })()`);
  assert.deepEqual(tracks,['audio','video']);
  const prompts=await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().permissions.conference.testPrompts);
  assert.deepEqual(prompts.sort(),['Allow '+origin+' to use your camera?','Allow '+origin+' to use your microphone?']);
  const grants=await shell.evaluate(()=>window.desktop.browser({action:'conference-site-list'}));
  assert.equal(grants.filter(item=>item.origin===origin&&item.permission==='allow').length,2);
  await shell.locator('#sidebar [data-page=engine]').click();
  await shell.locator('[data-engine-section=preferences]').click();
  await shell.getByRole('tab',{name:'Site Permissions',exact:true}).click();
  for(const kind of ['microphone','camera'])await media.getByRole('button',{name:'Remove '+kind+' permission for '+origin,exact:true}).waitFor();
  const remove=media.getByRole('button',{name:'Remove microphone permission for '+origin,exact:true});
  await remove.click();await remove.waitFor({state:'detached'});
  await shell.locator('[data-tab="'+id+'"]').click();
  assert.equal(await web(`navigator.permissions.query({name:'microphone'}).then(status=>status.state)`),'prompt');
  assert.equal(await web(`navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{const track=stream.getAudioTracks()[0];track.stop();return track.kind;})`),'audio');
  assert.equal(await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().permissions.conference.testPrompts.length),3);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,synthetic:true,sitePermissionUI:true,removeRestoresAsk:true,concurrentRequestsSaved:true,micAndCameraTracks:true}));
 }else{
 if(zoomWebSharing){
  const identity=await web(`({electron:/\\bElectron\\//i.test(navigator.userAgent)||!!window.process?.versions?.electron,chrome:/\\bChrome\\//i.test(navigator.userAgent),display:typeof navigator.mediaDevices?.getDisplayMedia,policy:document.featurePolicy.allowsFeature('display-capture')})`);
  assert.deepEqual(identity,{electron:false,chrome:true,display:'function',policy:true},'Zoom selects the web screen-sharing path inside the meeting frame.');
 }
 const opening=app.waitForEvent('window',{timeout:8000});
 let activation,request;
 const nativeBlocked=!chromiumDisplay;
 if(nativeBlocked){
  request=app.evaluate(({app},id)=>{
   const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
   const wc=browser.get(id).view.webContents;
   const request=()=>browser.permissions.conference.display('default',{frame:wc.mainFrame,securityOrigin:new URL(wc.getURL()).origin,videoRequested:true,userGesture:true});
   return browser.withTabWindow(browser.get(id),request).then(source=>source?.video?.id||null);
  },id);
 }else{
  activation=await web(`window.captureOutcome='pending';window.captureResult=navigator.mediaDevices.getDisplayMedia({video:true}).then(()=>window.captureOutcome='unexpected stream',error=>window.captureOutcome=error.name+': '+error.message);({active:navigator.userActivation.isActive,focused:document.hasFocus(),feature:document.featurePolicy.allowsFeature('display-capture')})`);
 }
 const picker=await opening.catch(async error=>{
  const outcome=await web('window.captureOutcome');
  const trace=await app.evaluate(({app})=>{
   const permissions=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().permissions.conference;
   return {display:permissions.testDisplay,checks:permissions.testChecks};
  });
  throw Error(JSON.stringify({activation,outcome,trace,screenStatus}),{cause:error});
 });
 await picker.getByRole('radio',{name:'Synthetic Display'}).waitFor();
 const previewSize=async name=>{
  const card=picker.locator('.option').filter({has:picker.getByRole('radio',{name,exact:true})});
  const image=card.locator('img');
  await image.scrollIntoViewIfNeeded();
  return image.evaluate(async image=>{
   await image.decode();
   const {width,height,top,bottom}=image.getBoundingClientRect();
   const frame=image.parentElement.getBoundingClientRect();
   if(top!==frame.top||bottom!==frame.bottom||getComputedStyle(image).objectFit!=='contain')throw Error('Preview must fit the whole image in its frame.');
   return {width,height};
  });
 };
 const landscape=await previewSize('Synthetic Display');
 const portrait=await previewSize('Portrait Display');
 const square=await previewSize('Square App Window');
 assert.ok(landscape.width>=180&&landscape.height>=100,JSON.stringify(landscape));
 assert.ok(Math.abs(portrait.width-landscape.width)<1&&Math.abs(square.width-landscape.width)<1);
 assert.ok(Math.abs(portrait.height-2*landscape.height)<1);
 assert.ok(Math.abs(square.height-square.width)<1);
 await picker.getByText('Preview unavailable',{exact:true}).waitFor();
 if(process.env.PROTEUS_TEST_SCREENSHOT){
  await picker.locator('main').evaluate(main=>{main.scrollTop=0;});
  await picker.screenshot({path:process.env.PROTEUS_TEST_SCREENSHOT});
 }
 assert.equal(await picker.getByRole('button',{name:'Share',exact:true}).isEnabled(),false);
 await picker.getByRole('searchbox').fill('Call Window');
 assert.equal(await picker.getByRole('radio',{name:'Synthetic Display'}).count(),0);
 await picker.getByRole('radio',{name:'Synthetic Call Window'}).check();
 assert.equal(await picker.getByRole('button',{name:'Share',exact:true}).isEnabled(),true);
 await picker.getByRole('button',{name:'Cancel',exact:true}).click();
 if(nativeBlocked)assert.equal(await request,null);
 else assert.match(await web('window.captureResult'),/^(NotAllowedError|AbortError)/);
 if(chromiumDisplay){
  const opened=app.waitForEvent('window',{timeout:8000});
  await web(`window.captureResult=navigator.mediaDevices.getDisplayMedia({video:true}).then(stream=>{
   const track=stream.getVideoTracks()[0],result=track?.readyState;stream.getTracks().forEach(item=>item.stop());return result;
  },error=>error.name+': '+error.message);true`);
  const selected=await opened;
  await selected.getByRole('radio',{name:'Synthetic Call Window'}).check();
  await selected.getByRole('button',{name:'Share',exact:true}).click();
  assert.equal(await web('window.captureResult'),'live');
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,screenChooser:true,sourcePreviews:true,explicitSelection:true,cancellation:true,chromiumDisplayRequest:chromiumDisplay,zoomWebSharing,liveSyntheticTrack:chromiumDisplay,screenStatus}));
 }
}finally{await app?.close().catch(()=>{});if(siteServer){siteServer.closeAllConnections();await new Promise(resolve=>siteServer.close(resolve));}await fixture.cleanup();}
