import test from 'node:test';
import assert from 'node:assert/strict';
import {fusionAvailability,fusionJournal} from '../src/providers/copilot-fusion.js';
test('Fusion availability comes from advertised provider models and native phase receipts preserve only safe progress',()=>{
 assert.equal(fusionAvailability([{id:'ordinary',name:'Ordinary model'}]).available,false);
 assert.deepEqual(fusionAvailability([{id:'provider-choice',name:'Copilot Fusion'}]).modelIds,['provider-choice']);
 const run={},receive=fusionJournal(run,()=>{});
 assert.equal(receive({id:'route',type:'session.fusion_resolved',data:{fusionId:'fusion',pattern:'critique',syntheticModel:'provider-choice',primaryModel:'primary'}}),true);
 receive({id:'draft',type:'assistant.fusion_phase_started',data:{fusionId:'fusion',phaseId:'draft',phaseKind:'draft',model:'primary'}});
 receive({id:'critic',type:'assistant.fusion_phase_completed',data:{phaseId:'critic',phaseKind:'critic',conversationScope:'review',output:'Internal review is never copied'}});
 assert.equal(JSON.stringify(run.fusion).includes('Internal review'),false);assert.equal(run.fusion.phases.length,2);
 assert.equal(receive({id:'answer',type:'assistant.message',data:{content:'Final',fusion:{fusionId:'fusion',conversationScope:'root'}}}),false,'the ordinary authoritative answer is handled once by the existing adapter');
 assert.equal(receive({id:'answer',type:'assistant.message',data:{content:'Final',fusion:{fusionId:'fusion',conversationScope:'root'}}}),true,'replayed attribution is not another answer');
 assert.equal(receive({id:'review',type:'assistant.message',data:{content:'Private draft',fusion:{fusionId:'fusion',conversationScope:'review'}}}),true);
 assert.equal(receive({id:'usage',type:'assistant.usage',data:{inputTokens:5,fusion:{fusionId:'fusion',conversationScope:'review'}}}),false,'observed concrete-model usage retains the existing accounting path');
 receive({id:'done',type:'session.fusion_completed',data:{status:'completed'}});assert.equal(run.fusion.status,'completed');
});
