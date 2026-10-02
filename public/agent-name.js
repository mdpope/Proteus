// Resolve saved main-agent identity without guessing from arbitrary instructions.
export function agentName(run) {
  const context = run.schedule?.context || run.context;
  const selected = context?.agentId && context.entries?.find(entry => entry.id === context.agentId && entry.kind === 'agent');
  return selected?.name?.trim() || (run.schedule?.provider === 'copilot' ? 'Copilot' : run.schedule?.provider === 'rehearsal' ? 'Rehearsal' : 'Proteus');
}
