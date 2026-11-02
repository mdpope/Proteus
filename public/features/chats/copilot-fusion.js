// Copilot Fusion presentation shared by desktop, remote desktop views and the website.
// Everything shown comes from provider-reported Fusion events; absent values are
// labeled “not reported”, and planned models are never presented as used.
const tokens = value => Number.isFinite(value) ? Math.round(value).toLocaleString() : null;
const aiUnits = nano => Number.isFinite(nano) ? (nano / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' AI units' : null;
const seconds = ms => Number.isFinite(ms) ? (ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + ' s') : null;
const title = value => value ? String(value).replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase()) : '';

export function fusionTurnFor(run, fusionId) {
  if (!fusionId) return null;
  return (run?.fusionTurns || []).find(turn => turn.fusionId === fusionId) || (run?.fusion?.fusionId === fusionId ? run.fusion : null);
}
export function fusionEffortLabel(run, turn) {
  const selection = run?.fusionSelection;
  if (selection?.label && (!turn?.policy || turn.policy === selection.tier)) return selection.label;
  return turn?.policy ? title(turn.policy) : selection?.label || 'Fusion';
}

/** Models that actually executed: started/finished phases, observed requests or the final source. */
export function fusionUsedModels(turn) {
  const used = new Map();
  const add = (model, role) => { if (!model) return; const entry = used.get(model) || { model, roles: new Set(), requests: 0 }; if (role) entry.roles.add(role); used.set(model, entry); return entry; };
  for (const phase of turn?.phases || []) if (phase.model && phase.status) add(phase.model, phase.role || phase.phaseKind);
  for (const [model, value] of Object.entries(turn?.models || {})) if (value.requests > 0 || value.roles?.includes('final answer')) { const entry = add(model); entry.requests = value.requests || 0; for (const role of value.roles || []) entry.roles.add(role); }
  if (turn?.fallback?.fallbackModel && turn.status === 'fallback') add(turn.fallback.fallbackModel, 'fallback');
  const final = turn?.final?.sourceModel || turn?.completion?.finalSourceModel;
  if (final) add(final, 'final answer');
  return [...used.values()].map(entry => ({ ...entry, roles: [...entry.roles].filter(role => role !== 'final answer') }));
}
export function fusionPlannedOnly(turn) {
  const used = new Set(fusionUsedModels(turn).map(entry => entry.model)), plan = turn?.plan || {};
  const planned = [['primary', plan.primaryModel], ['review', plan.secondaryModel], ['judge', plan.judgeModel], ['repair', plan.repairModel], ...(plan.critics || []).map(critic => ['critic', critic.model])];
  const seen = new Set();
  return planned.filter(([, model]) => model && !used.has(model) && !seen.has(model) && seen.add(model)).map(([role, model]) => ({ role, model }));
}

/** One-line summary for the bottom of an answer. */
export function fusionAttributionText(run, turn) {
  if (!turn) return '';
  const parts = ['Fusion ' + fusionEffortLabel(run, turn)];
  if (turn.pattern) parts.push(title(turn.pattern));
  const final = turn.final?.sourceModel || turn.completion?.finalSourceModel;
  const others = fusionUsedModels(turn).filter(entry => entry.model !== final);
  if (final) parts.push('answer by ' + final);
  else if (!['routing', 'running'].includes(turn.status)) parts.push('answering model not reported');
  if (others.length) parts.push('also used ' + others.map(entry => entry.model + (entry.roles.length ? ' (' + entry.roles.join(', ') + ')' : '')).join(', '));
  if (turn.status === 'routing') parts.push('choosing models…');
  else if (turn.status === 'running') parts.push('running');
  if (turn.status === 'fallback') parts.push('fallback' + (turn.fallback?.reason ? ': ' + title(turn.fallback.reason) : ''));
  if (turn.completion?.degradedReason) parts.push('degraded: ' + turn.completion.degradedReason);
  return parts.join(' · ');
}

function phaseRow(phase, escape) {
  const usage = phase.usage || {};
  const details = [phase.reasoningEffort && 'effort ' + phase.reasoningEffort, phase.conversationScope === 'review' && 'read-only review', seconds(phase.durationMs), tokens(usage.inputTokens) && tokens(usage.inputTokens) + ' in', tokens(usage.outputTokens) && tokens(usage.outputTokens) + ' out', tokens(usage.cachedTokens) && tokens(usage.cachedTokens) + ' cached', usage.requestCount ? usage.requestCount + (usage.requestCount === 1 ? ' request' : ' requests') : null, aiUnits(usage.totalNanoAiu), phase.verdict && 'verdict ' + phase.verdict, phase.reason && 'reason ' + title(phase.reason), phase.degradedToPhaseId && 'degraded to ' + phase.degradedToPhaseId].filter(Boolean);
  return `<li><strong>${escape(title(phase.role || phase.phaseKind) || 'Phase')}</strong> · ${escape(phase.model || 'model not reported')} · ${escape(title(phase.status) || 'pending')}${details.length ? `<small>${escape(details.join(' · '))}</small>` : ''}</li>`;
}

/** Expandable attribution shown under an answer. */
export function fusionAttributionHTML(run, turn, escape) {
  if (!turn) return '';
  const planned = fusionPlannedOnly(turn), completion = turn.completion || {};
  const totals = [completion.phaseCount != null && completion.phaseCount + ' phases', completion.requestCount != null && completion.requestCount + ' requests', tokens(completion.inputTokens) && tokens(completion.inputTokens) + ' input tokens', tokens(completion.outputTokens) && tokens(completion.outputTokens) + ' output tokens', aiUnits(completion.totalNanoAiu), seconds(completion.durationMs)].filter(Boolean);
  const models = Object.entries(turn.models || {}).filter(([, value]) => value.requests > 0);
  return `<details class="fusion-attribution" data-fusion-id="${escape(turn.fusionId || '')}"><summary>${escape(fusionAttributionText(run, turn))}</summary>
${turn.plan?.hint ? `<p class="note">${escape(turn.plan.hint)}</p>` : ''}
<ol class="fusion-phases">${(turn.phases || []).map(phase => phaseRow(phase, escape)).join('') || '<li class="note">No phases reported yet.</li>'}</ol>
${models.length ? `<p class="note">Requests by model: ${escape(models.map(([model, value]) => `${model} ×${value.requests}${tokens(value.inputTokens) ? ` (${tokens(value.inputTokens)} in / ${tokens(value.outputTokens) || 0} out)` : ''}`).join(' · '))}</p>` : ''}
${planned.length ? `<p class="note">Planned but not run: ${escape(planned.map(item => `${item.model} (${item.role})`).join(', '))}</p>` : ''}
${turn.fallback ? `<p class="note">Routing fallback to ${escape(turn.fallback.fallbackModel || 'a provider model')}${turn.fallback.reason ? ' · ' + escape(title(turn.fallback.reason)) : ''}${turn.fallback.errorMessage ? ' · ' + escape(turn.fallback.errorMessage) : ''}</p>` : ''}
<p class="note">${totals.length ? 'Turn totals: ' + escape(totals.join(' · ')) : 'Turn totals not reported yet.'}${turn.final?.hasUserSteering ? ' · includes your steering' : ''}</p>
<p class="note">Discarded drafts can still have edited files; review workspace changes before committing.</p></details>`;
}

/** Aggregate of concrete models used across this chat's recorded Fusion turns. */
export function fusionModelTotals(run) {
  const totals = new Map();
  for (const turn of run?.fusionTurns || []) {
    for (const entry of fusionUsedModels(turn)) { const row = totals.get(entry.model) || { model: entry.model, turns: 0, requests: 0, inputTokens: 0, outputTokens: 0, nanoAiu: 0, finals: 0 }; row.turns++; totals.set(entry.model, row); }
    for (const [model, value] of Object.entries(turn.models || {})) { const row = totals.get(model); if (!row) continue; row.requests += value.requests || 0; row.inputTokens += value.inputTokens || 0; row.outputTokens += value.outputTokens || 0; }
    for (const phase of turn.phases || []) { const row = totals.get(phase.model); if (row && Number.isFinite(phase.usage?.totalNanoAiu)) row.nanoAiu += phase.usage.totalNanoAiu; }
    const final = turn.final?.sourceModel || turn.completion?.finalSourceModel; if (final && totals.get(final)) totals.get(final).finals++;
  }
  return [...totals.values()].sort((a, b) => b.turns - a.turns || a.model.localeCompare(b.model));
}

export function renderCopilotFusion(run, escape) {
  if (run.schedule?.provider !== 'copilot') return '';
  const availability = run.fusionAvailability, turns = run.fusionTurns || (run.fusion ? [run.fusion] : []), latest = turns.at(-1);
  const selected = run.schedule?.model === 'copilot-fusion';
  if (!selected && !turns.length) return `<section class="card"><h2>Copilot Fusion</h2><p class="note">${escape(availability?.note || 'Refresh Copilot models to see whether Copilot Fusion is offered to your account.')}</p></section>`;
  const totals = fusionModelTotals({ fusionTurns: turns });
  return `<section class="card fusion-card"><h2>Copilot Fusion</h2>
<p>${escape(selected ? 'Selected · ' + (run.fusionSelection?.label || run.schedule.reasoningEffort || 'provider default effort') : 'Used earlier in this chat')} · ${turns.length} recorded ${turns.length === 1 ? 'turn' : 'turns'}</p>
${totals.length ? `<table class="fusion-models"><thead><tr><th>Model</th><th>Turns</th><th>Final answers</th><th>Requests</th><th>Input</th><th>Output</th><th>Cost</th></tr></thead><tbody>${totals.map(row => `<tr><td>${escape(row.model)}</td><td>${row.turns}</td><td>${row.finals}</td><td>${row.requests || 'not reported'}</td><td>${row.requests ? tokens(row.inputTokens) : '—'}</td><td>${row.requests ? tokens(row.outputTokens) : '—'}</td><td>${escape(row.nanoAiu ? aiUnits(row.nanoAiu) : 'not reported')}</td></tr>`).join('')}</tbody></table>` : '<p class="note">Models appear here as Fusion reports them.</p>'}
${latest ? `<h3>Latest turn</h3>${fusionAttributionHTML(run, latest, escape)}` : ''}
${availability?.available === false ? `<p class="note">${escape(availability.note)}</p>` : ''}</section>`;
}
