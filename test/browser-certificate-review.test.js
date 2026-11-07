import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {rootCertificates} from 'node:tls';import {createRequire} from 'node:module';
const {BrowserCertificateReview}=createRequire(import.meta.url)('../desktop/browser/browser-certificate-review.cjs');
function fixture(){
 const tab={},wc=new EventEmitter(),navigations=[],browser={window:{},navigate:async(...args)=>navigations.push(args)};tab.id='tab';tab.view={webContents:wc};wc.session={};wc.isDestroyed=()=>false;wc.getURL=()=>tab.errorPage?.documentURL||'about:blank';
 const review=new BrowserCertificateReview(browser);review.bind(tab,wc);
 const fail=(url='https://consolefixture:8006/',certificate={data:rootCertificates[0]},main=true)=>{let accepted;wc.emit('certificate-error',{preventDefault(){}},url,'net::ERR_CERT_AUTHORITY_INVALID',certificate,value=>accepted=value,main);return accepted;};
 const page=url=>{tab.errorPage={url,documentURL:'data:text/html,error-'+url};return review.token(tab,url);};
 return {tab,wc,review,fail,page,navigations};
}
test('acceptance requires the exact blocked document and token; changed certificate, host or profile stays blocked',async()=>{
 const f=fixture();assert.equal(f.fail(),false);const token=f.page('https://consolefixture:8006/');assert.ok(token);
 assert.match(f.review.information(f.tab,'https://consolefixture:8006/').fingerprint,/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/);assert.equal(f.review.information(f.tab,'https://different/'),null);
 assert.equal(await f.review.accept(f.tab,token+'bad'),false);assert.equal(f.navigations.length,0);
 assert.equal(await f.review.accept(f.tab,token),true);assert.deepEqual(f.navigations,[['tab','https://consolefixture:8006/']]);
 assert.equal(f.fail(),true);assert.equal(f.fail('https://consolefixture:8007/'),true);assert.equal(f.fail('https://different:8006/'),false);assert.equal(f.fail(undefined,{data:rootCertificates[1]}),false);
 const sibling={};const wc=new EventEmitter();wc.session={};f.review.bind(sibling,wc);let accepted;wc.emit('certificate-error',{preventDefault(){}},'https://consolefixture:8006/','net::ERR_CERT_AUTHORITY_INVALID',{data:rootCertificates[0]},value=>accepted=value,true);assert.equal(accepted,false);
});
test('subframes, replaced error documents and other frame senders grant nothing',async()=>{
 const subframe=fixture();subframe.fail(undefined,undefined,false);assert.equal(subframe.page('https://consolefixture:8006/'),null);
 const stale=fixture();stale.fail();const token=stale.page('https://consolefixture:8006/');stale.tab.errorPage={url:'https://different/',documentURL:'data:text/html,replaced'};assert.equal(await stale.review.accept(stale.tab,token),false);assert.equal(stale.fail(),false);assert.equal(stale.navigations.length,0);
 const f=fixture();f.wc.mainFrame={};f.fail();const current=f.page('https://consolefixture:8006/');f.wc.emit('ipc-message',{senderFrame:{}},'proteus:certificate-accept',current);assert.equal(f.navigations.length,0);
 f.wc.emit('ipc-message',{senderFrame:f.wc.mainFrame},'proteus:certificate-accept',current);await Promise.resolve();assert.equal(f.navigations.length,1);
});

test('secure WebSocket certificate reuse requires prior explicit HTTPS acceptance of the same certificate and host',async()=>{
 const f=fixture(),socket='wss://consolefixture:8006/console';assert.equal(f.fail(socket,undefined,false),false);assert.equal(f.page(socket),null);
 f.fail();const token=f.page('https://consolefixture:8006/');await f.review.accept(f.tab,token);
 assert.equal(f.fail(socket,undefined,false),true);
 assert.equal(f.fail(socket,{data:rootCertificates[1]},false),false);
 assert.equal(f.fail('wss://different:8006/console',undefined,false),false);
 assert.equal(f.fail('ws://consolefixture:8006/console',undefined,false),false);
});
