import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ContentTabs,contentTabMembershipLimits} from '../src/services/workspaces/content-tabs.js';
import {fileStamp} from '../src/shared/file-stamp.js';
import {atomicJSON} from '../src/shared/files.js';
import {startServer} from '../src/server.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {cleanupStack} from './helpers/cleanup.js';

function fixture(t){const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-follow-membership-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return {home,tabs:new ContentTabs(home)};}
const browser=id=>({id,type:'browser',url:'https://example.test/',title:'Synthetic browser'});

test('membership lookups reuse identity only and detect external replacements without caching writes',t=>{
 const {home,tabs}=fixture(t);
 tabs.mutate({scope:'project',id:'p',expectedRevision:0,operations:[{action:'open',tab:browser('a')}]});
 const read=tabs.read.bind(tabs);let reads=0;tabs.read=()=>{reads++;return read();};
 for(let index=0;index<200;index++)assert.deepEqual(tabs.member('project','p','a'),{id:'a',type:'browser'});
 assert.equal(reads,1,'unchanged scrolling must not reread the tab registry');
 assert.equal(Object.isFrozen(tabs.member('project','p','a')),true);
 new ContentTabs(home).mutate({scope:'project',id:'p',expectedRevision:1,operations:[{action:'close',id:'a'},{action:'open',tab:browser('b')}]});
 assert.equal(tabs.member('project','p','a'),undefined);assert.equal(tabs.member('project','p','b').id,'b');assert.equal(reads,2);
 assert.throws(()=>tabs.mutate({scope:'project',id:'p',expectedRevision:1,operations:[{action:'close',id:'b'}]}),/changed/,'writes still read the current disk revision');
 assert.equal(reads,3);assert.equal(tabs.get('project','p').revision,2);
});

test('same-size in-place edits, corrupt files and deletion invalidate cached membership',t=>{
 const {tabs}=fixture(t);
 tabs.mutate({scope:'project',id:'p',expectedRevision:0,operations:[{action:'open',tab:browser('a')}]});
 assert.ok(tabs.member('project','p','a'));
 const before=fs.statSync(tabs.file),stamp=fileStamp([tabs.file]),bytes=fs.readFileSync(tabs.file,'utf8');
 fs.writeFileSync(tabs.file,bytes.replace('"id":"a"','"id":"b"'));fs.utimesSync(tabs.file,before.atime,before.mtime);
 assert.equal(fs.statSync(tabs.file).size,before.size);assert.notEqual(fileStamp([tabs.file]),stamp);
 assert.equal(tabs.member('project','p','a'),undefined);assert.ok(tabs.member('project','p','b'));
 fs.writeFileSync(tabs.file,'not JSON');assert.throws(()=>tabs.member('project','p','b'),/preserved/);
 fs.unlinkSync(tabs.file);assert.equal(tabs.member('project','p','b'),undefined);
 atomicJSON(tabs.file,{schemaVersion:1,scopes:{'project:p':{revision:3,tabs:[browser('c')]}}});assert.ok(tabs.member('project','p','c'));
});

test('membership cache bounds both scope count and retained tab identities',t=>{
 const {tabs}=fixture(t),scopes={};
 for(let index=0;index<10;index++)scopes['project:p'+index]={revision:1,tabs:Array.from({length:1000},(_,i)=>browser('tab'+i))};
 tabs.write({schemaVersion:1,scopes});
 for(let index=0;index<10;index++)assert.ok(tabs.member('project','p'+index,'tab0'));
 assert.ok(tabs.membershipCount<=contentTabMembershipLimits.tabs);assert.equal(tabs.memberships.has('project:p0'),false);
 for(let index=0;index<140;index++)assert.equal(tabs.member('project','empty'+index,'missing'),undefined);
 assert.equal(tabs.memberships.size,contentTabMembershipLimits.scopes);assert.equal(tabs.membershipCount,0);
});

test('owner follow hot path caches membership and scope checks but observes closure, deletion and current grants',async t=>{
 const cleanup=cleanupStack(t),home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-follow-owner-')),workspace=path.join(home,'workspace');cleanup(()=>fs.rmSync(home,{recursive:true,force:true}));fs.mkdirSync(workspace);
 atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}});
 const app=await startServer({home,port:0,timers:false,withSeed:false});cleanup(()=>app.close());
 app.workspaceProjects.projects({action:'create',workspaceId:'default',name:'Synthetic follow scope',expectedRevision:app.workspaceProjects.read().revision},app.engine);
 const project=app.workspaceProjects.read().projects.at(-1),scope={scope:'project',id:project.id,clientId:'fixture'};
 app.contentTabs.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:{id:'chat:c',type:'chat',chatId:'c'}}]});
 app.contentTabs.mutate({scope:'chat',id:'c',expectedRevision:0,operations:[{action:'open',tab:browser('child')}]});
 let reads=0,validations=0;const read=app.contentTabs.read.bind(app.contentTabs),snapshot=app.workspaceProjects.snapshot.bind(app.workspaceProjects);
 app.contentTabs.read=()=>{reads++;return read();};app.workspaceProjects.snapshot=()=>{validations++;return snapshot();};
 app.projectFollow.handle({...scope,action:'join'},'actor');
 for(let sequence=1;sequence<=200;sequence++)app.projectFollow.handle({...scope,action:'update',sequence,state:{tabId:'chat:c',childTabId:'child',positions:[{path:'root',top:sequence,left:0,x:0,y:.5}]}},'actor');
 assert.equal(reads,2,'200 nested updates read each required membership scope once');assert.equal(validations,1,'unchanged project/context files are validated once');
 app.contentTabs.mutate({scope:'chat',id:'c',expectedRevision:1,operations:[{action:'close',id:'child'}]});
 assert.throws(()=>app.projectFollow.handle({...scope,action:'update',sequence:201,state:{tabId:'chat:c',childTabId:'child'}},'actor'),/child no longer belongs/);
 const documentId='a'.repeat(64),doc={id:'document:'+documentId,type:'document',documentId,title:'Synthetic note'};
 app.contentTabs.mutate({...scope,expectedRevision:1,operations:[{action:'open',tab:doc}]});
 const peer={id:'peer',device:{id:'fixture-device'}};app.remote.config.devices.push({...peer.device,documentAccess:true});
 const command=args=>app.remote.command(peer,{method:'tabs.follow',args:{...scope,...args}});
 await command({action:'join'});await command({action:'update',sequence:1,state:{tabId:doc.id}});
 app.remote.config.devices[0].documentAccess=false;
 await assert.rejects(command({action:'update',sequence:2,state:{tabId:doc.id}}),/View chat documents/);
 assert.equal((await command({action:'join'})).state,null,'cached scope validation cannot bypass a revoked document grant');
 app.remote.config.devices=[];await assert.rejects(command({action:'join'}),/Unknown paired device/);
 app.projectFollow.removeActor('actor');assert.throws(()=>app.projectFollow.handle({...scope,action:'update',sequence:202,state:{tabId:'chat:c'}},'actor'),/Join/);
 app.projectFollow.handle({...scope,action:'join'},'actor');
 app.workspaceProjects.projects({action:'delete',projectId:project.id,expectedRevision:app.workspaceProjects.read().revision},app.engine);
 assert.throws(()=>app.projectFollow.handle({...scope,action:'update',sequence:203,state:{tabId:null}},'actor'),/unavailable/);
 const local={scope:'workspace',id:'default',clientId:'workspace'};app.projectFollow.handle({...local,action:'join'},'actor');
 const config=app.context.config();app.context.mutate(value=>{value.workspaces[0].id='replacement';value.defaultWorkspaceId='replacement';},config.revision);
 assert.throws(()=>app.projectFollow.handle({...local,action:'update',sequence:1,state:{tabId:null}},'actor'),/Workspace not found/);
});
