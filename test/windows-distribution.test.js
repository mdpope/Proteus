import test from 'node:test';
import assert from 'node:assert/strict';
import {findPublishedWindows} from '../scripts/windows-distribution.mjs';
const sourceCommit='a'.repeat(40),version='0.2.34',release={id:'synthetic',version,sourceCommit};
test('Windows builder reuses exactly matching releases and distinguishes absent source from catalog failures',async()=>{
 let calls=0;const feed={releases:async target=>{calls++;assert.deepEqual(target,{platform:'win32',arch:'x64',channel:'stable'});return [release];}},verify=value=>value;
 assert.equal((await findPublishedWindows({version,sourceCommit,feed,verify})).id,release.id);assert.equal(calls,1);
 assert.equal(await findPublishedWindows({version,sourceCommit:'b'.repeat(40),feed,verify}),null);
 await assert.rejects(findPublishedWindows({version,sourceCommit,feed:{releases:async()=>{throw Error('HTTP unavailable');}},verify}),/HTTP unavailable/);
 await assert.rejects(findPublishedWindows({version,sourceCommit,feed,verify:()=>{throw Error('Invalid signature');}}),/Invalid signature/);
 await assert.rejects(findPublishedWindows({version,sourceCommit,feed:{releases:async()=>[release,release]},verify}),/Multiple/);
});
