// Provider IDs are identities; equal labels may represent different models.
// Keep original ordering and use the last advertised record for a repeated ID.
export function uniqueModels(models = []) {
  const byId = new Map();
  for (const model of models) if (typeof model?.id === 'string' && model.id) byId.set(model.id, model);
  return [...byId.values()];
}
