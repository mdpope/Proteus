// Refresh transport readiness without replacing connection fields or a pasted code.
export function watchRemoteConnection(root, { api, initial, interval = 3000 }) {
  const status = root.querySelector('[data-remote-status]');
  const pair = root.querySelector('#remote-pair');
  const hint = root.querySelector('#remote-pair-status');
  const error = root.querySelector('#remote-connection-error');
  const refresh = root.querySelector('#remote-check-connection');
  let timer, pending;
  const alive = () => root.isConnected && document.querySelector('#remote-screen') === root;
  const text = (element, value) => { if (element.textContent !== value) element.textContent = value; };
  function show(data) {
    if (!alive()) return;
    text(status, data.status);
    pair.disabled = data.status !== 'online';
    text(error, data.error || ''); error.hidden = !data.error;
    const managed=data.computerAccess?.managed===true;
    text(hint, data.status === 'online'
      ? 'Create a code here for a device that should connect to this computer.'+(managed?'':' To connect to another computer, paste its code above.')
      : !data.enabled
        ? 'Enable incoming access to create a code for this computer.'+(managed?'':' You do not need incoming access to connect to another computer above.')
        : data.status === 'connecting'
          ? 'Connecting this computer to its relay… Status updates automatically.'
          : 'This computer is not connected to its relay. Check the connection message or choose Check connection.'+(managed?'':' You can still pair to another computer above.'));
    root.querySelector('#remote-disable').disabled = !data.enabled;
    text(root.querySelector('#remote-enable'), data.enabled ? 'Apply connection' : 'Enable access');
  }
  const schedule = () => { if (alive()) timer = setTimeout(() => void check(), interval); };
  function check() {
    clearTimeout(timer);
    if (!alive()) return Promise.resolve();
    if (pending) return pending;
    refresh.disabled = true;
    pending = Promise.resolve().then(() => api('/api/remote')).then(show).catch(cause => {
      if (!alive()) return;
      pair.disabled = true; error.hidden = false;
      text(error, 'Could not check this computer’s relay connection: ' + cause.message);
    }).finally(() => { pending = null; if (alive()) { refresh.disabled = false; schedule(); } });
    return pending;
  }
  refresh.onclick = () => void check();
  show(initial); schedule();
  return () => clearTimeout(timer);
}
