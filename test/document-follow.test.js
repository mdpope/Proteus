import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';
import {normalizeFollowState} from '../src/project-follow.js';

const version='a'.repeat(64),otherVersion='b'.repeat(64),nativeVersion='c'.repeat(64);
const positions=[{path:'root',top:640,left:0,x:0,y:.5}];
const tab={id:'document:host:chat:report',type:'remote-document',hostId:'host',runId:'chat',documentId:'report',label:'Report'};
const copy=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
const waitFor=async condition=>{for(let attempt=0;attempt<100;attempt++){if(condition())return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('Document follow checkpoint timed out.');};

// Run the real renderer module; the DOM fixture supplies only its preview controls.
// Native isolation and layout are exercised separately by the Electron UI tests.
function renderer({peer,artifact,digest}={}){
  const calls=[],requests=[],timers=[],errors=[];
  const element=()=>({innerHTML:'',textContent:'',hidden:false,isConnected:true,append(){},getBoundingClientRect:()=>({x:1,y:2,width:400,height:300})});
  const elements=new Map(['main','peer-document-status','peer-document-body','peer-artifact-area','peer-artifact-source','peer-artifact-scripts','peer-document-links','peer-document-request','peer-document-refresh','peer-document-again'].map(id=>['#'+id,element()]));
  const state={tab:tab.id,tabs:[tab]};
  const sandbox={
    window:{desktop:{
      artifactPreview:async value=>{calls.push(copy(value));return artifact?artifact(value):{applied:true};},
      peers:async value=>{requests.push(copy(value));assert.ok(peer,'Following must not create an access request.');return peer(value);}
    }},
    document:{querySelector:selector=>elements.get(selector),createElement:element},
    DOMParser:class {parseFromString(content){return {querySelectorAll:()=>[],documentElement:{outerHTML:content}};}},
    crypto:digest?{subtle:{digest},randomUUID:()=>webcrypto.randomUUID()}:webcrypto,TextEncoder,Uint8Array,
    console:{debug:(...value)=>errors.push(value.join(' '))},
    setTimeout:callback=>{timers.push(callback);return timers.length;},clearTimeout(){},setInterval(){},clearInterval(){},
    fileDatesText:()=>'',
  };
  vm.createContext(sandbox);
  const source=fs.readFileSync(new URL('../public/remote-desktops.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
  vm.runInContext(source+'\nglobalThis.documentFollow={documentViews,remoteDocumentPositionVersion,restoreRemoteDocumentPosition,applyPendingDocumentPosition,renderRemoteDocument,forgetRemoteDocument,setUI:value=>ui=value};',sandbox);
  const api=sandbox.documentFollow;
  api.setUI({state,escape:value=>String(value),toast:error=>errors.push(error)});
  return {...api,state,calls,requests,timers,errors,elements};
}

test('document following accepts only a bounded version identity and numeric positions',()=>{
  const value=normalizeFollowState({tabId:'document:report',documentVersion:version,positions,documentPositions:[{...positions[0],html:'secret',script:'alert(1)'}],html:'private content',cookies:'private cookie',enabled:true,approved:true,requestId:'private request'});
  assert.deepEqual(value,{tabId:'document:report',documentVersion:version,positions,documentPositions:positions});
  for(const documentVersion of ['',version.toUpperCase(),version+'a','<script>',42,null])assert.throws(()=>normalizeFollowState({tabId:'document:report',documentVersion}),/document position version/);
  assert.throws(()=>normalizeFollowState({tabId:'document:report',documentPositions:positions}),/require an approved version/);
  for(const key of ['positions','documentPositions']){
    assert.throws(()=>normalizeFollowState({tabId:'document:report',documentVersion:version,[key]:Array(25).fill(positions[0])}),/Too many scroll positions/);
    assert.throws(()=>normalizeFollowState({tabId:'document:report',documentVersion:version,[key]:[{...positions[0],path:'body script'}]}),/Invalid scroll target/);
    assert.throws(()=>normalizeFollowState({tabId:'document:report',documentVersion:version,[key]:[{...positions[0],top:Infinity}]}),/Invalid scroll position/);
  }
  assert.throws(()=>normalizeFollowState({tabId:'document:report',documentVersion:version,documentPositions:positions,html:'x'.repeat(8192)}),/Invalid follow state/);
});

test('native artifact observations map only the current rendered HTML hash to its approved document version',()=>{
  const ui=renderer();
  ui.documentViews.set(tab.id,{mediaType:'text/html',version,previewVersion:nativeVersion});
  assert.equal(ui.remoteDocumentPositionVersion(tab.id,nativeVersion),version);
  assert.equal(ui.remoteDocumentPositionVersion(tab.id),version);
  assert.equal(ui.remoteDocumentPositionVersion(tab.id,otherVersion),null);
  assert.equal(ui.remoteDocumentPositionVersion('another-tab',nativeVersion),null);
  ui.documentViews.set(tab.id,{mediaType:'text/markdown',version,previewVersion:nativeVersion});
  assert.equal(ui.remoteDocumentPositionVersion(tab.id,nativeVersion),null);
  ui.documentViews.set(tab.id,{version,requestId:'pending'});
  assert.equal(ui.remoteDocumentPositionVersion(tab.id,nativeVersion),null);
  assert.deepEqual(ui.calls,[]);
});

test('following an unapproved document does not request access, fetch content or enable scripts',async()=>{
  const ui=renderer();
  ui.restoreRemoteDocumentPosition(tab.id,version,positions,()=>true);
  await ui.renderRemoteDocument(tab);
  assert.equal(typeof ui.elements.get('#peer-document-request').onclick,'function','a separate human request remains available');
  assert.match(ui.elements.get('#peer-document-status').textContent,/Request this linked document again/);
  assert.deepEqual(ui.requests,[]);
  assert.deepEqual(ui.calls,[{action:'hide'}]);
});

test('a pending position waits for exact-version approval and uses the prepared HTML hash without enabling scripts',async()=>{
  const read=deferred(),content='<html><body>Approved report</body></html>';
  const ui=renderer({peer:value=>{
    if(value.method==='chat.documents.status')return {status:'approved'};
    assert.equal(value.method,'chat.documents.read');return read.promise;
  }});
  ui.documentViews.set(tab.id,{requestId:'existing-request',version,enabled:false});
  ui.restoreRemoteDocumentPosition(tab.id,version,positions,()=>ui.state.tab===tab.id);
  await ui.renderRemoteDocument(tab);
  await waitFor(()=>ui.requests.length===2);
  assert.deepEqual(ui.calls,[{action:'hide'}],'approval/content pending cannot scroll an old native view');
  read.resolve({documentId:tab.documentId,version,mediaType:'text/html',content,assets:[],links:[]});
  await waitFor(()=>ui.calls.some(value=>value.action==='follow-scroll'));
  const renderedVersion=createHash('sha256').update('<!doctype html>'+content).digest('hex');
  assert.deepEqual(ui.requests.map(value=>value.method),['chat.documents.status','chat.documents.read']);
  const show=ui.calls.find(value=>value.action==='show');
  assert.equal(show.enabled,false);
  assert.equal(ui.documentViews.get(tab.id).enabled,false);
  assert.equal(show.version,renderedVersion);
  assert.deepEqual(ui.calls.at(-1),{action:'follow-scroll',tabId:tab.id,version:renderedVersion,positions});
  assert.equal(ui.remoteDocumentPositionVersion(tab.id,renderedVersion),version);
  assert.deepEqual(ui.errors,[]);
});

test('a changed document returned after approval cannot render or consume a pending position',async()=>{
  const ui=renderer({peer:value=>value.method==='chat.documents.status'?{status:'approved'}:{documentId:tab.documentId,version:otherVersion,mediaType:'text/html',content:'changed'}});
  ui.documentViews.set(tab.id,{requestId:'existing-request',version,enabled:false});
  ui.restoreRemoteDocumentPosition(tab.id,version,positions,()=>true);
  await ui.renderRemoteDocument(tab);
  await waitFor(()=>/version changed/.test(ui.elements.get('#peer-document-status').textContent));
  assert.deepEqual(ui.calls,[{action:'hide'}]);
  assert.equal(ui.remoteDocumentPositionVersion(tab.id,nativeVersion),null);
});

test('a late approval read after the active tab changes cannot render or restore the old document',async()=>{
  const read=deferred();
  const ui=renderer({peer:value=>value.method==='chat.documents.status'?{status:'approved'}:read.promise});
  ui.documentViews.set(tab.id,{requestId:'existing-request',version,enabled:false});
  ui.restoreRemoteDocumentPosition(tab.id,version,positions,()=>ui.state.tab===tab.id);
  await ui.renderRemoteDocument(tab);
  await waitFor(()=>ui.requests.length===2);
  ui.state.tab='another-tab';
  read.resolve({documentId:tab.documentId,version,mediaType:'text/html',content:'approved'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(ui.calls,[{action:'hide'}]);
  assert.equal(ui.documentViews.get(tab.id).mediaType,undefined);
});

test('switching tabs while approved HTML is prepared cannot show a stale native artifact',async()=>{
  const entered=deferred(),finish=deferred();
  const ui=renderer({
    peer:value=>value.method==='chat.documents.status'?{status:'approved'}:{documentId:tab.documentId,version,mediaType:'text/html',content:'approved'},
    digest:()=>{entered.resolve();return finish.promise;},
  });
  ui.documentViews.set(tab.id,{requestId:'existing-request',version,enabled:false});
  ui.restoreRemoteDocumentPosition(tab.id,version,positions,()=>ui.state.tab===tab.id);
  await ui.renderRemoteDocument(tab);
  await entered.promise;
  ui.state.tab='another-tab';finish.resolve(Buffer.from(nativeVersion,'hex'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(ui.calls,[{action:'hide'}],'an inactive view cannot display over the newer tab after async preparation');
});

test('mismatched versions, expired selection, cancellation and closed tabs reject a delayed restore',async()=>{
  for(const scenario of ['version','inactive','cancelled','closed']){
    const ui=renderer();let current=true;
    const cancel=ui.restoreRemoteDocumentPosition(tab.id,version,positions,()=>current);
    ui.documentViews.set(tab.id,{mediaType:'text/html',version:scenario==='version'?otherVersion:version,previewVersion:nativeVersion,enabled:false});
    if(scenario==='inactive')current=false;
    if(scenario==='cancelled')cancel();
    if(scenario==='closed'){
      ui.forgetRemoteDocument(tab.id);
      ui.documentViews.set(tab.id,{mediaType:'text/html',version,previewVersion:nativeVersion,enabled:false});
    }
    await ui.applyPendingDocumentPosition(tab.id);
    assert.equal(ui.calls.filter(value=>value.action==='follow-scroll').length,0,scenario);
    assert.deepEqual(ui.requests,[]);
  }
});

test('completion of an older native restore cannot discard a newer pending document position',async()=>{
  const first=deferred();let restores=0;
  const ui=renderer({artifact:value=>value.action==='follow-scroll'&&++restores===1?first.promise:{applied:true}});
  ui.documentViews.set(tab.id,{mediaType:'text/html',version,previewVersion:nativeVersion,enabled:false});
  const cancelFirst=ui.restoreRemoteDocumentPosition(tab.id,version,positions,()=>true);
  const nextPositions=[{...positions[0],top:900,y:.7}];
  ui.restoreRemoteDocumentPosition(tab.id,otherVersion,nextPositions,()=>true);
  cancelFirst();first.resolve({applied:true});
  await new Promise(resolve=>setImmediate(resolve));
  ui.documentViews.set(tab.id,{mediaType:'text/html',version:otherVersion,previewVersion:'d'.repeat(64),enabled:false});
  await ui.applyPendingDocumentPosition(tab.id);
  assert.deepEqual(ui.calls.filter(value=>value.action==='follow-scroll').map(value=>value.positions),[positions,nextPositions]);
});
