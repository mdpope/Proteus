import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionProvider } from '../src/session-provider.js';

test('independent chat adapters isolate steering, requests and cleanup', async () => {
  const instances=[];
  const provider=new SessionProvider(()=>{
    const adapter={closed:false,acceptedMediaTypes:['image/png'],status:async()=>({available:true}),
      run:({run,signal})=>new Promise(resolve=>{adapter.id=run.id;adapter.finish=resolve;signal.addEventListener('abort',resolve,{once:true});}),
      steer:async(run,prompt)=>{assert.equal(run.id,adapter.id);adapter.prompt=prompt;},
      mcpStatus:async run=>({id:run.id,adapterId:adapter.id}),
      close:async()=>{adapter.closed=true;adapter.finish?.();}};
    instances.push(adapter);return adapter;
  });
  const a={id:'a',providerSessionId:'session-a'}, b={id:'b',providerSessionId:'session-b'};
  const ca=new AbortController(),cb=new AbortController();
  const one=provider.run({run:a,signal:ca.signal}),two=provider.run({run:b,signal:cb.signal});
  assert.equal(provider.sessions.size,2);
  assert.notEqual(provider.sessions.get('a').adapter,provider.sessions.get('b').adapter);
  await provider.steer(b,'Only B');assert.equal(instances[1].prompt,undefined);assert.equal(instances[2].prompt,'Only B');
  assert.deepEqual(await provider.mcpStatus(a),{id:'a',adapterId:'a'});
  await assert.rejects(provider.run({run:{id:'c',providerSessionId:'session-a'},signal:new AbortController().signal}),/already/);
  ca.abort();await one;assert.equal(instances[1].closed,true);assert.equal(instances[2].closed,false);
  assert.equal(provider.sessions.size,1);await provider.close();await two;assert.equal(provider.sessions.size,0);
});

test('metadata has a separate runtime and idle probes close without leaving sessions', async()=>{
  let created=0,closed=0;
  const provider=new SessionProvider(()=>({id:++created,status:async()=>({available:true}),mcpStatus:async()=>({servers:[]}),close:async()=>closed++}));
  await provider.status();assert.equal(created,1);
  await provider.mcpStatus({id:'probe'});assert.equal(created,2);assert.equal(closed,1);assert.equal(provider.sessions.size,0);
  await provider.close();assert.equal(closed,2);
});
