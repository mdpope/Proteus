const attemptsKey = 'proteus.desktop-setup-attempts';
let poll;

// Keep the operation identity through a lost reply. A retry must not install twice.
export async function requestDesktopSetup(hostId, backend, request) {
  let saved; try { saved = JSON.parse(localStorage.getItem(attemptsKey) || '{}'); } catch { saved = {}; }
  const key = hostId + ':' + backend, operationId = saved[key] || crypto.randomUUID();
  localStorage.setItem(attemptsKey, JSON.stringify({...saved, [key]: operationId}));
  const run = await request({backend, operationId});
  try { saved = JSON.parse(localStorage.getItem(attemptsKey) || '{}'); } catch { saved = {}; }
  delete saved[key]; localStorage.setItem(attemptsKey, JSON.stringify(saved));
  return run;
}

function readiness(status, escape) {
  const verification = status.verification;
  const report = verification ? `<div data-desktop-verification><strong>${verification.verified ? 'Verified on this computer. Input requires a separately authorized real task.' : 'Not ready yet.'}</strong><ul>${verification.steps.map(step => `<li>${step.status === 'pass' ? '✓' : '✗'} ${escape(step.detail)}</li>`).join('')}</ul></div>` : '<p class="note">Not verified since Proteus started.</p>';
  return report + (verification?.verified ? '' : `<ol data-desktop-steps>${(status.setupSteps || []).map(step => `<li>${escape(step.text)}${step.command ? `<pre>${escape(step.command)}</pre>` : ''}</li>`).join('')}</ol>`);
}

export async function mountDesktopControl(container, ui, active) {
  clearInterval(poll);
  const localId = ui.state.data.hostId, escape = ui.escape;
  const peers = await window.desktop?.peers({action: 'list'}) || [];
  if (!active()) return;
  const hosts = [{hostId: localId, label: ui.state.data.hostName || 'This computer'}, ...(Array.isArray(peers) ? peers : peers.items || []).filter(peer => !peer.paused)];
  let hostId = localId, generation = 0, busy = false, feedback = '';
  container.innerHTML = `<label>Computer<select data-desktop-computer>${hosts.map(host => `<option value="${escape(host.hostId)}">${escape(host.label || host.name || host.hostId)}</option>`).join('')}</select></label><div data-desktop-panel></div>`;
  const panel = container.querySelector('[data-desktop-panel]');
  const request = (destination, method, args = {}) => destination === localId
    ? method === 'status' ? ui.api('/api/desktop-control') : method === 'start' ? ui.api('/api/desktop-control/setup', args) : ui.api('/api/desktop-control', {action: method})
    : window.desktop.peers({action: 'request', hostId: destination, method: 'desktop.setup.' + method, args});
  const open = (destination, run) => destination === localId ? ui.openUpdateChat?.(run) : ui.openRemoteChat?.(destination, run.id, 'Desktop control setup');
  const draw = async () => {
    const version = ++generation, destination = hostId;
    let status;
    try { status = await request(destination, 'status'); }
    catch (error) { if (active() && version === generation) panel.innerHTML = `<p class="banner" role="status">${escape(error.message)}</p><button data-desktop-refresh>Retry</button>`; panel.querySelector('[data-desktop-refresh]')?.addEventListener('click', draw); return; }
    if (!active() || version !== generation) return;
    const local = destination === localId;
    panel.innerHTML = `<section class="card"><h2>Desktop Control</h2><p>Cua Driver is primary. Peekaboo is an on-demand Mac backup.</p>${status.backends.map(backend => `<div class="resource-row" data-desktop-backend="${backend.id}"><div><strong>${backend.id === 'cua' ? 'Cua Driver' : 'Peekaboo'}</strong><p data-desktop-installed>${backend.installed ? 'Installed' : 'Not installed'} · ${backend.running ? 'Connected' : 'Idle'}</p><p data-setup-status role="status">${backend.setupChat ? 'Setup chat: ' + escape(backend.setupChat.status) : ''}</p><a href="${escape(backend.setup)}" data-desktop-setup="${backend.id}">Installation and OS permission instructions ↗</a></div><div class="actions"><button data-desktop-install="${backend.id}">${backend.setupChat?.active ? 'Continue setup' : backend.installed ? 'Review setup' : 'Install'}</button><button data-desktop-open="${backend.id}" ${backend.setupChat ? '' : 'hidden'}>Open setup chat</button></div></div>`).join('')}${readiness(status, escape)}<p>${status.lease ? 'Active target: ' + escape(status.lease.owner) + ' · process ' + escape(String(status.lease.pid || 'discovery')) + ' · window ' + escape(String(status.lease.windowId || 'pending')) + (status.lease.uncertain ? ' · Observe before retrying input.' : '') : 'No active desktop control.'}</p><p class="note">Setup uses this computer’s configured update-chat defaults. Commands keep their ordinary approvals. Only you can grant OS permissions. A denial cannot be bypassed by switching backends.</p><div class="actions">${local ? '<button data-desktop-verify>Verify this computer</button><button data-desktop-test>Test discovery</button><button data-desktop-stop>Stop / revoke control</button>' : ''}<button data-desktop-refresh>Refresh</button></div><pre data-desktop-result role="status"></pre></section>`;
    panel.querySelector('[data-desktop-result]').textContent = feedback;
    const report = error => { feedback = error.message; const output = panel.querySelector('[data-desktop-result]'); if (output) output.textContent = feedback; };
    panel.querySelector('[data-desktop-refresh]').onclick = () => void draw();
    for (const backend of status.backends) {
      const row = panel.querySelector(`[data-desktop-backend="${backend.id}"]`);
      row.querySelector('[data-desktop-open]').onclick = () => void open(destination, backend.setupChat);
      row.querySelector('[data-desktop-install]').onclick = async event => {
        event.target.disabled = true; busy = true; feedback = '';
        try {
          const run = backend.setupChat?.active ? backend.setupChat : await requestDesktopSetup(destination, backend.id, args => request(destination, 'start', args));
          await open(destination, run);
        } catch (error) { report(error); }
        finally { busy = false; if (active()) await draw(); }
      };
    }
    for (const action of ['verify', 'test', 'stop']) {
      const button = panel.querySelector('[data-desktop-' + action + ']'); if (!button) continue;
      button.onclick = async () => { button.disabled = true; busy = true; try { const result = await request(destination, action); await draw(); if (action === 'test' && active()) panel.querySelector('[data-desktop-result]').textContent = 'Cua Driver catalog: ' + result.tools + ' tools. Permission report: ' + JSON.stringify(result.permissionResult) + '. Input delivery remains unverified.'; } catch (error) { report(error); button.disabled = false; } finally { busy = false; } };
    }
    panel.querySelectorAll('[data-desktop-setup]').forEach(link => link.onclick = event => { if (window.desktop) { event.preventDefault(); void window.desktop.openExternal(link.href).catch(report); } });
  };
  container.querySelector('[data-desktop-computer]').onchange = event => { hostId = event.target.value; feedback = ''; void draw(); };
  await draw();
  poll = setInterval(() => { if (!active()) { clearInterval(poll); return; } if (!busy && !container.contains(document.activeElement)) void draw(); }, 5000);
}
