import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {LifeHome,homeOrigin} from '../src/services/life/life-home.js';
import {createHash} from 'node:crypto';
function fixture(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-home-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 let identity={accountId:'a'.repeat(64),sessionId:'1'},stored=null,state='off',writes=0,drop=false;
 const extra=[],services=[{domain:'light',services:{turn_on:{target:{},fields:{brightness:{}}},turn_off:{target:{}}}},{domain:'lock',services:{unlock:{target:{}}}}];
 const requests=[],life={requireEnabled(){},api:{identity:()=>identity,assertIdentity:value=>assert.deepEqual(value,identity)}};
 const fetch=async(url,options)=>{requests.push({url,options});assert.equal(options.redirect,'error');const entity={entity_id:'light.office',state,attributes:{friendly_name:'Office',access_token:'never-export',entity_picture:'/image?token=secret'}};
  if(options.method==='POST'){writes++;state=JSON.parse(options.body).entity_id?.includes('light.office')?(url.endsWith('turn_on')?'on':'off'):state;if(drop)throw Error('lost response');return Response.json([]);}
  if(url.endsWith('/services'))return Response.json(services);
  if(url.endsWith('/states'))return Response.json([entity,{entity_id:'lock.front',state:'locked',attributes:{friendly_name:'Door'}},...extra]);
  if(url.endsWith('/states/lock.front'))return Response.json({entity_id:'lock.front',state:'unlocked',attributes:{friendly_name:'Door'}});
  return Response.json(entity);
 };
 const vault={load:()=>stored,save:value=>stored=value,clear:()=>stored=null},service=new LifeHome(life,{home,vault,fetch});
 return {service,requests,extra,services,identity:()=>identity,switch:()=>identity={accountId:'b'.repeat(64),sessionId:'2'},writes:()=>writes,drop:()=>drop=true,state:value=>state=value,vault,home};
}
async function connect(f){const view=await f.service.view();return f.service.configure({accountId:view.accountId,expectedRevision:view.revision,origin:'http://automation.example.test:8123',token:'synthetic-token-000000000000000',entities:['light.office']});}
const command=view=>({accountId:view.accountId,expectedRevision:view.revision,entityId:'light.office',service:'turn_on',operationId:randomUUID()});
test('connection returns only safe entity fields and requires exact account and origin',async t=>{
 const f=fixture(t),view=await connect(f);assert.equal(view.configured,true);assert.deepEqual(view.allowed,['light.office','lock.front']);assert.equal(view.entities.length,2);assert.equal(view.services.length,3);assert.doesNotMatch(JSON.stringify(view),/token|secret|entity_picture/);
 assert.throws(()=>homeOrigin('http://user:pass@example.test'),/origin/);assert.throws(()=>homeOrigin('http://example.test/path'),/origin/);
 await assert.rejects(f.service.configure({...view,accountId:view.accountId,expectedRevision:view.revision,origin:'http://other.test',entities:[]}),/new token/);
 assert.equal(f.writes(),0);
});
test('native commands verify state, replay exactly once and reject changed operation identity',async t=>{
 const f=fixture(t),view=await connect(f),args=command(view);const [a,b]=await Promise.all([f.service.execute(args),f.service.execute(args)]);assert.deepEqual(a,b);assert.equal(a.confirmed,true);assert.equal(a.state,'on');assert.equal(f.writes(),1);
 await assert.rejects(f.service.execute({...args,service:'turn_off'}),/different device command/);
 await assert.rejects(f.service.execute({...args,operationId:randomUUID(),service:'toggle'}),/no longer exposed/);
});
test('lost service response reconciles by observation without replay, including owner restart',async t=>{
 const f=fixture(t),view=await connect(f),args=command(view);f.drop();await assert.rejects(f.service.execute(args),/may have taken effect/);assert.equal(f.writes(),1);
 const result=await f.service.execute(args);assert.equal(result.state,'on');assert.equal(f.writes(),1);
});
test('uncertain command with a mismatching observed state never retries the POST',async t=>{
 const f=fixture(t),view=await connect(f),args=command(view);f.drop();await assert.rejects(f.service.execute(args));f.state('off');await assert.rejects(f.service.execute(args),/not confirmed/);assert.equal(f.writes(),1);
});
test('account switches cannot read old configuration or execute captured requests',async t=>{
 const f=fixture(t),view=await connect(f),args=command(view);f.switch();const next=await f.service.view();assert.equal(next.configured,false);assert.equal(next.origin,'');assert.deepEqual(next.allowed,[]);await assert.rejects(f.service.execute(args),/Life account/);assert.equal(f.writes(),0);
});
test('disconnected settings reject even an accepted request replay',async t=>{
 const f=fixture(t),view=await connect(f),args=command(view);await f.service.execute(args);await f.service.disconnect({accountId:view.accountId,expectedRevision:view.revision});await assert.rejects(f.service.execute(args),/Connect Home Assistant/);assert.equal(f.writes(),1);
});
test('new services and devices appear without configuration edits',async t=>{
 const f=fixture(t),view=await connect(f);f.extra.push({entity_id:'climate.new_room',state:'heat',attributes:{friendly_name:'New room'}});f.services.push({domain:'climate',services:{set_temperature:{target:{},fields:{temperature:{required:true}}}}});
 const next=await f.service.view({refresh:true});assert.equal(next.revision,view.revision);assert.ok(next.entities.some(row=>row.id==='climate.new_room'));assert.ok(next.services.some(row=>row.service==='set_temperature'));assert.ok((await f.service.context()).entities.some(row=>row.id==='climate.new_room'));
});
test('all exposed domains work, acknowledgement is distinct from physical confirmation',async t=>{
 const f=fixture(t),view=await connect(f),args={...command(view),entityId:'lock.front',service:'unlock'};
 const result=await f.service.execute(args);assert.equal(result.accepted,true);assert.equal(result.confirmed,false);assert.match(result.answer,/accepted lock.unlock/);await f.service.execute(args);assert.equal(f.writes(),1);
});
test('uncertain non-state service is never sent a second time',async t=>{
 const f=fixture(t),view=await connect(f),args={...command(view),entityId:'lock.front',service:'unlock'};f.drop();await assert.rejects(f.service.execute(args),/may have taken effect/);await assert.rejects(f.service.execute(args),/will not send it again/);assert.equal(f.writes(),1);
});
test('reject absent targets, services, injected targets and missing required fields before writing',async t=>{
 const f=fixture(t),view=await connect(f);
 for(const change of [{entityId:'lock.missing',service:'unlock'},{domain:'light',entityId:undefined,entityIds:[]},{data:{entity_id:'all'}},{domain:'light/../../states'}])await assert.rejects(f.service.execute({...command(view),...change}));
 f.services[0].services.set_level={target:{},fields:{level:{required:true}}};await assert.rejects(f.service.execute({...command(view),service:'set_level'}),/requires level/);assert.equal(f.writes(),0);
});
test('service parameters participate in retry identity with stable object ordering',async t=>{
 const f=fixture(t),view=await connect(f),args={...command(view),data:{brightness:30,transition:2}};await f.service.execute(args);await f.service.execute({...args,data:{transition:2,brightness:30}});await assert.rejects(f.service.execute({...args,data:{brightness:31,transition:2}}),/different device command/);assert.equal(f.writes(),1);
});
test('voice requests use saved native controls without generic agent authorization or private notes filing',async t=>{
 const f=fixture(t),view=await connect(f),context=await f.service.context();const receipt={accountID:view.accountId,requestId:randomUUID()};const result=await f.service.voice(receipt,{kind:'home',professional:false,home:{entityId:'light.office',service:'turn_on'}},context);assert.equal(result.answer,'Office is on.');assert.equal(result.savedPath,null);assert.equal(f.writes(),1);
});
test('legacy target fields accept explicit entities and old accepted receipts never replay',async t=>{
 const f=fixture(t),view=await connect(f),args=command(view);
 f.services[0].services.turn_on.fields.entity_id={required:true};
 const result=await f.service.execute(args);assert.equal(f.writes(),1);
 const file=path.join(f.home,'life','home-assistant','operations',view.accountId,args.operationId+'.json');
 const receipt=JSON.parse(fs.readFileSync(file));receipt.digest=createHash('sha256').update(JSON.stringify([view.accountId,view.origin,args.entityId,args.service])).digest('hex');fs.writeFileSync(file,JSON.stringify(receipt));
 assert.deepEqual(await f.service.execute(args),result);assert.equal(f.writes(),1);
});
test('services that require an API response opt in without exporting raw response data',async t=>{
 const f=fixture(t),view=await connect(f);f.services.push({domain:'calendar',services:{get_events:{response:{optional:false}}}});
 await f.service.execute({...command(view),entityId:undefined,entityIds:[],domain:'calendar',service:'get_events'});
 assert.ok(f.requests.some(row=>row.options.method==='POST'&&row.url.endsWith('/calendar/get_events?return_response')));assert.equal(f.writes(),1);
});
test('an exposed service may define a target parameter without granting implicit entity targeting',async t=>{
 const f=fixture(t),view=await connect(f);f.services.push({domain:'notify',services:{synthetic:{fields:{target:{required:true},message:{required:true}}}}});
 await f.service.execute({...command(view),entityId:undefined,entityIds:[],domain:'notify',service:'synthetic',data:{target:'synthetic-recipient',message:'Synthetic test only'}});assert.equal(f.writes(),1);
 await assert.rejects(f.service.execute({...command(view),data:{target:'all'}}),/not a declared field/);assert.equal(f.writes(),1);
});
