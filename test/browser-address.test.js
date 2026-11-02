import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {normalizeURL}=createRequire(import.meta.url)('../desktop/browser/browser-address.cjs');
const {browserErrorDocument}=createRequire(import.meta.url)('../desktop/browser/browser-error.cjs');
test('intranet hosts with ports are addresses while ordinary words remain searches',()=>{
 for(const value of ['consolefixture:8006','CONSOLEFIXTURE:8006/admin?q=1#node','localhost:4321','127.0.0.1:8443','[::1]:8443','router.lan:8006'])assert.equal(normalizeURL(value),new URL('https://'+value).href);
 assert.equal(normalizeURL('https://consolefixture:8006/'),'https://consolefixture:8006/');
 assert.equal(normalizeURL('http://consolefixture:8006/'),'http://consolefixture:8006/');
 assert.equal(normalizeURL('consolefixture'),'https://www.google.com/search?q=consolefixture');
 assert.equal(normalizeURL('release planning tips'),'https://www.google.com/search?q=release%20planning%20tips');
 for(const value of ['consolefixture:65536','consolefixture:99999','file:///private/a','javascript:alert(1)','mailto:person@example.test','proteus://pair?data=SECRET','/Users/private','token=SECRET','https://user:secret@consolefixture:8006'])assert.throws(()=>normalizeURL(value),undefined,value);
});
test('network errors preserve the port and use app colors without accepting CSS from input',()=>{
 const html=decodeURIComponent(browserErrorDocument('https://consolefixture:8006/','ERR_ADDRESS_UNREACHABLE',{palette:{background:'#ffffff',text:'#18251e',accent:'red;display:none'}}).split(',').slice(1).join(','));
 assert.match(html,/<strong>consolefixture:8006<\/strong>/);assert.match(html,/Network access unavailable/);assert.match(html,/Local Network/);assert.match(html,/color-scheme:light/);assert.match(html,/background:#ffffff/);assert.doesNotMatch(html,/display:none|prefers-color-scheme/);assert.doesNotMatch(html,/Accept certificate/);
});
test('bad-certificate details display only observed fields and escape certificate text',()=>{
 const html=decodeURIComponent(browserErrorDocument('https://consolefixture:8006/','ERR_CERT_AUTHORITY_INVALID',{certificateInformation:{subject:'CN=<script>alert(1)</script>',issuer:'Synthetic issuer',fingerprint:'AA:BB',secret:'not a certificate field'}}).split(',').slice(1).join(','));
 assert.match(html,/View certificate information/);assert.match(html,/CN=&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.match(html,/SHA-256 fingerprint/);assert.doesNotMatch(html,/<script>|not a certificate field|data-proteus-certificate-accept/);
});
