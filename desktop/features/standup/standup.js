let signature;
async function refresh() {
  try {
    const current = await window.standup.current();
    const next = JSON.stringify(current);
    if (next !== signature) {
      signature = next;
      document.querySelector('#date').textContent = current ? `${current.date} · ${current.timezone}` : 'Generate a standup in Proteus.';
      document.querySelector('#order').replaceChildren(...(current?.order || []).map(name => { const item = document.createElement('li'); item.textContent = name; return item; }));
      document.querySelector('#instructions').textContent = current?.instructions || '';
    }
    document.querySelector('#error').textContent = '';
  } catch { document.querySelector('#error').textContent = 'Unable to refresh. Reopen this window to reconnect.'; }
}
document.querySelector('#close').onclick = () => window.standup.close();
document.addEventListener('keydown', event => { if (event.key === 'Escape') window.standup.close(); });
void refresh(); setInterval(refresh, 1500);
