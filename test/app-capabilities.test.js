import test from 'node:test';import assert from 'node:assert/strict';
import {captureAppCapabilities} from '../src/services/chats/app-capabilities.js';import {proteusOrientation} from '../public/shared/ui/proteus-orientation.js';import {appInstructions} from '../src/services/chats/document-tools.js';import {browserTools} from '../src/services/browser/browser-tools.js';import {codexToolContent,mcpToolResult,modelToolResult} from '../src/shared/tool-results.js';
test('required guidance stays independent of optional source selection and inventory distinguishes deferred/selected tools',()=>{
 assert.equal(appInstructions,proteusOrientation.text);assert.match(appInstructions,/workspace/i);assert.match(appInstructions,/question/i);
 const run={};let updates=0;captureAppCapabilities(run,[{name:'proteus_browser',description:'Browser',defer:'never'},{name:'proteus_developer',description:'Developer',defer:'auto'}],()=>updates++,['proteus_browser']);
 assert.equal(run.appCapabilities.core.required,true);assert.equal(updates,1);assert.equal(run.appCapabilities.tools[1].loading,'on-demand');assert.equal(run.appCapabilities.tools[1].enabledBySelection,false);
 assert.equal(run.appCapabilities.tools[0].registered,true);
});
test('all backends retain model-visible image contents without putting image bytes in activity summaries',async()=>{
 const result=modelToolResult({content:[{type:'text',text:'Viewport'},{type:'image',mimeType:'image/png',data:'aGVsbG8='}]});assert.equal(result.binaryResultsForLlm[0].type,'image');assert.ok(!result.sessionLog.includes('aGVsbG8='));
 assert.equal(codexToolContent(result)[1].type,'inputImage');assert.equal(mcpToolResult(result).content[1].type,'image');
 const tools=browserTools({agent:async()=>({content:[{type:'image',mimeType:'image/png',data:'aGVsbG8='}]}),manageTabs:async()=>({tabs:[]})},'run');assert.ok(tools.some(tool=>tool.name==='proteus_tabs'));assert.ok(tools.some(tool=>tool.name==='proteus_developer'&&tool.defer==='auto'));
 assert.equal((await tools.find(tool=>tool.name==='proteus_browser').handler({action:'screenshot'})).binaryResultsForLlm.length,1);
});
test('on-demand backend failures retain an actionable grant error rather than an opaque SDK exception',async()=>{
 const tools=browserTools({agent:async()=>{throw new Error('Enable Agent developer mode for this tab.');}},'run');
 const result=await tools.find(tool=>tool.name==='proteus_developer').handler({action:'list',tabId:'fixture'});assert.equal(result.resultType,'failure');assert.match(result.textResultForLlm,/Enable Agent developer mode/);
});
