const local=new Set(['mtplx','llama-cpp']);
const names={copilot:'Copilot',codex:'Codex',claude:'Claude',mtplx:'MTPLX','llama-cpp':'llama.cpp',rehearsal:'Local rehearsal'};
export function inferenceProviderChoices(statuses={}, {ownerLabel='This computer',ownerId='',selected=''}={}) {
  const choices=[];
  for(const [provider,catalog] of Object.entries(statuses)) {
    if(provider==='local-process'||provider==='shared-llm')continue;
    choices.push({id:provider,provider,label:(names[provider]||provider)+(local.has(provider)?' · '+ownerLabel:''),available:catalog?.available!==false});
  }
  const shared=statuses['shared-llm'],sources=new Map();
  for(const source of [...(shared?.sources||[]),...(shared?.models||[]).map(model=>model.sharedSource).filter(Boolean)]) {
    if(typeof source.hostId!=='string'||!local.has(source.providerId))continue;
    if(source.hostId===ownerId&&statuses[source.providerId])continue;
    const key=JSON.stringify([source.hostId,source.providerId]);
    if(!sources.has(key))sources.set(key,source);
  }
  for(const [key,source] of sources)choices.push({id:'inference:'+encodeURIComponent(key),provider:'shared-llm',sourceHost:source.hostId,sourceProvider:source.providerId,label:(names[source.providerId]||source.providerId)+' · '+(source.hostLabel||'Paired computer'),available:source.available!==false});
  if(!choices.some(choice=>choice.id==='rehearsal'))choices.push({id:'rehearsal',provider:'rehearsal',label:names.rehearsal,available:true});
  if(selected&&!choices.some(choice=>choice.id===selected)) {
    let source;
    if(selected.startsWith('inference:'))try{const [host,provider]=JSON.parse(decodeURIComponent(selected.slice(10)));if(typeof host==='string'&&local.has(provider))source={sourceHost:host,sourceProvider:provider};}catch{}
    const sharedChoice=selected==='shared-llm'||!!source;
    choices.push({id:selected,provider:sharedChoice?'shared-llm':selected,...source,label:sharedChoice?'Saved inference source · unavailable':selected+' · unavailable',available:false});
  }
  return choices;
}
export function modelsForInferenceChoice(models=[],choice={}) {
  return choice.sourceHost?models.filter(model=>model.sharedSource?.hostId===choice.sourceHost&&model.sharedSource?.providerId===choice.sourceProvider):models;
}
