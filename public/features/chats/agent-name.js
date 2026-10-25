// Resolve saved main-agent identity without guessing from arbitrary instructions.
export function agentName(run) {
  const context = run.schedule?.context || run.context;
  const selected = context?.agentId && context.entries?.find(entry => entry.id === context.agentId && entry.kind === 'agent');
  return selected?.name?.trim() || (run.schedule?.provider === 'copilot' ? 'Copilot' : run.schedule?.provider === 'codex' ? 'Codex' : run.schedule?.provider === 'claude' ? 'Claude' : run.schedule?.provider === 'mtplx' ? 'MTPLX' : run.schedule?.provider === 'rehearsal' ? 'Rehearsal' : 'Proteus');
}

export function assistantName(run, entry = {}) {
  // The first local pilot persisted its missing provider fallback as "Proteus".
  // Correct that main-agent display without rewriting history or custom names.
  const saved = entry.agentName?.trim();
  return run.schedule?.provider === 'mtplx' && saved === 'Proteus' && !entry.data?.agentId
    ? agentName(run) : saved || agentName(run);
}
