import path from 'node:path';
import {websiteNotification,portableWebsiteNotification} from './website-notification.js';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { atomicJSON, readJSON } from '../../shared/files.js';
import { RemoteCommandJournal } from '../remote/remote-command-journal.js';

const types = new Set(['chat.completed', 'review.required', 'schedule.completed', 'device.added', 'device.reconnected', 'browser.issue','website.notification','schedule.error']);
const sharedLogTypes=new Set(['chat.queued','chat.running','chat.awaiting_input','chat.completed','chat.failed','chat.cancelled','chat.interrupted','chat.deleted','transport.online','transport.offline','transport.device_added','browser.open','browser.unload','app.started','app.stopping','api.failed']);
const limits = { notifications: 1000, outbox: 500 };
export function safeLog(value, limit = 1000) {
  return String(value || '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
    .replace(/\b(?:Bearer|Basic)\s+\S+/gi, '[credential]')
    .replace(/\b(?:Cookie|Set-Cookie)\s*:\s*[^\r\n]+/gi, '[credential]')
    .replace(/\b(?:token|password|secret|authorization|api[_-]?key|code)\s*[:=]\s*["']?[^\s,"']+/gi, '[credential]')
    .replace(/https?:\/\/[^\s]+/gi, raw => { try { const u = new URL(raw); return u.origin + u.pathname; } catch { return '[url]'; } })
    .slice(0, limit);
}
const hiddenField = /token|password|passwd|secret|authorization|api[_-]?key|cookie|credential|prompt|transcript/i;
function diagnostic(value, seen = new Set(), depth = 0) {
  if (typeof value === 'string') {const text=safeLog(value,Infinity);return text.length>128000?text.slice(0,128000)+'\n[diagnostic field exceeded its size limit]':text;}
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value === undefined) return null;
  if (depth >= 8 || seen.has(value)) return '[nested diagnostic omitted]';
  if (typeof value !== 'object') return safeLog(String(value));
  seen.add(value);
  const fields = value instanceof Error ? { name:value.name, message:value.message, stack:value.stack, ...(value.cause ? {cause:value.cause} : {}), ...value } : value;
  const result = Array.isArray(fields) ? fields.slice(0,100).map(item => diagnostic(item,seen,depth+1)) : Object.fromEntries(Object.entries(fields).slice(0,100).map(([key,item]) => [safeLog(key), hiddenField.test(key) ? '[withheld]' : diagnostic(item,seen,depth+1)]));
  seen.delete(value); return result;
}
// Plain, bounded notification text: no control characters or Markdown markup.
function notificationText(value, limit) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]*)`/g, '$1').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^[#>*\-+\s]+/gm, '').replace(/[*_~]{1,3}/g, '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > limit ? text.slice(0, limit - 1).trimEnd() + '…' : text;
}
function lastReply(run) { const events = Array.isArray(run?.events) ? run.events : []; for (let index = events.length - 1; index >= 0 && index >= events.length - 200; index--) { const event = events[index]; if (event.role === 'assistant' && !event.data?.reasoning && typeof event.text === 'string' && event.text.trim()) return event.text; } return ''; }
function pendingPreview(pending) {
  if (pending?.type === 'question') return 'Question: ' + (pending.question || pending.text || '');
  const details = pending?.details || {};
  const action = { shell: 'Run command', write: 'Edit file', read: 'Read files', mcp: 'Use connected tool', url: 'Open website' }[details.kind] || 'Allow app action';
  return action + ': ' + (details.fullCommandText || details.fileName || details.path || details.url || [details.serverName, details.toolName].filter(Boolean).join(' · ') || 'review the request');
}
function reviewRequests(run){
 const requests=new Map(),pending=run.status==='awaiting_input'?run.pending:null;
 if(pending?.id&&['question','permission'].includes(pending.type))requests.set(pending.id,{id:pending.id,kind:pending.type,preview:pendingPreview(pending)});
 for(const question of run.userQuestions||[])if(question.status==='pending'&&question.id&&!requests.has(question.id))requests.set(question.id,{id:question.id,kind:'question',preview:'Question: '+(question.question||question.text||question.header||'')});
 return [...requests.values()];
}
export class ActivityStore extends EventEmitter {
  constructor(home, { clock = () => new Date(), identity = () => null, publish } = {}) {
    super(); this.file = path.join(home, 'activity.json'); this.clock = clock; this.identity = identity; this.publish = publish;
    this.data = readJSON(this.file, { version: 1, notifications: [], logs: [], outbox: [], preferences: { systemEnabled: false, 'chat.completed': true, 'review.required': true, 'schedule.completed': true, 'device.added': true, 'device.reconnected': true } });
    this.data.outbox ||= []; this.data.preferences ||= {}; this.states = new Map();
    this.logClient = new RemoteCommandJournal(home, {workerURL:new URL('./log-worker.js',import.meta.url)});
    this.logTail = this.logClient.ready.then(() => { if(Object.hasOwn(this.data,'logs')){delete this.data.logs;this.save();} });
    this.logTail.catch(error => { this.logFailure = error; });
  }
  save() { const persist=()=>atomicJSON(this.file,this.data);return this.performanceDiagnostics?this.performanceDiagnostics.measureSync('activity.persist',persist):persist(); }
  notifications() { return { items: [...this.data.notifications].reverse(), preferences: { quietMode:true,inAppEnabled:true,...this.data.preferences } }; }
  async logs(value = {}) { await this.logTail; if(this.logFailure)throw this.logFailure; return this.logClient.request('query', typeof value === 'object' && value !== null ? value : {limit:value}); }
  async logDetail(id) { await this.logTail; if(this.logFailure)throw this.logFailure; return this.logClient.request('detail',id); }
  preferences(value) {
    for (const [key, enabled] of Object.entries(value || {})) {
      if ((!types.has(key) && !['systemEnabled','quietMode','inAppEnabled','forwardWebsiteNotifications'].includes(key)) || typeof enabled !== 'boolean') throw new Error('Choose valid notification preferences.');
    }
    Object.assign(this.data.preferences, value); this.save(); return this.notifications();
  }
  read(id) {
    const item = this.data.notifications.find(item => item.id === id); if (!item) throw new Error('Notification not found.');
    item.readAt ||= this.clock().toISOString(); this.save(); return { ok: true };
  }
  scheduleError({scheduleId,action='save',code='SCHEDULE_CONFIGURATION_FAILED',correlationId}={}) {
    const reasons={SCHEDULE_EXECUTION_UNSUPPORTED:'The selected provider cannot enforce the required filesystem, network and child-process restrictions. Keep the current provider or choose a verified execution adapter.',SCHEDULE_EXECUTOR_UNAVAILABLE:'The host command sandbox could not be verified on this computer. Refresh or repair its native runtime and retry with the same access policy.',SCHEDULE_CONFIGURATION_FAILED:'Schedule configuration was rejected. Review the error in the schedule editor and retry; the previous saved configuration is retained.'};
    if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(scheduleId||'')||!['save','preview','preflight','reconcile','revoke-access','clear-provider-override'].includes(action))throw Error('Choose a schedule and configuration action.');
    if(!Object.hasOwn(reasons,code))code='SCHEDULE_CONFIGURATION_FAILED';
    const previous=this.data.notifications.find(item=>item.type==='schedule.error'&&item.scheduleId===scheduleId&&item.action===action&&item.code===code&&!item.readAt);
    if(previous)return previous;
    const item={id:randomUUID(),type:'schedule.error',level:'error',...(this.hostId?.()?{hostId:this.hostId()}:{}),title:'Schedule '+action+' failed',body:reasons[code],scheduleId,action,code,correlationId:/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(correlationId||'')?correlationId:randomUUID(),createdAt:this.clock().toISOString(),silent:true};
    this.data.notifications.push(item);this.data.notifications=this.data.notifications.slice(-limits.notifications);this.save();this.emit('notification',item);this.queue('notifications',item);return item;
  }
  browserIssue(detail = {}) {
    const {kind,windowId}=detail;
    if(!['load-error','history-conflict','site-notification'].includes(kind)||typeof windowId!=='string'||!windowId||windowId.length>128)throw Error('Choose a browser notification and its original window.');
    const issue={kind,windowId};
    for(const key of ['tabId','logId','profileId','origin','siteNotificationId'])if(detail[key]!==undefined){if(typeof detail[key]!=='string'||!detail[key]||detail[key].length>512)throw Error('Invalid browser notification reference.');issue[key]=detail[key];}
    if(kind==='history-conflict'){
      const scope=detail.scope;
      if(!scope||!['main','team','workspace','project','chat'].includes(scope.scope)||typeof scope.id!=='string'||!scope.id||scope.id.length>256||scope.hostId!==undefined&&(typeof scope.hostId!=='string'||scope.hostId.length>128))throw Error('Choose the original browser history scope.');
      issue.scope={scope:scope.scope,id:scope.id,...(scope.hostId?{hostId:scope.hostId}:{})};
    }else if(!issue.tabId)throw Error('Choose the browser tab.');
    const existing=this.data.notifications.find(item=>!item.readAt&&item.type==='browser.issue'&&item.browserIssue?.kind===kind&&item.browserIssue.windowId===windowId&&(kind!=='site-notification'||item.browserIssue.siteNotificationId===issue.siteNotificationId)&&JSON.stringify(item.browserIssue.scope||item.browserIssue.tabId)===JSON.stringify(issue.scope||issue.tabId));
    const title=safeLog(detail.title||'Browser needs attention',240),body=safeLog(detail.body||'Open Notifications to review this browser issue.',1500);
    if(existing){if(existing.title!==title||existing.body!==body||existing.browserIssue.logId!==issue.logId){Object.assign(existing,{title,body,browserIssue:issue,updatedAt:this.clock().toISOString()});this.save();}return existing;}
    const item={id:randomUUID(),type:'browser.issue',title,body,browserIssue:issue,silent:true,createdAt:this.clock().toISOString()};
    this.data.notifications.push(item);this.data.notifications=this.data.notifications.slice(-limits.notifications);this.save();this.emit('notification',item);
    // Browser recovery references belong to this host/window; do not publish them to account activity.
    return item;
  }
  websiteNotification(detail){
    const value=websiteNotification(detail),previous=this.data.notifications.find(item=>item.type===value.type&&item.browserIssue?.siteNotificationId===value.browserIssue.siteNotificationId&&item.origin===value.origin&&item.browserIssue?.profileId===value.browserIssue.profileId);
    if(previous)return previous;
    const item={id:randomUUID(),createdAt:this.clock().toISOString(),...value,silent:this.data.preferences.inAppEnabled===false||this.data.preferences[value.type]===false};
    this.data.notifications.push(item);this.data.notifications=this.data.notifications.slice(-limits.notifications);this.save();this.emit('notification',item);
    if(this.data.preferences.forwardWebsiteNotifications===true&&this.data.preferences[value.type]!==false)this.queue('notifications',portableWebsiteNotification(item));
    return item;
  }
  log(level, event, message, extra = {}) {
    if (!['info', 'warning', 'error'].includes(level) || !/^[a-z][a-z0-9_.-]{0,79}$/.test(event || '')) throw new Error('Invalid log event.');
    const full = message instanceof Error ? message.stack || message.message : String(message || '');
    const redacted=safeLog(full,Infinity),bounded=Buffer.from(redacted).subarray(0,128000).toString('utf8');
    const item = { id: randomUUID(), createdAt: this.clock().toISOString(), level, event,
      summary: safeLog(full.split('\n')[0] || event,240), message: bounded,
      ...Object.fromEntries(['hostId','chatId','scheduleId','source'].filter(key=>typeof extra[key]==='string').map(key=>[key,safeLog(extra[key],256)])),
      details: diagnostic({...extra,...(message instanceof Error ? {error:message} : {})}) };
    if(Buffer.byteLength(redacted)>128000)item.truncated=true;
    if(Buffer.byteLength(JSON.stringify(item))>256*1024){item.details='Diagnostic fields exceed the entry size limit.';item.truncated=true;}
    // Keep the caller's synchronous event identity; ordered worker writes are
    // drained before reads/shutdown. Persistence failures are surfaced by Logs.
    this.logTail = this.logTail.then(() => this.logClient.request('append',item));
    this.logTail.catch(error => { this.logFailure = error; });
    this.emit('log', item);if(sharedLogTypes.has(event))this.queue('logs',{id:item.id,event,level,source:'desktop',createdAt:item.createdAt,...(item.hostId?{hostId:item.hostId}:{})}); return item;
  }
  add(type, detail = {}) {
    if (!types.has(type)) throw new Error('Unknown notification type.');
    if(type==='browser.issue')return this.browserIssue(detail);
    const generic = { 'chat.completed': 'Chat completed', 'review.required': 'Review required', 'schedule.completed': 'Schedule completed', 'device.added': 'New device connected', 'device.reconnected': 'Computer reconnected' }[type];
    const offlineSeconds = Math.max(0, Math.floor(Number(detail.offlineSeconds) || 0));
    // Useful text: the chat's title, what happened, and which computer it came from.
    const chatTitle = notificationText(detail.chatTitle, 120), preview = notificationText(detail.preview, 360), hostName = notificationText(detail.hostName, 80);
    const completion=['chat.completed','schedule.completed'].includes(type);
    const requestKey=type==='review.required'&&detail.requestId?[detail.hostId,detail.chatId,detail.requestId].join(':'):completion&&detail.turnId?[type,detail.hostId,detail.chatId,detail.turnId].join(':'):null;
    if(requestKey){const previous=this.data.notifications.find(item=>item.requestKey===requestKey);if(previous)return previous;}
    const title = chatTitle ? (type === 'review.required' ? (detail.requestKind==='permission'?'Approval required · ':detail.requestKind==='question'?'Question · ':'Needs attention · ') : type === 'schedule.completed' ? 'Schedule done · ' : '') + chatTitle : generic;
    const body = type === 'device.reconnected' ? `Connected to the relay after approximately ${offlineSeconds < 60 ? offlineSeconds + ' seconds' : Math.round(offlineSeconds / 60) + ' minutes'} offline.` : preview || (chatTitle ? generic + '.' : 'Open Proteus to view the details.');
    const item = { id: randomUUID(), type, title, body, ...(hostName ? { hostName } : {}), createdAt: this.clock().toISOString(), ...Object.fromEntries(['hostId', 'chatId', 'scheduleId', 'deviceId'].filter(key => typeof detail[key] === 'string').map(key => [key, detail[key].slice(0, 128)])), ...(type === 'device.reconnected' ? { offlineSeconds } : {}) };
    if(requestKey)item.requestKey=requestKey;
    if(type==='review.required'&&detail.requestId)Object.assign(item,{requestId:detail.requestId,requestKind:detail.requestKind});
    if(completion&&this.data.preferences.quietMode!==false)item.sound=false;
    item.silent=this.data.preferences.inAppEnabled===false||this.data.preferences[type]===false||(this.data.preferences.quietMode!==false&&['device.added','device.reconnected'].includes(type));
    this.data.notifications.push(item); this.data.notifications = this.data.notifications.slice(-limits.notifications);
    this.save(); this.emit('notification', item);this.queue('notifications',item);return item;
  }
  queue(kind,item) {
    if(!['notifications','logs','history'].includes(kind))throw new Error('Unsupported shared activity.');
    const identity=this.identity();if(!identity||!this.publish)return;
    this.data.outbox.push({kind,item,accountId:identity.accountId,workspaceId:identity.workspaceId,origin:identity.origin});
    while(this.data.outbox.filter(row=>row.item.type==='website.notification').length>100)this.data.outbox.splice(this.data.outbox.findIndex(row=>row.item.type==='website.notification'),1);
    this.data.outbox=this.data.outbox.slice(-limits.outbox);this.save();void this.flush();
  }
  attach(engine, hostId, hostName = () => '') {
    this.hostId=hostId;
    const describe = run => ({ hostId: hostId(), hostName: hostName(), chatId: run.id, chatTitle: run.title || run.schedule?.name || '' });
    const snapshot = run => ({ status: run.status, pending:reviewRequests({...run,userQuestions:[]})[0]?.id, questions:(run.userQuestions||[]).filter(question=>question.status==='pending').map(question=>question.id) });
    const reconcile=run=>{
      const active=new Set(reviewRequests(run).map(request=>request.id));let changed=false;
      for(const item of this.data.notifications)if(item.type==='review.required'&&item.chatId===run.id&&!item.readAt&&(!item.requestId||!active.has(item.requestId))){item.resolvedAt=this.clock().toISOString();item.readAt=item.resolvedAt;changed=true;}
      if(changed)this.save();
    };
    for (const run of engine.listRuns()){this.states.set(run.id, snapshot(run));reconcile(run);}
    this.listener = (run,change) => {
      if (!run?.id||change?.stream) return;
      if(run.deleted){reconcile({...run,pending:null,userQuestions:[]});this.states.delete(run.id);this.log('info','chat.deleted',`Chat ${run.id} deleted from Proteus.`,{hostId:hostId()});return;}
      const before = this.states.get(run.id); this.states.set(run.id, snapshot(run));
      reconcile(run);
      for(const request of reviewRequests(run))if(before?.pending!==request.id&&!before?.questions?.includes(request.id))this.add('review.required',{...describe(run),requestId:request.id,requestKind:request.kind,preview:request.preview});
      if (run.status === 'completed' && before?.status !== 'completed') {
        const scheduled = run.trigger !== 'chat';
        if (!scheduled || run.schedule.notifications?.onCompletion === true) this.add(scheduled ? 'schedule.completed' : 'chat.completed', { ...describe(run), turnId:run.turns?.at(-1)?.id||run.finishedAt||run.updatedAt, preview: lastReply(run), ...(scheduled ? { scheduleId: run.schedule.id } : {}) });
      }
      if (before?.status !== run.status) this.log(['failed', 'interrupted'].includes(run.status) ? 'warning' : 'info', 'chat.' + run.status, `Chat ${run.id}: ${run.status}.`, { hostId: hostId() });
    };
    engine.on('change', this.listener); this.engine = engine;
  }
  async flush() {
    if (this.flushing || !this.publish || this.closed) return;
    const identity = this.identity(); if (!identity) return;
    this.flushing = true;
    const deferred=new Set();
    try {
      while (this.data.outbox.length && !this.closed) {
        const row = this.data.outbox[0], current = this.identity();
        if(deferred.has(row))break;
        if (!current || current.accountId !== identity.accountId || current.workspaceId !== identity.workspaceId || current.origin !== identity.origin) break;
        const lifetime=row.item.type==='website.notification'?5*60000:7*86400000;
        if (row.accountId !== current.accountId || row.workspaceId !== current.workspaceId || row.origin !== current.origin || this.clock().getTime() - Date.parse(row.item.createdAt) > lifetime) { this.data.outbox.shift(); this.save(); continue; }
        const saved=(row.kind||'notifications')==='notifications'?this.data.notifications.find(item=>item.id===row.item.id):null;
        const historical=(row.kind||'notifications')==='notifications'&&(saved?.readAt||saved?.resolvedAt||this.clock().getTime()-Date.parse(row.item.createdAt)>300000);
        // Preserve history, but delayed upload must not turn an old/resolved
        // event into a fresh alert on another device.
        const item=historical?{...row.item,silent:true}:row.item;
        try { await this.publish(item, current,row.kind||'notifications'); } catch (error) {
          // Older servers do not accept website events yet. Keep those bounded
          // retry receipts until the coordinated web rollout, while allowing
          // ordinary notifications behind them to continue.
          if(['website.notification','schedule.error'].includes(row.item.type)&&[400,422].includes(error.status)){this.data.outbox.push(this.data.outbox.shift());deferred.add(row);this.save();continue;}
          // Permanently invalid events must not starve unrelated delivery. Authentication,
          // throttling and server outages remain retryable until their owner resolves them.
          if([400,413,422].includes(error.status)){this.data.outbox.shift();this.save();continue;}
          break;
        }
        this.data.outbox.shift(); this.save();
      }
    } finally { this.flushing = false; }
  }
  async close() { this.closed = true; this.engine?.off('change', this.listener); try { await this.logTail; } finally { await this.logClient.close(); } }
}
