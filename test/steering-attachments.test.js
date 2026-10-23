import test from 'node:test';import assert from 'node:assert/strict';
import {CopilotProvider} from '../src/copilot.js';
test('Copilot immediate messages carry supported blobs without starting or replacing its session',async()=>{
 const provider=new CopilotProvider(),calls=[];provider.sessions.set('synthetic',{send:async args=>calls.push(args)});
 const bytes=Buffer.from('Synthetic PDF bytes');await provider.steer({id:'synthetic'},'Correction',[{name:'notes.pdf',mediaType:'application/pdf',bytes}]);
 assert.equal(calls.length,1);assert.equal(calls[0].mode,'immediate');assert.deepEqual(calls[0].attachments,[{type:'blob',data:bytes.toString('base64'),mimeType:'application/pdf',displayName:'notes.pdf'}]);
 await assert.rejects(provider.steer({id:'synthetic'},'Unsupported',[{name:'bad.zip',mediaType:'application/zip',bytes}]),/cannot receive/);assert.equal(calls.length,1);assert.equal(provider.sessions.size,1);
});
