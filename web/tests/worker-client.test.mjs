import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserRemoteClient} from '../resources/js/worker-remote-client.js';
test('worker bridge preserves explicit retry envelopes and error codes, and closes uncertain calls without replay', async () => {
    const original=globalThis.Worker;let worker;
    globalThis.Worker=class {
        constructor(){worker=this;this.messages=[];}
        postMessage(message){this.messages.push(structuredClone(message));}
        terminate(){this.terminated=true;}
        respond(data){this.onmessage({data});}
    };
    try {
        const client=new BrowserRemoteClient({key:'synthetic'}),connected=client.connect();
        worker.respond({event:'status',status:'online',detail:'online'});
        worker.respond({id:1,result:true});await connected;
        const args={prompt:'original'},options={id:'stable',issuedAt:'original-time'};
        const pending=client.request('chat.send',args,options);args.prompt='edited';
        assert.deepEqual(worker.messages[1].args,['chat.send',{prompt:'original'},options]);
        worker.respond({id:2,error:{message:'busy',code:'REMOTE_BUSY'}});
        await assert.rejects(pending,{code:'REMOTE_BUSY'});
        const uncertain=client.request('chat.send',{prompt:'original'},options);client.close();
        await assert.rejects(uncertain,/uncertain/);assert.equal(worker.terminated,true);
        assert.equal(worker.messages.length,3);assert.equal(client.waiting.size,0);
    } finally {globalThis.Worker=original;}
});
