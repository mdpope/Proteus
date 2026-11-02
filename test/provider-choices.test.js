import test from 'node:test';
import assert from 'node:assert/strict';
import {inferenceProviderChoices,modelsForInferenceChoice} from '../public/features/chats/provider-choices.js';

test('inference choices identify machines/adapters and preserve route identity across name changes',()=>{
 const sources=[{hostId:'one',hostLabel:'Model computer',providerId:'mtplx',available:true},{hostId:'two',hostLabel:'Offline computer',providerId:'mtplx',available:false}];
 const models=sources.map((sharedSource,index)=>({id:'route-'+index,name:'Same name',sharedSource}));
 const statuses={codex:{available:true},mtplx:{available:false},'shared-llm':{sources,models}};
 const choices=inferenceProviderChoices(statuses,{ownerLabel:'Executing computer'}),remote=choices.filter(c=>c.provider==='shared-llm');
 assert.equal(remote.length,2);assert.equal(remote[0].label,'MTPLX · Model computer');assert.equal(remote[1].available,false);
 assert.equal(choices.find(c=>c.id==='mtplx').label,'MTPLX · Executing computer');
 assert.deepEqual(modelsForInferenceChoice(models,remote[0]).map(m=>m.id),['route-0']);
 sources[0].hostLabel='Renamed computer';assert.equal(inferenceProviderChoices(statuses).find(c=>c.sourceHost==='one').id,remote[0].id);
 assert.equal(inferenceProviderChoices({mtplx:{},'shared-llm':{sources:[{hostId:'self',providerId:'mtplx'}]}},{ownerId:'self'}).filter(c=>c.provider==='shared-llm').length,0);
 const missing=inferenceProviderChoices({'shared-llm':{sources:[]}},{selected:remote[0].id}).find(c=>c.id===remote[0].id);
 assert.equal(missing.available,false);assert.equal(missing.provider,'shared-llm');assert.equal(missing.sourceHost,'one');
 assert.equal(inferenceProviderChoices({'shared-llm':{sources:[],models:[]}}).some(c=>c.provider==='shared-llm'),false,'an empty catalog does not invent a generic shared bucket');
});
