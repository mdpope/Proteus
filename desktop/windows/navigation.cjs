const pending = new WeakMap();

function cancelNavigation(webContents, message = 'Navigation stopped.') {
  const cancel = pending.get(webContents);
  if (!cancel) return false;
  cancel(new Error(message));
  return true;
}

function loadURLWithTimeout(webContents, url, timeoutMs = 30000) {
  // A newer address must not inherit the older navigation's timer or error.
  pending.get(webContents)?.(new Error('Navigation replaced by another address.'), false);
  if (webContents.isDestroyed()) return Promise.reject(new Error('Browser tab is closed.'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      webContents.removeListener('destroyed', destroyed);
      if (pending.get(webContents) === cancel) pending.delete(webContents);
      if (error) reject(error); else resolve();
    };
    const cancel = (error, stop = true) => {
      // Settle first: stop() can synchronously reject Electron's load promise.
      finish(error);
      if (stop && !webContents.isDestroyed()) webContents.stop();
    };
    const destroyed = () => finish(new Error('Browser tab closed during navigation.'));
    const timer = setTimeout(() => cancel(new Error(
      `Navigation timed out after ${Math.round(timeoutMs / 1000)} seconds. Loading was stopped; inspect the page or retry the address.`
    )), timeoutMs);
    pending.set(webContents, cancel);
    webContents.once('destroyed', destroyed);
    try { Promise.resolve(webContents.loadURL(url)).then(() => finish(), finish); }
    catch (error) { finish(error); }
  });
}

module.exports = { loadURLWithTimeout, cancelNavigation };
