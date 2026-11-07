// A private, single-WebContents CDP bridge. Never exposes the application window
// or Chromium's global debugging endpoint to the browser or an AI provider.
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { WebSocketServer } = require('ws');
const { chromium } = require('playwright');
const { acquireDebugger } = require('./debugger-session.cjs');

async function connectPage(contents, onInput = () => {}, {external=false}={}) {
  const lease = acquireDebugger(contents), debug = lease.debug;
  let targetInfo;
  try { ({ targetInfo } = await debug.sendCommand('Target.getTargetInfo')); }
  catch (error) { lease.release(); throw error; }
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
  let topSession = null;
  const childSessions = new Set(), explicitSessions = new Set();
  let disposed = false, browser;
  const cleanup = () => {
    if (disposed) return; disposed = true;
    debug.removeListener('detach', cleanup);
    contents.removeListener('destroyed', cleanup);
    debug.removeListener('message', forward);
    for (const socket of sockets.clients) socket.terminate();
    sockets.close(); server.close();
    // Other observers may retain the shared Electron debugger; retire only
    // sessions created by this bridge before releasing its attachment lease.
    for(const sessionId of explicitSessions)void debug.sendCommand('Target.detachFromTarget',{sessionId}).catch(()=>{});
    explicitSessions.clear();childSessions.clear();
    lease.release();
  };
  let send = () => {};
  const forward = (_event, method, params, sessionId) => {
    if (method === 'Target.attachedToTarget') {
      if(sessionId?!childSessions.has(sessionId):params.targetInfo?.targetId!==info.targetId)return;
      if(params.targetInfo?.type==='page'&&params.targetInfo.targetId!==info.targetId)return;
      childSessions.add(params.sessionId);
      // Explicit same-page attachments are independent native CDP sessions.
      // Reusing the emulated auto-attach ID replaces Puppeteer's session object
      // and strands callbacks owned by the original page session.
      if(params.targetInfo?.targetId===info.targetId&&!sessionId){
        explicitSessions.add(params.sessionId);
        send({method,params:{...params,targetInfo:info}});return;
      }
    }
    if (method === 'Target.detachedFromTarget') {
      childSessions.delete(params.sessionId);if(params.sessionId===topSession)topSession=null;
      if(explicitSessions.delete(params.sessionId)){send({method,params});return;}
    }
    // The Electron root debugger is shared with certificate observers and may
    // already have Runtime/Network enabled. Only native per-client sessions
    // replay their own execution contexts and receive their own domain events.
    if(sessionId&&childSessions.has(sessionId))send({method,params,sessionId});
  };
  debug.on('message', forward);
  debug.once('detach', cleanup);
  contents.once('destroyed', cleanup);
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
          else if(method==='Target.getBrowserContexts')result={browserContextIds:['proteus-tab']};
          else if(method==='Target.getTargets')result={targetInfos:[info]};
          else if(method==='Target.setDiscoverTargets'){if(params.discover)send({method:'Target.targetCreated',params:{targetInfo:info}});result={};}
          else if(method==='Target.attachToTarget'){if(params.targetId!==info.targetId)throw new Error('Target is outside this tab.');result=await debug.sendCommand(method,{targetId:info.targetId,flatten:true});childSessions.add(result.sessionId);explicitSessions.add(result.sessionId);}
          else if(method==='Target.activateTarget'){if(params.targetId!==info.targetId)throw new Error('Target is outside this tab.');result={};}
          else if(method==='Target.detachFromTarget'){if(params.sessionId!==topSession&&!childSessions.has(params.sessionId))throw new Error('Unknown page session.');result=await debug.sendCommand(method,{sessionId:params.sessionId});}
          else if (method === 'Target.setAutoAttach') {
            if(params.autoAttach&&!topSession){const attached=await debug.sendCommand('Target.attachToTarget',{targetId:info.targetId,flatten:true});topSession=attached.sessionId;childSessions.add(topSession);explicitSessions.add(topSession);}
            result = {};
          } else throw new Error(`Browser-wide command is unavailable: ${method}`);
        } else {
          if (sessionId !== topSession && !childSessions.has(sessionId)) throw new Error('Unknown page session.');
          if (method.startsWith('Browser.') || ['Target.createTarget','Target.getTargets','Target.attachToTarget','Target.attachToBrowserTarget','Network.getAllCookies','Network.getCookies','Storage.getCookies','Storage.getStorageKeyForFrame'].includes(method)) throw new Error('Command is outside this tab.');
          if(method==='Input.dispatchMouseEvent')onInput(params);
          result = await debug.sendCommand(method, params, sessionId);
        }
        send({ id, result, ...(sessionId ? { sessionId } : {}) });
      } catch (error) {
        send({ id: message?.id, error: { code: -32000, message: error.message }, ...(message?.sessionId ? { sessionId: message.sessionId } : {}) });
      }
    });
  });
  try {
    await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0, '127.0.0.1', resolve); });
    const endpoint=`ws://127.0.0.1:${server.address().port}/${secret}`;
    if(external)return {endpoint,get closed(){return disposed||!lease.active;},async close(){cleanup();}};
    browser = await chromium.connectOverCDP(endpoint, { timeout: 15000 });
    const context=browser.contexts()[0];if(!context)throw new Error('Embedded browser context did not attach.');
    const page=context.pages()[0]||await context.waitForEvent('page',{timeout:10000});
    page.setDefaultTimeout(10000);
    return { page, get closed() { return disposed || !browser.isConnected() || !lease.active; }, async close() { try { await browser.close(); } finally { cleanup(); } } };
  } catch (error) { cleanup(); throw error; }
}
module.exports = { connectPage };
