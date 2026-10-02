export function usageSummary(value) {
  const q = value?.quota?.quotaSnapshots?.premium_interactions;
  const unlimited = q?.isUnlimitedEntitlement === true;
  const remaining = !unlimited && Number.isFinite(q?.remainingPercentage) ? Math.max(0, Math.min(100, q.remainingPercentage)) : null;
  const percent = number => number.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return { remaining, unlimited,
    label: unlimited ? 'Unlimited' : remaining === null ? 'Usage unavailable' : `${percent(remaining)}% remaining`,
    detail: unlimited ? 'Premium requests' : remaining === null ? 'Premium requests' : `${percent(100 - remaining)}% used · premium requests`,
    stale: !!value?.error && !!value?.checkedAt,
    title: [value?.checkedAt && `Checked ${new Date(value.checkedAt).toLocaleString()}`, q?.resetDate && `Resets ${new Date(q.resetDate).toLocaleDateString()}`, value?.error].filter(Boolean).join(' · ')
  };
}
export function mountUsage(target, value, refresh, busy) {
  if (!target) return;
  const summary = usageSummary(value);
  target.innerHTML = '<div class="usage-heading"><span>GitHub Copilot</span><button class="subtle" aria-label="Refresh Copilot usage">↻</button></div><strong></strong><progress max="100" aria-label="Copilot premium requests remaining"></progress><div class="usage-detail"></div>';
  target.title = summary.title;
  target.querySelector('strong').textContent = summary.label + (summary.stale ? ' (last known)' : '');
  const bar = target.querySelector('progress'); bar.hidden = summary.remaining === null && !summary.unlimited; bar.value = summary.unlimited ? 100 : summary.remaining ?? 0;
  target.querySelector('.usage-detail').textContent = summary.detail;
  const button = target.querySelector('button'); button.disabled = busy; button.onclick = refresh;
}
