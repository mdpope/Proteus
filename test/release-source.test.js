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

test('Windows full commit provenance needs no synthetic gitHead but still verifies every input',()=>{
 const native={...source,platform:'win32',arch:'x64',sourceCommit:commit};delete native.gitHead;delete native.dirty;
 assert.equal(releaseSourceCommit(native,{commit,git}),commit);
 for(const changed of [{...native,sourceCommit:'b'.repeat(40)},{...native,dirty:true},{...native,platform:'linux'},{...native,runtimeFiles:{'src/app.js':digest('modified')}}])assert.throws(()=>releaseSourceCommit(changed,{commit,git}));
});
test('Windows source qualification accepts only exact LF/CRLF byte alternatives',()=>{
 const native={...source,platform:'win32',arch:'x64',sourceCommit:commit,runtimeFiles:{'src/app.js':digest('line\r\nnext\r\n')}};
 const read=(_command,args)=>args[0]==='rev-parse'?commit+'\n':Buffer.from(args[1].endsWith('src/app.js')?'line\nnext\n':'package');
 assert.equal(releaseSourceCommit(native,{commit,git:read}),commit);
 assert.throws(()=>releaseSourceCommit({...native,platform:'darwin'},{commit,git:read}));
 assert.throws(()=>releaseSourceCommit({...native,runtimeFiles:{'src/app.js':digest('changed\r\nnext\r\n')}},{commit,git:read}));
 const binaryRead=(_command,args)=>args[0]==='rev-parse'?commit+'\n':Buffer.from('line\n\0');
 assert.throws(()=>releaseSourceCommit({...native,runtimeFiles:{'src/app.js':digest('line\r\n\0')}},{commit,git:binaryRead}));
});
test('only the named generated Windows helper is qualified by bound compiler/source/output evidence',()=>{
 const helper='desktop/terminal/windows-terminal-guardian.exe',cs='native/windows-terminal/guardian.cs',recipes=['scripts/package-windows.mjs','scripts/build-windows-terminal-guardian.mjs','scripts/prepare-windows-terminal.mjs'];
 const native={platform:'win32',arch:'x64',sourceCommit:commit,runtimeFiles:{[helper]:digest('binary')},buildInputs:Object.fromEntries([cs,...recipes].map(n=>[n,digest('recipe')]))};
 const read=(_command,args)=>args[0]==='rev-parse'?commit+'\n':Buffer.from('recipe');
 const proof={output:helper,testOnlyJobFailureSeam:false,helperSha256:digest('binary'),sourceSha256:digest('recipe'),compilerSha256:digest('compiler')};
 const opts={commit,git:read,compilerHash:digest('compiler'),windowsTerminalBuild:proof};
 assert.equal(releaseSourceCommit(native,opts),commit);
 for(const change of [{testOnlyJobFailureSeam:true},{helperSha256:digest('changed')},{sourceSha256:digest('changed')},{compilerSha256:digest('changed')},{output:'other.exe'}])assert.throws(()=>releaseSourceCommit(native,{...opts,windowsTerminalBuild:{...proof,...change}}),/verified compiler/);
 assert.throws(()=>releaseSourceCommit(native,{commit,git:read}),/verified compiler/);
 const missingSource={...native,buildInputs:{...native.buildInputs}};delete missingSource.buildInputs[cs];
 assert.throws(()=>releaseSourceCommit(missingSource,{...opts,windowsTerminalBuild:{...proof,sourceSha256:undefined}}),/verified compiler/);
 const bad={...native,buildInputs:{...native.buildInputs,[cs]:digest('changed')}};
 assert.throws(()=>releaseSourceCommit(bad,{...opts,windowsTerminalBuild:{...proof,sourceSha256:digest('changed')}}),/differs from packaged input/);
 assert.throws(()=>releaseSourceCommit({...native,runtimeFiles:{'desktop/other.exe':digest('binary')}},opts),/differs from packaged input/);
});
