import { randomUUID } from 'node:crypto';
import { safeContentTabURL } from '../public/content-tab-descriptor.js';

// Ephemeral presentation state. Durable tabs/history remain owned by ContentTabs.
// No page text, cookies, credentials, screenshots, or executable selectors travel here.
export class ProjectFollow {
  constructor({ validate, tabs, lookup, validationStamp, changed = () => {}, now = Date.now, limit = 128 } = {}) {
    Object.assign(this, { validate, tabs, validationStamp, changed, now, limit });
    this.lookup=lookup||((value,id)=>this.tabs(value).find(tab=>tab.id===id));
    this.validated=new Map();this.validatedStamp=null;
    this.epoch = randomUUID(); this.revision = 0; this.scopes = new Map(); this.clients = new Map();
  }
  key(value) {
    if (!['project', 'workspace'].includes(value.scope) || typeof value.id !== 'string' || !value.id || value.id.length > 200) throw Error('Choose an existing project or workspace.');
    const key=JSON.stringify([value.scope, value.id]);
    if(!this.validationStamp){this.validate(value);return key;}
    for(let attempt=0;attempt<2;attempt++){
      const stamp=this.validationStamp();
      if(stamp!==this.validatedStamp){this.validated.clear();this.validatedStamp=stamp;}
      if(!this.validated.has(key)){
        this.validate(value);
        if(this.validationStamp()!==stamp)continue;
      }
      this.validated.delete(key);this.validated.set(key,true);
      while(this.validated.size>this.limit)this.validated.delete(this.validated.keys().next().value);
      return key;
    }
    throw Error('Project or workspace changed while checking access. Retry shortly.');
  }
  handle(value, actor = 'local') {
    if (typeof value.clientId !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(value.clientId)) throw Error('Invalid follow client.');
    const client = actor + ':' + value.clientId, now = this.now();
    for (const [id, entry] of this.clients) if (entry.expires <= now) this.clients.delete(id);
    if (value.action === 'leave') { if(this.clients.get(client)?.key===JSON.stringify([value.scope,value.id]))this.clients.delete(client);return { ok: true }; }
    const key = this.key(value);
    if (!['join', 'update'].includes(value.action)) throw Error('Unknown follow action.');
    if (value.action === 'update') {
      const lease = this.clients.get(client);
      if (!lease || lease.key !== key) throw Error('Join this visible scope before following.');
      if (!Number.isSafeInteger(value.sequence) || value.sequence <= lease.sequence) return this.snapshot(key);
      const state = normalizeFollowState(value.state);
      const tab=state.tabId&&this.lookup(value,state.tabId);
      if (state.tabId && !tab) throw Error('The selected tab no longer belongs to this scope.');
      if (state.childTabId && (tab?.type!=='chat'||!this.lookup({scope:'chat',id:tab.chatId},state.childTabId)))throw Error('The selected child no longer belongs to this chat.');
      lease.sequence = value.sequence;
      const entry = { scope: value.scope, id: value.id, epoch: this.epoch, revision: ++this.revision, actor: client, state };
      this.scopes.delete(key); this.scopes.set(key, entry);
      while (this.scopes.size > this.limit) this.scopes.delete(this.scopes.keys().next().value);
      this.changed(entry);
    } else if (!this.clients.has(client) || this.clients.get(client).key !== key) {
      if (this.clients.size >= 512) throw Error('Too many active follow clients.');
      this.clients.set(client, { key, sequence: 0, expires: now + 45000, actor });
    }
    this.clients.get(client).expires = now + 45000;
    return this.snapshot(key);
  }
  snapshot(key) { return this.scopes.get(key) || { epoch: this.epoch, revision: 0, state: null }; }
  subscribed(actor, value) {
    const key = JSON.stringify([value.scope, value.id]);
    return [...this.clients.values()].some(entry => entry.actor === actor && entry.key === key && entry.expires > this.now());
  }
  removeActor(actor) { for (const [id, value] of this.clients) if (value.actor === actor) this.clients.delete(id); }
}

export function normalizeFollowState(value) {
  if (!value || typeof value !== 'object' || JSON.stringify(value).length > 8192) throw Error('Invalid follow state.');
  const tabId = value.tabId === null ? null : value.tabId;
  if (tabId !== null && (typeof tabId !== 'string' || !tabId || tabId.length > 250)) throw Error('Invalid selected tab.');
  const result = { tabId };
  if(value.documentVersion!==undefined){if(typeof value.documentVersion!=='string'||!/^([0-9a-f]{64})$/.test(value.documentVersion))throw Error('Invalid document position version.');result.documentVersion=value.documentVersion;}
  if(value.browser){const url=safeContentTabURL(value.browser.url);if(!url||typeof value.browser.entryId!=='string'||value.browser.entryId.length>200)throw Error('Invalid browser position identity.');result.browser={url,entryId:value.browser.entryId};}
  if(value.childTabId!==undefined){if(typeof value.childTabId!=='string'||!value.childTabId||value.childTabId.length>250)throw Error('Invalid selected child.');result.childTabId=value.childTabId;}
  if (['overview', 'projects', 'chats', 'tabs', 'configuration', 'sources', 'files', 'details'].includes(value.page)) result.page = value.page;
  if(value.terminal){if(!Number.isSafeInteger(value.terminal.line)||value.terminal.line<0||value.terminal.line>100000000||typeof value.terminal.follow!=='boolean')throw Error('Invalid terminal position.');result.terminal={line:value.terminal.line,follow:value.terminal.follow};}
  if(value.conversation){const p=value.conversation;if(typeof p.key!=='string'||p.key.length>200||!Number.isFinite(p.offset)||Math.abs(p.offset)>1000000||typeof p.follow!=='boolean'||p.index!==undefined&&(!Number.isSafeInteger(p.index)||p.index<0))throw Error('Invalid conversation position.');result.conversation={key:p.key,offset:p.offset,follow:p.follow,...(p.index!==undefined?{index:p.index}:{})};}
  for(const positionsKey of ['positions','documentPositions'])if (Array.isArray(value[positionsKey])) {
    if(positionsKey==='documentPositions'&&!result.documentVersion)throw Error('Document positions require an approved version.');
    if (value[positionsKey].length > 24) throw Error('Too many scroll positions.');
    result[positionsKey] = value[positionsKey].map(item => {
      if (!item || typeof item.path !== 'string' || !/^(root|[0-9]+(?:\.[0-9]+){0,30})$/.test(item.path) || item.path.length > 180) throw Error('Invalid scroll target.');
      const out = { path: item.path };
      for (const field of ['top', 'left', 'x', 'y']) {
        if (!Number.isFinite(item[field]) || Math.abs(item[field]) > 100000000) throw Error('Invalid scroll position.');
        out[field] = field === 'x' || field === 'y' ? Math.max(0, Math.min(1, item[field])) : item[field];
      }
      return out;
    });
  }
  return result;
}
