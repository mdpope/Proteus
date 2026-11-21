import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {PassThrough,Writable} from 'node:stream';import {createRequire} from 'node:module';
const {createNativeMessagingHost}=createRequire(import.meta.url)('../desktop/services/native-messaging-host.cjs');
function fixture({broken=false,timeoutMs=100,platform}={}){
 const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{child.kills=(child.kills||0)+1;};const written=[];child.stdin=new Writable({write(data,_encoding,callback){written.push(data);callback(broken?Object.assign(new Error('closed'),{code:'EPIPE'}):null);}});
 const sender={ipc:new EventEmitter(),sent:[],send(...args){this.sent.push(args);}};
 const calls={config:0,spawn:0};
 const Host=createNativeMessagingHost({readConfig:async()=>{calls.config++;return {path:process.execPath,allowed_origins:['chrome-extension://synthetic/']};},spawn:()=>{calls.spawn++;return child;},timeoutMs,platform});
 return {child,sender,written,Host,calls};
}
const frame=value=>{const data=Buffer.from(JSON.stringify(value)),out=Buffer.alloc(data.length+4);out.writeUInt32LE(data.length);data.copy(out,4);return out;};
test('native pipe EPIPE settles exactly once and late errors/writes cannot escape or queue',async()=>{const f=fixture({broken:true}),host=new f.Host('synthetic',f.sender,'pipe','test');host.send({hello:'世界'});await host.ready;await new Promise(r=>setImmediate(r));assert.equal(host.closed,true);assert.equal(f.sender.sent.length,1);f.child.stdin.emit('error',new Error('late'));f.child.emit('exit',1);host.send({late:true});assert.equal(f.sender.sent.length,1);assert.equal(host.pending.length,0);assert.equal(f.child.kills,1);assert.equal(f.written[0].readUInt32LE(),Buffer.byteLength(JSON.stringify({hello:'世界'})));});
test('native framing handles split headers, UTF8 and multiple messages',async()=>{const f=fixture(),host=new f.Host('synthetic',f.sender,'pipe','test');await host.ready;const data=Buffer.concat([frame({one:'é'}),frame({two:true})]);for(const chunk of [data.subarray(0,2),data.subarray(2,8),data.subarray(8)])f.child.stdout.write(chunk);assert.deepEqual(f.sender.sent.map(row=>row[1]),[{one:'é'},{two:true}]);host.destroy();});
test('one-shot native request disconnects after response and rejects missing or oversized replies',async()=>{const f=fixture(),host=new f.Host('synthetic',f.sender,'once','test',false);await host.ready;const answer=host.sendAndReceive({hello:1});f.child.stdout.write(frame({ready:true}));assert.deepEqual(await answer,{ready:true});assert.equal(host.closed,true);await assert.rejects(host.sendAndReceive({again:true}),/disconnected/);const timed=new f.Host('synthetic',f.sender,'timeout','test',false);await timed.ready;await assert.rejects(timed.sendAndReceive({hello:1}),/timed out/);});
test('macOS rejects the unsupported Apple Passwords helper before a native launch',async()=>{
 const f=fixture({platform:'darwin'});
 const port=new f.Host('synthetic',f.sender,'apple-port','com.apple.passwordmanager');
 await port.ready;
 assert.equal(port.failure.code,'APPLE_PASSWORDS_BROWSER_UNSUPPORTED');
 assert.deepEqual(f.sender.sent,[['crx-native-msg-apple-port-disconnect']]);
 const message=new f.Host('synthetic',f.sender,'apple-message','com.apple.passwordmanager',false);
 await message.ready;
 await assert.rejects(message.sendAndReceive({hello:true}),{code:'APPLE_PASSWORDS_BROWSER_UNSUPPORTED'});
 assert.deepEqual(f.calls,{config:0,spawn:0});
 assert.equal(f.sender.ipc.listenerCount('crx-native-msg-apple-port'),0);
 const other=new f.Host('synthetic',f.sender,'ordinary','com.example.passwordmanager');
 await other.ready;
 assert.equal(other.connected,true);
 assert.deepEqual(f.calls,{config:1,spawn:1});
 other.destroy();
});
