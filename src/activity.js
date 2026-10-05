import path from 'node:path';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { atomicJSON, readJSON } from './files.js';

const types = new Set(['chat.completed', 'review.required', 'schedule.completed', 'device.added', 'device.reconnected']);
const sharedLogTypes=new Set(['chat.queued','chat.running','chat.awaiting_input','chat.completed','chat.failed','chat.cancelled','chat.interrupted','chat.deleted','transport.online','transport.offline','transport.device_added','browser.open','browser.unload','app.started','app.stopping','api.failed']);
const limits = { notifications: 1000, logs: 2000, outbox: 500 };
export function safeLog(value) {
  return String(value || '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
    .replace(/\b(?:Bearer|Basic)\s+\S+/gi, '[credential]')
    .replace(/\b(?:token|password|secret|authorization|api[_-]?key|code)\s*[:=]\s*["']?[^\s,"']+/gi, '[credential]')
    .replace(/https?:\/\/[^\s]+/gi, raw => { try { const u = new URL(raw); return u.origin + u.pathname; } catch { return '[url]'; } })
    .slice(0, 1000);
}
export class ActivityStore extends EventEmitter {
  constructor(home, { clock = () => new Date(), identity = () => null, publish } = {}) {
    super(); this.file = path.join(home, 'activity.json'); this.clock = clock; this.identity = identity; this.publish = publish;
    this.data = readJSON(this.file, { version: 1, notifications: [], logs: [], outbox: [], preferences: { systemEnabled: false, 'chat.completed': true, 'review.required': true, 'schedule.completed': true, 'device.added': true, 'device.reconnected': true } });
    this.data.outbox ||= []; this.data.preferences ||= {}; this.states = new Map();
  }
  save() { atomicJSON(this.file, this.data); }
  notifications() { return { items: [...this.data.notifications].reverse(), preferences: { ...this.data.preferences } }; }
  logs(limit = 200) { return { items: this.data.logs.slice(-Math.max(1, Math.min(1000, Number(limit) || 200))).reverse() }; }
  preferences(value) {
    for (const [key, enabled] of Object.entries(value || {})) {
      if ((!types.has(key) && key !== 'systemEnabled') || typeof enabled !== 'boolean') throw new Error('Choose valid notification preferences.');
    }
    Object.assign(this.data.preferences, value); this.save(); return this.notifications();
  }
  read(id) {
    const item = this.data.notifications.find(item => item.id === id); if (!item) throw new Error('Notification not found.');
    item.readAt ||= this.clock().toISOString(); this.save(); return { ok: true };
  }
  log(level, event, message, extra = {}) {
    if (!['info', 'warning', 'error'].includes(level) || !/^[a-z][a-z0-9_.-]{0,79}$/.test(event || '')) throw new Error('Invalid log event.');
    const item = { id: randomUUID(), createdAt: this.clock().toISOString(), level, event, message: safeLog(message), ...(extra.hostId ? { hostId: extra.hostId } : {}) };
    this.data.logs.push(item); this.data.logs = this.data.logs.slice(-limits.logs); this.save(); this.emit('log', item);if(sharedLogTypes.has(event))this.queue('logs',{id:item.id,event,level,source:'desktop',createdAt:item.createdAt,...(item.hostId?{hostId:item.hostId}:{})}); return item;
  }
  add(type, detail = {}) {
    if (!types.has(type)) throw new Error('Unknown notification type.');
    const title = { 'chat.completed': 'Chat completed', 'review.required': 'Review required', 'schedule.completed': 'Schedule completed', 'device.added': 'New device connected', 'device.reconnected': 'Mac reconnected' }[type];
    const offlineSeconds = Math.max(0, Math.floor(Number(detail.offlineSeconds) || 0));
    const body = type === 'device.reconnected' ? `Connected to the relay after approximately ${offlineSeconds < 60 ? offlineSeconds + ' seconds' : Math.round(offlineSeconds / 60) + ' minutes'} offline.` : 'Open Proteus to view the details.';
    const item = { id: randomUUID(), type, title, body, createdAt: this.clock().toISOString(), ...Object.fromEntries(['hostId', 'chatId', 'scheduleId', 'deviceId'].filter(key => typeof detail[key] === 'string').map(key => [key, detail[key].slice(0, 128)])), ...(type === 'device.reconnected' ? { offlineSeconds } : {}) };
    this.data.notifications.push(item); this.data.notifications = this.data.notifications.slice(-limits.notifications);
    this.save(); this.emit('notification', item);this.queue('notifications',item);return item;
  }
  queue(kind,item) {
    if(!['notifications','logs','history'].includes(kind))throw new Error('Unsupported shared activity.');
    const identity=this.identity();if(!identity||!this.publish)return;
    this.data.outbox.push({kind,item,accountId:identity.accountId,workspaceId:identity.workspaceId,origin:identity.origin});
    this.data.outbox=this.data.outbox.slice(-limits.outbox);this.save();void this.flush();
  }
  attach(engine, hostId) {
    const snapshot = run => ({ status: run.status, pending: run.pending?.id });
    for (const run of engine.listRuns()) this.states.set(run.id, snapshot(run));
    this.listener = run => {
      if (!run?.id) return;
      if(run.deleted){this.states.delete(run.id);this.log('info','chat.deleted',`Chat ${run.id} deleted from Proteus.`,{hostId:hostId()});return;}
      const before = this.states.get(run.id); this.states.set(run.id, snapshot(run));
      if (run.status === 'awaiting_input' && run.pending?.id && before?.pending !== run.pending.id) this.add('review.required', { hostId: hostId(), chatId: run.id });
      if (run.status === 'completed' && before?.status !== 'completed') {
        const scheduled = run.trigger !== 'chat';
        if (!scheduled || run.schedule.notifications?.onCompletion === true) this.add(scheduled ? 'schedule.completed' : 'chat.completed', { hostId: hostId(), chatId: run.id, ...(scheduled ? { scheduleId: run.schedule.id } : {}) });
      }
      if (before?.status !== run.status) this.log(['failed', 'interrupted'].includes(run.status) ? 'warning' : 'info', 'chat.' + run.status, `Chat ${run.id}: ${run.status}.`, { hostId: hostId() });
    };
    engine.on('change', this.listener); this.engine = engine;
  }
  async flush() {
    if (this.flushing || !this.publish || this.closed) return;
    const identity = this.identity(); if (!identity) return;
    this.flushing = true;
    try {
      while (this.data.outbox.length && !this.closed) {
        const row = this.data.outbox[0], current = this.identity();
        if (!current || current.accountId !== identity.accountId || current.workspaceId !== identity.workspaceId || current.origin !== identity.origin) break;
        if (row.accountId !== current.accountId || row.workspaceId !== current.workspaceId || row.origin !== current.origin || this.clock().getTime() - Date.parse(row.item.createdAt) > 7 * 86400000) { this.data.outbox.shift(); this.save(); continue; }
        try { await this.publish(row.item, current,row.kind||'notifications'); } catch (error) {
          // Permanently invalid events must not starve unrelated delivery. Authentication,
          // throttling and server outages remain retryable until their owner resolves them.
          if([400,413,422].includes(error.status)){this.data.outbox.shift();this.save();continue;}
          break;
        }
        this.data.outbox.shift(); this.save();
      }
    } finally { this.flushing = false; }
  }
  close() { this.closed = true; this.engine?.off('change', this.listener); }
}
