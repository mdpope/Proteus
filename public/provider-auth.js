const PROVIDERS = Object.freeze({
  copilot: { name: 'GitHub Copilot', hosts: ['github.com'] },
  codex: { name: 'Codex', hosts: ['auth.openai.com', 'chatgpt.com', 'login.openai.com'] },
  claude: { name: 'Claude', hosts: ['claude.ai', 'console.anthropic.com'] },
});
const STATES = new Set(['idle', 'starting', 'waiting', 'connected', 'failed', 'cancelled', 'timed-out']);
const active = new WeakMap();

export function allowedProviderAuthURL(providerId, value) {
  const provider = PROVIDERS[providerId];
  if (!provider || typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !provider.hosts.includes(url.hostname.toLowerCase())) return null;
    if ([...url.searchParams.keys()].some(key => /^(?:code|token|access_token|id_token|refresh_token|password|client_secret)$/i.test(key))) return null;
    return url.href;
  } catch { return null; }
}

export function renderProviderAuth(container, providerId, { api, openExternal, onConnected } = {}) {
  if (!container || !PROVIDERS[providerId] || typeof api !== 'function') throw new Error('Choose a supported local provider.');
  active.get(container)?.dispose();
  const provider = PROVIDERS[providerId];
  let state = 'checking', timer, generation = 0, pending = false, startedHere = false, notified = false, authURL = null, accountLabel = null;
  let expiresAt = Date.now() + 600_000;
  const alive = () => container.isConnected && active.get(container)?.dispose === dispose;
  const stopPolling = () => { clearTimeout(timer); timer = undefined; };
  const dispose = () => { generation++; stopPolling(); if (active.get(container)?.dispose === dispose) active.delete(container); };
  const make = (tag, label, className) => { const node = document.createElement(tag); node.textContent = label; if (className) node.className = className; return node; };
  const labels = {
    checking: `Checking ${provider.name} sign-in…`, idle: `Connect ${provider.name} on this computer.`,
    starting: `Starting ${provider.name} sign-in on this computer…`, waiting: `Finish ${provider.name} sign-in on this computer. Checking automatically…`,
    connected: `${provider.name} is connected.`, failed: `${provider.name} sign-in did not complete. Retry here or finish sign-in on this computer.`,
    cancelled: `${provider.name} sign-in was cancelled.`, 'timed-out': `${provider.name} sign-in timed out. Start again when ready.`,
  };
  function draw() {
    if (!alive()) return;
    container.replaceChildren();
    const heading = make('p', labels[state] || labels.idle, 'note'); heading.setAttribute('role', 'status'); container.append(heading);
    if (state === 'connected') container.append(make('p', accountLabel ? `Account: ${accountLabel}` : 'Account name not reported by this provider.', 'note'));
    const row = make('div', '', 'actions'); container.append(row);
    const button = (label, action) => { const item = make('button', label); item.type = 'button'; item.disabled = pending; item.addEventListener('click', action); row.append(item); return item; };
    if (['checking', 'idle', 'failed', 'cancelled', 'timed-out'].includes(state)) button(state === 'idle' ? 'Connect / sign in' : 'Retry sign-in', start);
    if (authURL && typeof openExternal === 'function' && ['starting', 'waiting'].includes(state)) button('Open sign-in page', () => { const approved = allowedProviderAuthURL(providerId, authURL); if (approved) Promise.resolve(openExternal(approved)).catch(() => { state = 'failed'; authURL = null; draw(); }); });
    if (['starting', 'waiting'].includes(state)) button('Cancel sign-in', cancel);
  }
  async function call(action) { return api('/api/provider-auth', { action, providerId }); }
  function apply(value) {
    if (!value || value.providerId !== providerId || !STATES.has(value.state)) { state = 'failed'; authURL = null; return; }
    state = value.state;
    accountLabel = state === 'connected' && typeof value.accountLabel === 'string' && value.accountLabel.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value.accountLabel) ? value.accountLabel : null;
    if (['starting', 'waiting'].includes(state)) startedHere = true;
    if (value.url !== undefined) authURL = allowedProviderAuthURL(providerId, value.url);
    else if (!['starting', 'waiting'].includes(state)) authURL = null;
    if (typeof value.expiresAt === 'string' && Number.isFinite(Date.parse(value.expiresAt))) expiresAt = Math.min(Date.parse(value.expiresAt), Date.now() + 600_000);
    if (state === 'connected' && startedHere && !notified) { notified = true; Promise.resolve(onConnected?.(providerId)).catch(() => {}); }
  }
  const schedule = () => { stopPolling(); if (['starting', 'waiting'].includes(state) && Date.now() < expiresAt) timer = setTimeout(poll, 3000); };
  async function poll() {
    if (!alive() || pending || !['starting', 'waiting'].includes(state)) return;
    if (Date.now() >= expiresAt) { state = 'timed-out'; authURL = null; draw(); return; }
    const current = ++generation;
    try { const value = await call('status'); if (!alive() || current !== generation) return; apply(value); }
    catch { if (!alive() || current !== generation) return; state = 'failed'; authURL = null; }
    draw(); schedule();
  }
  async function start() {
    if (!alive() || pending) return;
    const current = ++generation; pending = true; startedHere = true; notified = false; authURL = null; state = 'starting'; expiresAt = Date.now() + 600_000; stopPolling(); draw();
    try { const value = await call('start'); if (!alive() || current !== generation) return; apply(value); }
    catch { if (!alive() || current !== generation) return; state = 'failed'; }
    finally { if (alive() && current === generation) { pending = false; draw(); schedule(); } }
  }
  async function cancel() {
    if (!alive() || pending) return;
    const current = ++generation; pending = true; stopPolling(); draw();
    try { await call('cancel'); if (!alive() || current !== generation) return; state = 'cancelled'; authURL = null; }
    catch { if (!alive() || current !== generation) return; state = 'failed'; }
    finally { if (alive() && current === generation) { pending = false; draw(); } }
  }
  active.set(container, { dispose });
  draw();
  void call('status').then(value => { if (!alive() || state !== 'checking') return; apply(value); draw(); schedule(); }).catch(() => { if (alive() && state === 'checking') { state = 'idle'; draw(); } });
  return { dispose };
}
