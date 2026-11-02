import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {bundlePreview,ChatPreviews,localPreviewURL} from '../src/services/chats/chat-previews.js';

test('project browser previews use their canonical tab without reviving chat children or bypassing profile denial',()=>{
 const source='http://127.0.0.1:5888/design/index.html',run={id:'chat',events:[{role:'assistant',text:source}]};
 const canonical={id:'project-browser',type:'browser',url:source,associationChatId:'chat'};
 const service={origin:'http://127.0.0.1:9999',workspaceProjects:{membership:()=>({projectId:'project'})},contentTabs:{get:scope=>({tabs:scope==='project'?[canonical,{id:'other-chat',type:'browser',url:'http://127.0.0.1:5888/other',associationChatId:'another'}]:[{id:'old-child',type:'browser',url:source}]})}};
 const previews=new ChatPreviews(service);assert.equal(previews.sources(run).length,1);assert.equal(previews.sources(run)[0].tabId,'project-browser');
 service.previewAllowed=tab=>tab.id!=='project-browser';assert.equal(previews.sources(run).length,0);
});

test('local preview bundles modules, CSS imports, images and fonts without forwarding arbitrary requests',async()=>{
 let color='lime',apiReads=0;
 const resources={
  '/design/index.html':()=>'<title>Local design</title><link rel="stylesheet" href="./style.css"><style>.inline{background:url(../image.png)}</style><button id="action">Review</button><img src="../image.png"><script type="module" src="./main.js"></script>',
  '/design/style.css':()=>`@import "./extra.css";body{color:${color}}@font-face{font-family:preview;src:url("../font.woff2")}`,
  '/design/extra.css':()=>'.extra{padding:7px}',
  '/design/main.js':()=>`import {message} from './part.js';document.querySelector('#action').onclick=()=>document.querySelector('#action').textContent=message;`,
  '/design/part.js':()=>`export const message='Updated design';`,
  '/image.png':()=>Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),
  '/font.woff2':()=>Buffer.from('synthetic font'),
  '/api/private.js':()=>{apiReads++;return 'private';}
 };
 const server=http.createServer((req,res)=>{const item=resources[req.url];if(!item){res.writeHead(404);res.end();return;}res.setHeader('content-type',req.url.endsWith('.html')?'text/html':req.url.endsWith('.css')?'text/css':req.url.endsWith('.js')?'application/javascript':req.url.endsWith('.png')?'image/png':'font/woff2');res.end(item());});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port,source=origin+'/design/index.html';
 try{
  const first=await bundlePreview(source);assert.equal(first.title,'Local design');assert.ok(first.content.includes('data:image/png;base64,'));assert.ok(first.content.includes('data:font/woff2'));assert.ok(first.content.includes('Updated design'));assert.ok(first.content.includes('padding: 7px'));assert.ok(!first.content.includes('src="./main.js"'));
  const run={id:'synthetic-chat',events:[]};const service={origin:'http://127.0.0.1:9999',url:'http://127.0.0.1:9999',contentTabs:{get:()=>({tabs:[{id:'original-browser',type:'browser',url:source}]})}};
  const previews=new ChatPreviews(service),listed=await previews.list(run);assert.equal(listed.previews.length,1);assert.equal(listed.previews[0].tabId,'original-browser');const id=listed.previews[0].documentId;assert.equal((await previews.read(run,id)).version,first.version);
  color='orange';for(const value of previews.cache.values())value.checkedAt=0;const updated=await previews.read(run,id);assert.equal(updated.documentId,id);assert.notEqual(updated.version,first.version);assert.ok(updated.content.includes('orange'));
  service.previewAllowed=()=>false;assert.equal((await previews.list(run)).previews.length,0);await assert.rejects(previews.read(run,id),/no longer linked/);
  assert.equal(localPreviewURL(source+'?token=secret'),null);assert.equal(localPreviewURL(source,{excludedOrigins:[origin]}),null);assert.equal(localPreviewURL('https://example.test/design'),null);
  resources['/design/main.js']=()=>`import x from '../api/private.js';console.log(x);`;await assert.rejects(bundlePreview(source),/selected design origin/);assert.equal(apiReads,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
