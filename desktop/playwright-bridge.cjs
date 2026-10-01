// A private, single-WebContents CDP bridge. Never exposes the application window
// or Chromium's global debugging endpoint to the browser or an AI provider.
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { WebSocketServer } = require('ws');
const { chromium } = require('playwright');

async function connectPage(contents) {
  const debug = contents.debugger;
  debug.attach('1.3');
  const { targetInfo } = await debug.sendCommand('Target.getTargetInfo');
  const info = { ...targetInfo, type: 'page', browserContextId: 'proteus-tab' };
  const secret = randomBytes(32).toString('hex');
  const server = http.createServer((_req, res) => { res.writeHead(404); res.end(); });
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 * 1024 });
  let claimed = false;
  server.on('upgrade', (req, socket, head) => {
    if (claimed || req.url !== `/${secret}` || req.headers.origin) return socket.destroy();
    claimed = true;
    sockets.handleUpgrade(req, socket, head, ws => sockets.emit('connection', ws));
  });
  const topSession = 'proteus-page';
  const childSessions = new Set();
  const cleanup = () => {
    debug.removeListener('message', forward);
    for (const socket of sockets.clients) socket.terminate();
    sockets.close(); server.close();
    if (!contents.isDestroyed() && debug.isAttached()) debug.detach();
  };
  let send = () => {};
  const forward = (_event, method, params, sessionId) => {
    if (method === 'Target.attachedToTarget') childSessions.add(params.sessionId);
    if (method === 'Target.detachedFromTarget') childSessions.delete(params.sessionId);
    send({ method, params, sessionId: sessionId || topSession });
  };
  debug.on('message', forward);
  sockets.on('connection', ws => {
    send = message => { if (ws.readyState === 1) ws.send(JSON.stringify(message)); };
    ws.on('message', async raw => {
      let message;
      try {
        message = JSON.parse(raw); const { id, method, params = {}, sessionId } = message;
        let result;
        if (!sessionId) {
          if (method === 'Browser.getVersion') result = await debug.sendCommand(method);
          else if (method === 'Browser.setDownloadBehavior') result = {}; // Downloads remain governed by Electron.
          else if (method === 'Target.getTargetInfo') result = { targetInfo: info };
          else if (method === 'Target.setAutoAttach') {
            if (params.autoAttach) send({ method: 'Target.attachedToTarget', params: { sessionId: topSession, targetInfo: info, waitingForDebugger: false } });
            result = {};
          } else throw new Error(`Browser-wide command is unavailable: ${method}`);
        } else {
          if (sessionId !== topSession && !childSessions.has(sessionId)) throw new Error('Unknown page session.');
          if (method.startsWith('Browser.') || ['Target.createTarget','Target.getTargets','Target.attachToTarget','Target.attachToBrowserTarget'].includes(method)) throw new Error('Command is outside this tab.');
          result = await debug.sendCommand(method, params, sessionId === topSession ? undefined : sessionId);
        }
        send({ id, result, ...(sessionId ? { sessionId } : {}) });
      } catch (error) {
        send({ id: message?.id, error: { code: -32000, message: error.message }, ...(message?.sessionId ? { sessionId: message.sessionId } : {}) });
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const browser = await chromium.connectOverCDP(`ws://127.0.0.1:${server.address().port}/${secret}`, { timeout: 15000 });
    const page = browser.contexts()[0].pages()[0];
    if (!page) throw new Error('Embedded page did not attach.');
    page.setDefaultTimeout(10000);
    return { page, async close() { await browser.close(); cleanup(); } };
  } catch (error) { cleanup(); throw error; }
}
module.exports = { connectPage };
