const text=value=>typeof value==='string'?value.slice(0,300):undefined;
const pick=(value,keys)=>Object.fromEntries(keys.flatMap(key=>text(value?.[key])!==undefined?[[key,text(value[key])]]:[]));
export function fusionAvailability(models){const choices=models.filter(model=>model.capabilities?.supports?.fusion===true||/fusion/i.test(model.name||'')||/fusion/i.test(model.id||''));return {available:choices.length>0,modelIds:choices.map(model=>model.id),note:choices.length?'Select an advertised Fusion model.':'Copilot has not advertised a Fusion model for this account/runtime. Refresh models to check availability.'};}

/** Consume native routing/phase receipts. Internal drafts and review text never
 * become duplicate root answers; authoritative message and usage events retain
 * their existing adapter path. The provider owns routing and execution policy. */
export function fusionJournal(run,update){
 return event=>{
  const phaseEvent=/^(session\.fusion_|assistant\.fusion_phase_)/.test(event.type||''),attribution=event.data?.fusion;
  if(!phaseEvent&&!attribution)return false;
  run.fusion||={status:'starting',phases:[],eventIds:[]};const state=run.fusion,data=event.data||{};
  if(event.id){if(state.eventIds.includes(event.id))return true;state.eventIds.push(event.id);state.eventIds=state.eventIds.slice(-512);}
  if(attribution){Object.assign(state,pick(attribution,['fusionId','pattern','policy','syntheticModel','sourceModel']));
   if(attribution.conversationScope==='review'&&['assistant.message','assistant.message_delta'].includes(event.type)){update();return true;}
   update();return false;
  }
  Object.assign(state,pick(data,['fusionId','attemptId','pattern','policy','syntheticModel','primaryModel','secondaryModel','fallbackModel']));
  if(event.type==='session.fusion_route_started')state.status='routing';
  if(event.type==='session.fusion_resolved')state.status='running';
  if(event.type==='session.fusion_route_failed'){state.status='fallback';state.error=text(data.message||data.reason||data.errorCode);}
  if(event.type==='session.fusion_completed')state.status=text(data.status)||'completed';
  if(data.phaseId){let phase=state.phases.find(value=>value.phaseId===data.phaseId);if(!phase){phase={phaseId:text(data.phaseId)};state.phases.push(phase);state.phases=state.phases.slice(-40);}
   Object.assign(phase,pick(data,['phaseKind','role','model','sourceModel','conversationScope','activity']));
   if(event.type.endsWith('_started'))phase.status='running';if(event.type.endsWith('_completed'))phase.status=text(data.status)||'completed';if(event.type.endsWith('_failed'))phase.status='failed';
  }
  update();return true;
 };
}
