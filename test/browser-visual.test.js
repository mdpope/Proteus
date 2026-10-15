import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {modelToolResult,codexToolContent,mcpToolResult} from '../src/tool-results.js';
const {validateCapture}=createRequire(import.meta.url)('../desktop/browser-visual.cjs');
test('coordinate observations reject changed navigation, scale, resize, expiry and out-of-bounds input',()=>{
 const viewport={width:800,height:600,dpr:2,url:'https://example.test'},capture={...viewport,id:'capture',at:1000,revision:3},value={captureId:'capture',x:30,y:40};
 assert.deepEqual(validateCapture(capture,value,viewport,{revision:3,now:2000}),{x:30,y:40});
 for(const [image,point,view,extra] of [[capture,{...value,captureId:'old'},viewport,{}],[capture,value,{...viewport,width:900},{}],[capture,value,{...viewport,dpr:1},{}],[capture,value,{...viewport,url:'https://other.test'},{}],[capture,value,viewport,{revision:4}],[capture,value,viewport,{now:62000}],[capture,{...value,x:-1},viewport,{}],[capture,{...value,y:600},viewport,{}]])assert.throws(()=>validateCapture(image,point,view,{revision:3,now:2000,...extra}));
});
test('image results stay images through Copilot, Codex and MCP instead of JSON text',()=>{
 const source={content:[{type:'text',text:'Capture metadata'},{type:'image',mimeType:'image/png',data:'aGVsbG8='}]},result=modelToolResult(source);
 assert.equal(result.textResultForLlm,'Capture metadata');assert.equal(result.binaryResultsForLlm[0].data,'aGVsbG8=');
 assert.deepEqual(codexToolContent(result),[{type:'inputText',text:'Capture metadata'},{type:'inputImage',imageUrl:'data:image/png;base64,aGVsbG8='}]);
 assert.deepEqual(mcpToolResult(result).content,source.content);assert.doesNotMatch(result.sessionLog,/aGVsbG8=/);
 assert.equal(modelToolResult({content:[{type:'image',mimeType:'text/html',data:'bad'}]}).binaryResultsForLlm,undefined);
});
