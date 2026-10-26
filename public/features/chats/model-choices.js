// Provider IDs are identities; equal labels may represent different models.
// Keep original ordering and use the last advertised record for a repeated ID.
export function uniqueModels(models = []) {
  const byId = new Map();
  for (const model of models) if (typeof model?.id === 'string' && model.id) byId.set(model.id, model);
  return [...byId.values()];
}

// A fixed context capacity is information, not a selectable turn option. Preserve
// non-default saved values for review; only an explicit model change resets them.
export function modelControlVisible(controls={},key,value='') {
  const choices=controls?.[{reasoningEffort:'reasoningEfforts',contextTier:'contextTiers',serviceTier:'serviceTiers'}[key]]||[];
  const id=choice=>typeof choice==='string'?choice:choice.id;
  return key==='contextTier'?choices.some(choice=>id(choice)!=='default')||!!value&&value!=='default':choices.length>0||!!value;
}
export function optionsForModelChange(controls={},values={}) {
  return {reasoningEffort:controls?.reasoningEfforts?.includes(values.reasoningEffort)?values.reasoningEffort:'',contextTier:controls?.contextTiers?.some(t=>t.id===values.contextTier)?values.contextTier:'default',serviceTier:controls?.serviceTiers?.some(t=>t.id===values.serviceTier)?values.serviceTier:''};
}
