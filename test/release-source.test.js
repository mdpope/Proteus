import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {releaseSourceCommit} from '../scripts/release-source.mjs';

const commit='a'.repeat(40),digest=value=>createHash('sha256').update(value).digest('hex');
const source={gitHead:commit.slice(0,12),dirty:false,runtimeFiles:{'src/app.js':digest('app')},buildInputs:{'package.json':digest('package')}};
const git=(_command,args)=>args[0]==='rev-parse'?commit+'\n':Buffer.from(args[1].endsWith('src/app.js')?'app':'package');
test('a full publication pin requires matching runtime and build inputs',()=>{
 assert.equal(releaseSourceCommit(source,{commit,git}),commit);
 assert.throws(()=>releaseSourceCommit({...source,runtimeFiles:{'src/app.js':digest('other')}},{commit,git}),/differs from packaged input/);
 assert.throws(()=>releaseSourceCommit({...source,buildInputs:{}},{commit,git}),/no recorded buildInputs/);
});
test('publication rejects dirty, different or abbreviated source pins',()=>{
 for(const value of [{...source,dirty:true},{...source,gitHead:'b'.repeat(12)},{...source,sourceCommit:'b'.repeat(40)}])assert.throws(()=>releaseSourceCommit(value,{commit,git}),/does not match/);
 assert.throws(()=>releaseSourceCommit(source,{commit:commit.slice(0,12),git}),/does not match/);
 assert.throws(()=>releaseSourceCommit(source,{commit,git:()=> 'b'.repeat(40)}),/complete immutable/);
 assert.equal(releaseSourceCommit({sourceCommit:commit}),commit);
});
