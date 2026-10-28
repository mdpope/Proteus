const fs = require('node:fs');
const path = require('node:path');
const { app, dialog, shell } = require('electron');
const { atomicRename } = require('../../src/shared/atomic-rename.cjs');

// Schemes a page can never hand to another application. Proteus's own callback
// schemes are routed by the browser's callback handler before this point.
const blocked = new Set(['javascript:', 'data:', 'file:', 'about:', 'blob:', 'filesystem:', 'chrome:', 'chrome-extension:', 'devtools:', 'view-source:', 'http:', 'https:', 'ws:', 'wss:', 'proteus:', 'proteus-desktop:']);
const MAX_URL = 8192;

/** Classify a navigation target as an external-application link, or null. */
function externalProtocolURL(value) {
  if (typeof value !== 'string' || !value || value.length > MAX_URL) return null;
  let url; try { url = new URL(value); } catch { return null; }
  if (blocked.has(url.protocol) || !/^[a-z][a-z0-9+.-]{1,40}:$/.test(url.protocol)) return null;
  return url;
}
function siteOf(value) { try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.origin : null; } catch { return null; } }

/**
 * Real-browser handling for links such as zoommtg:, msteams:, slack: and mailto:.
 * The page's request is shown to the user with the registered application's name;
 * "Always allow" is remembered per profile, site and scheme. Requests from pages that
 * cannot be attributed to an HTTP(S) site are never remembered. One prompt per tab
 * is shown at a time so a page cannot stack dialogs.
 */
class ExternalProtocols {
  constructor(browser, { home, show = (...args) => dialog.showMessageBox(...args), open = url => shell.openExternal(url), handlerName = url => app.getApplicationNameForProtocol(url) } = {}) {
    Object.assign(this, { browser, show, open, handlerName });
    this.file = home ? path.join(home, 'browser-external-protocols.json') : null; this.pending = new Set();
    try { this.saved = this.file ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : {}; } catch { this.saved = {}; }
    if (!this.saved || typeof this.saved !== 'object' || Array.isArray(this.saved)) this.saved = {};
  }
  key(profileId, site, scheme) { return JSON.stringify([profileId || 'default', site, scheme]); }
  allowed(profileId, site, scheme) { return !!site && this.saved[this.key(profileId, site, scheme)] === true; }
  remember(profileId, site, scheme) {
    if (!site) return;
    this.saved[this.key(profileId, site, scheme)] = true;
    if (!this.file) return;
    try { const temporary = this.file + '.tmp'; fs.writeFileSync(temporary, JSON.stringify(this.saved, null, 2) + '\n', { mode: 0o600 }); atomicRename(temporary, this.file); } catch {}
  }
  /** Ask, then open. Resolves true when the URL was handed to its application. */
  async request(tab, target, requesting) {
    const url = externalProtocolURL(target);
    if (!url || !tab || this.browser.shuttingDown) return false;
    const site = siteOf(requesting || tab.view?.webContents?.getURL?.() || ''), scheme = url.protocol.slice(0, -1);
    let name = ''; try { name = String(this.handlerName(url.href) || '').trim(); } catch {}
    if (!name) { this.browser.actions?.send?.({ type: 'error', id: tab.id, message: `No application on this computer opens ${scheme}: links.` }); return false; }
    if (!this.allowed(tab.profileId, site, scheme)) {
      if (this.pending.has(tab.id)) return false;
      this.pending.add(tab.id);
      try {
        const parent = this.browser.withTabWindow(tab, () => this.browser.window);
        const result = await this.show(parent && !parent.isDestroyed?.() ? parent : undefined, {
          type: 'question', buttons: ['Open ' + name, 'Cancel'], defaultId: 0, cancelId: 1, noLink: true,
          message: `Open ${name}?`, detail: `${site || 'This page'} wants to open this link in ${name}.\n\n${url.href.slice(0, 300)}`,
          ...(site ? { checkboxLabel: `Always allow ${new URL(site).host} to open ${scheme}: links in ${name}`, checkboxChecked: false } : {})
        });
        if (result.response !== 0) return false;
        if (result.checkboxChecked) this.remember(tab.profileId, site, scheme);
      } finally { this.pending.delete(tab.id); }
    }
    if (this.browser.shuttingDown || !this.browser.tabs.has(tab.id)) return false;
    await this.open(url.href);
    return true;
  }
}
module.exports = { ExternalProtocols, externalProtocolURL };
