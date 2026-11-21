import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {ScreenshotShare} from '../desktop/features/screenshot-share/bridge.cjs';

export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1YAAAAASUVORK5CYII=', 'base64');

test('Mac Share receives without a chat, deduplicates replay, keeps original bytes and rejects browser access', async () => {
  const updates = [];
  const share = new ScreenshotShare({thumbnail:()=> 'data:image/png;base64,'+png.toString('base64'),onChange:(items,received)=>updates.push({items,received})});
  const {version,port,token} = await share.start();
  const endpoint='http://127.0.0.1:'+port+'/screenshot';
  const authorization = 'Bearer '+token;
  const send=(id=randomUUID(),extra={},body=png)=>fetch(endpoint,{method:'POST',headers:{authorization,'x-proteus-screenshot':id,'content-type':'image/png',...extra},body});
  const id=randomUUID();
  try {
    assert.equal(version,2);
    assert.equal((await send(id,{authorization:''})).status,403);
    assert.equal((await send(id,{origin:'http://localhost'})).status,403);
    assert.equal((await send(id,{},Buffer.alloc(16))).status,422);
    assert.deepEqual(share.list(),[]);
    assert.deepEqual(await (await send(id)).json(),{received:true});
    assert.deepEqual(await (await send(id)).json(),{received:true});
    assert.equal(updates.length,1);
    assert.equal(updates[0].received,true);
    assert.equal(share.list()[0].id,id);
    assert.deepEqual(share.get(id).bytes,png);
    share.remove(id);
    assert.deepEqual(await (await send(id)).json(),{received:true});
    assert.deepEqual(share.list(),[]);
    assert.throws(()=>share.get(id),/no longer/);
    assert.equal(updates.at(-1).received,false);
  } finally { share.close(); }
});
