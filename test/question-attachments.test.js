import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Engine} from '../src/engine.js';
import {ChatAttachmentStore} from '../src/services/chats/chat-attachments.js';
import {ChatAttachmentConsents} from '../src/services/chats/chat-attachment-consent.js';
import {replyWithAttachments,questionAttachmentTools} from '../src/services/chats/question-attachments.js';
import {codexToolContent,mcpToolResult} from '../src/shared/tool-results.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==','base64');
const until=async fn=>{for(let index=0;index<200;index++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('Synthetic question did not settle.');};
for(const providerId of ['copilot','codex','claude'])test(providerId+' question reply carries consented image results and cannot cross chat/device or replay a different answer',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-question-')),store=new ChatAttachmentStore(home);
 let finish,answer,result,listed,page;const gate=new Promise(resolve=>finish=resolve),provider={async run({run,ask}){answer=await ask({type:'question',question:'Show the problem'});const tool=questionAttachmentTools(provider,run.id)[0],requestId=run.events.find(event=>event.data?.question).data.question.id;result=await tool.handler({requestId});assert.deepEqual(await tool.handler({requestId}),result);listed=JSON.parse(await tool.handler({requestId,action:'list'}));if(listed.files.length>1)page=JSON.parse(await tool.handler({requestId,action:'read',index:1,encoding:'base64'}));await gate;}};
 const engine=new Engine(home,{[providerId]:provider});engine.attachmentConsents=new ChatAttachmentConsents(store);provider.questionInputs=(id,requestId)=>engine.readQuestionAttachments(id,requestId);
 t.after(async()=>{finish();await engine.close();await store.close();fs.rmSync(home,{recursive:true,force:true});});
 const run=engine.createRun({schemaVersion:1,id:'question',name:'Synthetic question',enabled:false,provider:providerId,model:'fixture',workspace:{cwd:home,additionalDirectories:[]},cron:'0 9 * * 1-5',timezone:'UTC',misfire:'skip',prompt:'Synthetic test'},'chat');
 await until(()=>run.pending?.type==='question');const requestId=run.pending.id,owner={chatId:run.id,deviceId:'test-device',messageId:randomUUID(),providerId};
 const begun=await store.begin({...owner,name:'problem.png',mediaType:'image/png',size:png.length,sha256:createHash('sha256').update(png).digest('hex')});await store.chunk({uploadId:begun.uploadId,deviceId:owner.deviceId,index:0,dataBase64:png.toString('base64')});const file=await store.finish({uploadId:begun.uploadId,deviceId:owner.deviceId});
 const files=[file];
 if(providerId==='codex')for(let index=0;index<5;index++){
  const bytes=Buffer.from('%PDF-1.7\n% synthetic attachment '+index+'\n'+'x'.repeat(40000));
  const upload=await store.begin({...owner,name:'document-'+index+'.pdf',mediaType:'application/pdf',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  await store.chunk({uploadId:upload.uploadId,deviceId:owner.deviceId,index:0,dataBase64:bytes.toString('base64')});files.push(await store.finish({uploadId:upload.uploadId,deviceId:owner.deviceId}));
 }
 const consent=await engine.attachmentConsents.authorize({...owner,attachments:files,acceptedMediaTypes:['image/png']}),args={requestId,answer:'Inspect this',providerId,messageId:owner.messageId,attachments:files.map(file=>file.attachmentId),consentId:consent.consentId};
 await assert.rejects(replyWithAttachments(engine,run.id,args,'other-device'),/match|expired/);assert.ok(run.pending);
 await replyWithAttachments(engine,run.id,args,owner.deviceId);await until(()=>listed&&(providerId!=='codex'||page));
 assert.match(answer,/proteus_question_attachments/);assert.equal(result.binaryResultsForLlm[0].data,png.toString('base64'));
 if(providerId==='codex')assert.equal(codexToolContent(result)[1].type,'inputImage');else assert.equal(mcpToolResult(result).content[1].type,'image');
 if(providerId==='codex'){assert.equal(listed.files.length,6);assert.equal(page.nextOffset,32768);assert.ok(Buffer.from(page.content,'base64').toString().startsWith('%PDF-1.7\n% synthetic attachment 0'));assert.equal(result.binaryResultsForLlm.length,1,'Unsupported documents must not be mislabeled as images');}
 await replyWithAttachments(engine,run.id,args,owner.deviceId);assert.equal(run.events.filter(event=>event.data?.questionReply).length,1);
 await assert.rejects(replyWithAttachments(engine,run.id,{...args,answer:'Changed'},owner.deviceId),/different content/);
 await assert.rejects(engine.readQuestionAttachments('another-chat',requestId),/not found/);
 finish();await until(()=>run.status==='completed');assert.equal(engine.questionAttachmentCache.size,0);assert.equal(engine.attachmentConsents.prepared.size,0);await assert.rejects(engine.readQuestionAttachments(run.id,requestId),/not available/);
});

test('large question files expose metadata and bounded pages without reading the full body',async()=>{
 const file={name:'large.bin',mediaType:'application/octet-stream',size:2**32,sha256:'a'.repeat(64),get bytes(){throw Error('Full body must not be read');},readRange(offset,size){assert.ok(size<=32772);return Buffer.alloc(Math.min(size,2**32-offset),0xff);}};
 const tool=questionAttachmentTools({questionInputs:async()=>[file]},'chat')[0];
 const preview=await tool.handler({requestId:'question'});
 assert.equal(preview.binaryResultsForLlm?.length||0,0);
 assert.equal(JSON.parse(await tool.handler({requestId:'question',action:'list'})).files[0].size,2**32);
 const first=JSON.parse(await tool.handler({requestId:'question',action:'read',index:0,encoding:'base64'}));
 assert.equal(Buffer.from(first.content,'base64').length,32768);assert.equal(first.nextOffset,32768);
 await assert.rejects(tool.handler({requestId:'question',action:'read',index:1}),/current attachment/);
 await assert.rejects(tool.handler({requestId:'question',action:'read',index:0,encoding:'utf8'}),/binary/);
});
