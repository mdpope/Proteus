const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names = {copilot:'Copilot',codex:'Codex',claude:'Claude'};
const validDate = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : null;
export function allowance(window, now = Date.now()) {
    const expired = window?.expired || (window?.resetAt && Number.isFinite(Date.parse(window.resetAt)) && Date.parse(window.resetAt) <= now);
    const percent = !expired && Number.isFinite(window?.remainingPercent) ? Math.max(0, Math.min(100, window.remainingPercent)) : null;
    return {percent, expired:!!expired, label:expired ? 'Unreported' : window?.unlimited ? 'Unlimited' : percent == null ? 'Unreported' : Math.round(percent) + '%'};
}
function meter(value) {
    return `<span class="provider-meter${value.percent == null ? ' unknown' : ''}"${value.percent == null ? '' : ` role="meter" aria-label="Remaining allowance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value.percent}"`}><progress class="provider-meter-fill" max="100" value="${value.percent ?? 0}" aria-hidden="true"></progress><span class="provider-meter-label">${escape(value.label)}</span></span>`;
}
export function usagePanel(value, {collapsed = false, compact = true, destination = '', error = '', loading = false, now = Date.now()} = {}) {
    if(collapsed)return '<header class="web-usage-heading"><span>AI Allowance</span><button type="button" data-usage-collapse aria-expanded="false" aria-label="Expand AI Allowance">⌄</button></header>';
    return `<header class="web-usage-heading"><span>AI Allowance</span><button type="button" data-usage-collapse aria-expanded="${!collapsed}" aria-label="${collapsed?'Expand':'Collapse'} AI Allowance" title="${collapsed?'Expand':'Collapse'} AI Allowance">${collapsed?'⌄':'⌃'}</button></header><div class="web-usage-destination">${escape(destination)}</div><div class="web-usage-providers ${compact?'compact':''}">${Object.entries(names).map(([id,name]) => {
        const provider = value?.providers?.[id]; const windows = provider?.windows || [];
        const measured = windows.map(window=>({...allowance(window,now),window}));
        const valid = measured.filter(window=>window.percent != null);
        const summary = valid.length ? valid.reduce((a,b)=>a.percent<=b.percent?a:b) : measured.find(window=>window.label==='Unlimited') || {percent:null,label:'Unreported'};
        const details = `${provider?.error ? `<p>${escape(provider.error)}</p>` : ''}${provider?.stale ? '<p>Last reported allowance · refresh pending.</p>' : ''}${windows.length ? measured.map(window=>`<div class="web-usage-window"><strong>${escape(window.window.label || window.window.id)}</strong>${meter(window)}<small>${window.expired ? 'Window expired; refresh for current allowance.' : validDate(window.window.resetAt) ? 'Resets '+escape(validDate(window.window.resetAt)) : escape(window.window.resetNote || 'Reset time unreported.')}</small></div>`).join('') : '<p>Usage has not been reported by this provider.</p>'}<small>${provider?.checkedAt ? 'Checked '+escape(validDate(provider.checkedAt)) : 'Not checked yet'}</small>`;
        return `<details data-provider="${id}"><summary><span>${name}${provider?.stale?' · stale':''}</span>${meter(summary)}</summary><div class="web-usage-details">${details}</div></details>`;
    }).join('')}</div>${collapsed?'':`<button class="secondary web-usage-refresh" type="button" data-usage-refresh ${loading?'disabled':''}>${loading?'Refreshing…':'Refresh usage'}</button><small class="web-usage-note">Percent remaining · select a provider for resets</small>`}${error?`<p class="web-usage-note" role="status">${escape(error)}</p>`:''}`;
}
