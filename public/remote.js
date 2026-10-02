let invite = null;
export async function renderRemote({ api, escape: esc, toast }) {
  const main = document.querySelector('#main');
  main.innerHTML = '<div id="remote-screen"><h1>Remote access.</h1><p>Loading host status…</p></div>';
  try {
    const data = await api('/api/remote'); if (!document.querySelector('#remote-screen')) return;
    main.innerHTML = `<div id="remote-screen"><div class="heading"><div><div class="eyebrow">One host. All your devices.</div><h1>Remote access.</h1><p class="muted">Your Mac runs the work. Your iPhone and iPad control the same sessions.</p></div><span class="pill">${esc(data.status)}</span></div>
      <div class="grid"><section class="card"><h2>Connection</h2><p class="note">Closing the window leaves Proteus in the menu bar. Quit Proteus stops the host. Keep this Mac awake for scheduled and remote work.</p>
      <label>Relay<select id="remote-mode"><option value="local" ${data.mode === 'local' ? 'selected' : ''}>Built-in local relay</option><option value="external" ${data.mode === 'external' ? 'selected' : ''}>Container / external relay</option></select></label>
      <label>Local port<input id="remote-port" type="number" value="${data.port}"></label>
      <label>Host relay address<input id="remote-url" placeholder="ws://127.0.0.1:4318" value="${esc(data.relayURL)}"></label>
      <label>Address reachable by iPhone/iPad<input id="remote-public" placeholder="ws://192.168.1.20:4318" value="${esc(data.publicURL || data.addresses[0] || '')}"></label>
      <label>External relay host token<input id="remote-token" type="password" autocomplete="off" placeholder="Leave blank to keep the configured token"></label>
      <p class="note">The host token stays on the Mac. Pairing establishes separate device keys; chat content is encrypted across the relay. External internet relays require wss://.</p>
      <div class="actions"><button id="remote-disable" ${data.enabled ? '' : 'disabled'}>Disable access</button><button class="primary" id="remote-enable">${data.enabled ? 'Apply connection' : 'Enable access'}</button></div>${data.error ? `<p class="banner">${esc(data.error)}</p>` : ''}</section>
      <section class="card"><h2>Pair a device</h2><p class="note">Open Proteus on your iPhone/iPad and scan the QR code, or paste the pairing link. Each link works once and expires after five minutes. Paired devices can control chats, schedules and context using your existing permissions.</p><button class="primary" id="remote-pair" ${data.status === 'online' ? '' : 'disabled'}>Create pairing code</button>
      <div id="remote-invite">${invite ? `<img class="pairing-qr" src="${invite.qr}" alt="One-time device pairing QR code"><label>Pairing link<textarea readonly id="remote-code" rows="3">${esc(invite.code)}</textarea></label><button id="remote-copy">Copy pairing link</button><p class="note">Expires ${esc(new Date(invite.expiresAt).toLocaleTimeString())}</p>` : ''}</div>
      <h2>Paired devices</h2>${data.devices.map(device => `<div class="device-row"><div><strong>${esc(device.name)}</strong><div class="note">${device.online ? 'Connected' : 'Offline'} · Paired ${esc(new Date(device.pairedAt).toLocaleDateString())}</div></div><button data-revoke-device="${esc(device.id)}">Revoke</button></div>`).join('') || '<p class="note">No paired devices yet.</p>'}
      <button id="remote-refresh">Refresh status</button></section></div></div>`;
    const rerender = () => renderRemote({ api, escape: esc, toast });
    document.querySelector('#remote-refresh').onclick = rerender;
    document.querySelector('#remote-enable').onclick = async () => {
      try { await api('/api/remote', { action: 'configure', enabled: true, mode: document.querySelector('#remote-mode').value, port: Number(document.querySelector('#remote-port').value), relayURL: document.querySelector('#remote-url').value, publicURL: document.querySelector('#remote-public').value, relayToken: document.querySelector('#remote-token').value }); invite = null; toast('Connection updated. Refresh status once the relay connects.'); await rerender(); } catch (e) { toast(e.message); }
    };
    document.querySelector('#remote-disable').onclick = async () => { try { await api('/api/remote', { action: 'configure', enabled: false }); invite = null; await rerender(); } catch (e) { toast(e.message); } };
    document.querySelector('#remote-pair').onclick = async () => { try { invite = await api('/api/remote', { action: 'pair', publicURL: document.querySelector('#remote-public').value }); await rerender(); } catch (e) { toast(e.message); } };
    document.querySelector('#remote-copy')?.addEventListener('click', async () => { if (window.desktop) await window.desktop.copyText(invite.code); else await navigator.clipboard.writeText(invite.code); toast('Pairing link copied.'); });
    document.querySelectorAll('[data-revoke-device]').forEach(button => button.onclick = async () => { try { await api('/api/remote', { action: 'revoke', id: button.dataset.revokeDevice }); invite = null; await rerender(); } catch (e) { toast(e.message); } });
  } catch (e) { main.textContent = e.message; }
}
