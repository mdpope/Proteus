import {displayText} from './tool-activity.js';
import { RunHistoryCache } from './run-history-cache.js';
import {startTurn,pauseTurn,resumeTurn,finishTurn,interruptTiming} from './run-timing.js';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { atomicJSON, jsonFiles, readJSON } from './files.js';
import { ScheduleStore, lastDue, revision, validateSchedule } from './schedules.js';
import { RehearsalProvider } from './rehearsal.js';
import { PermissionStore, permissionContext } from './permissions.js';

import { chatModelOptions } from './model-catalog.js';
import { agentName } from '../public/agent-name.js';
import { ChatAttachmentConsents } from './chat-attachment-consent.js';

const active = new Set(['queued', 'running', 'awaiting_input']);
export function suggestedChatTitle(prompt) {
  const clean = String(prompt || '').replace(/\s+/g, ' ').trim().replace(/^(?:please\s+|can you\s+|could you\s+|i (?:want|need) (?:you )?to\s+)/i, '');
  const sentence = clean.split(/(?<=[.!?])\s/)[0].replace(/[.!?]+$/, '');
  return (sentence.split(' ').filter(Boolean).slice(0, 9).join(' ') || 'New chat').slice(0, 90);
}
export class Engine extends EventEmitter {
  constructor(home, providers = {}, clock = () => new Date()) {
    super();this.historyCache=new RunHistoryCache(id=>path.join(home,'runs',id+'.json')); this.home = home; this.clock = clock;
    this.schedules = new ScheduleStore(path.join(home, 'schedules'));
    this.permissions = new PermissionStore(home);
    this.runsDir = path.join(home, 'runs');
    this.tombstoneFile = path.join(home, 'chat-tombstones.json');
    this.tombstones = readJSON(this.tombstoneFile, {});
    this.providers = { rehearsal: new RehearsalProvider(), ...providers };
    this.queuedSteers = new Map(); this.pending = new Map(); this.questionQueues = new Map(); this.running = null; this.backgroundRuns = new Map(); this.executions = new Set(); this.stopping = false;
    fs.mkdirSync(this.runsDir, { recursive: true, mode: 0o700 });
    this.journal = readJSON(path.join(home, 'scheduler.json'), { lastPoll: clock().toISOString(), slots: {} });
    this.runs = new Map();
    for (const file of jsonFiles(this.runsDir)) {
      try {
        const run = readJSON(file);
        if (this.tombstones[run.id]) { fs.rmSync(file, { force: true }); continue; }
        if (run.trigger === 'chat' && (!run.titleRevision || !run.titleKind)) {
          run.titleRevision ||= randomUUID(); run.titleKind ||= 'legacy';
          atomicJSON(file, run);
        }
        if (active.has(run.status)) {
          interruptTiming(run);
          for(const event of run.events)if(event.data?.question?.status==='pending')event.data.question.status='interrupted';
          run.status = 'interrupted'; run.pending = null; delete run.liveMessages;
          run.failureEventAt = clock().toISOString(); delete run.failureReviewedAt;
          for (const event of run.events) if (event.data?.delivery?.state === 'sending') Object.assign(event.data.delivery, {state:'failed',error:'The runner stopped before confirming delivery. Inspect the provider session before retrying.'});
          run.events.push({ role: 'system', text: 'The runner stopped. Continue this session to recover; no work was silently replayed.', at: clock().toISOString() });
          atomicJSON(file, run);
        }
        this.runs.set(run.id, run);this.historyCache.attach(run);
      } catch (error) { this.recoveryErrors ??= []; this.recoveryErrors.push({ file, error: error.message }); }
    }
  }
  now() { return this.clock().toISOString(); }
  persist(run) { if(this.tombstones[run.id]||!this.runs.has(run.id))throw new Error('Deleted chat cannot be restored.');
    if(run.chatPermission && run.chatPermission.contextId !== permissionContext(run.schedule).id){run.chatPermission=null;run.chatPermissionRevision=randomUUID();}
    run.updatedAt = this.now(); atomicJSON(path.join(this.runsDir, `${run.id}.json`), run); this.historyCache.attach(run);this.historyCache.trim(run.id);this.emit('change', run); }
  event(run, role, text, data) {
    run.events.push({ role, text, ...(role === 'assistant' ? { agentName: agentName(run) } : {}), data:{...data,...(run.turns?.at(-1)&&['running','awaiting_input'].includes(run.status)?{turnId:run.turns.at(-1).id}:{})}, at: this.now() }); this.persist(run);
  }
  stream(run, messageId, text) {
    run.liveMessages ??= {}; run.liveMessages[messageId] = (run.liveMessages[messageId] || '') + text;
    this.emit('change', run);
  }
  listRuns() { return [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  visibleRuns(includeArchived = false) { return this.listRuns().filter(run => includeArchived || !run.archivedAt); }
  getRun(id) { const run = this.runs.get(id); if (!run) throw new Error('Run not found.'); return run; }
  describePermissions(run) {
    return this.permissions.describeRun(run);
  }
  setChatPermission(id, mode, expectedContextId, expectedChatRevision) {
    const run = this.getRun(id), context = this.permissions.describe(run.schedule);
    if (run.trigger !== 'chat') throw new Error('Chat-only approval requires a chat.');
    if (context.id !== expectedContextId) throw new Error('Workspace configuration changed. Review the permission context.');
    if (expectedChatRevision !== (run.chatPermissionRevision || null)) throw new Error('Chat approval changed. Refresh before saving.');
    if (!['autopilot', 'inherit'].includes(mode)) throw new Error('Choose chat auto-approval or inherit workspace settings.');
    run.chatPermission = mode === 'autopilot' ? { mode, contextId: context.id, grantedAt: this.now() } : null;
    run.chatPermissionRevision = randomUUID(); this.persist(run); this.recheckPermissions();
    return this.describePermissions(run);
  }
  decidePermission(run, request) {
    const profile = this.describePermissions(run);
    return { ...this.permissions.decide(run.schedule, request, profile), source: profile.source };
  }
  renameChat(id, title, expectedTitleRevision) {
    const run = this.getRun(id);
    if (run.trigger !== 'chat') throw new Error('Only chats can be renamed.');
    if (typeof expectedTitleRevision !== 'string' || expectedTitleRevision !== run.titleRevision) throw new Error('This chat name changed. Refresh before saving.');
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 200 || /[\x00-\x1f]/.test(title)) throw new Error('Enter a chat name between 1 and 200 characters.');
    run.title = title.trim(); run.titleKind = 'manual'; run.titleRevision = randomUUID(); this.persist(run);
    return { id: run.id, title: run.title, titleKind: run.titleKind, titleRevision: run.titleRevision };
  }
  lifecycle(id, action, { expectedUpdatedAt, expectedArchivedAt } = {}) {
    const run = this.getRun(id);
    if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== run.updatedAt) throw new Error('This chat changed. Refresh it before continuing.');
    if (expectedArchivedAt !== undefined && expectedArchivedAt !== (run.archivedAt || null)) throw new Error('This chat archive state changed. Refresh it before continuing.');
    if (active.has(run.status) || run.deferredStart || run.queuedMessages?.length || this.running?.id===run.id || [...this.backgroundRuns.values()].some(slot=>slot.id===run.id) || this.pending.has(run.id)) throw new Error('Finish or cancel the active or queued chat work before archiving or deleting it.');
    if (action === 'archive' || action === 'unarchive') {
      run.archivedAt = action === 'archive' ? (run.archivedAt || this.now()) : null;
      atomicJSON(path.join(this.runsDir, `${run.id}.json`), run);
      this.emit('change', run);
      const result = { id: run.id, archivedAt: run.archivedAt, archived: !!run.archivedAt, updatedAt: run.updatedAt };
      this.emit('lifecycle', result);
      return result;
    }
    if (action !== 'delete') throw new Error('Unknown chat action.');
    if (path.basename(run.id) !== run.id || !/^[a-zA-Z0-9_-]{1,100}$/.test(run.id)) throw new Error('Invalid chat record identifier.');
    const deletedAt = this.now();
    this.tombstones[run.id] = deletedAt;
    atomicJSON(this.tombstoneFile, this.tombstones);
    fs.rmSync(path.join(this.runsDir, `${run.id}.json`), { force: true });
    this.runs.delete(run.id);this.historyCache.forget(run.id);
    this.emit('change', { id: run.id, deleted: true, deletedAt });
    const result = { id: run.id, deleted: true, deletedAt };
    this.emit('lifecycle', result);
    return result;
  }
  promoteChat(id) {
    const run=this.getRun(id);
    if(run.trigger!=='chat')throw new Error('Only an Internet Search can be promoted.');
    if(run.chatType!=='internet')return {id:run.id,chatType:'user',updatedAt:run.updatedAt};
    // One-way field mutation on the live run: streaming events must not block promotion.
    run.chatType='user';this.persist(run);
    const result={id:run.id,chatType:'user',updatedAt:run.updatedAt};this.emit('lifecycle',result);return result;
  }
  reviewFailure(id, expectedFailureEventAt) {
    const run=this.getRun(id);
    if(!['failed','interrupted'].includes(run.status))throw new Error('This chat does not have a failure to review.');
    const eventAt=run.failureEventAt||run.updatedAt;
    if(typeof expectedFailureEventAt!=='string'||expectedFailureEventAt!==eventAt)throw new Error('The chat changed. Reopen it to review the latest failure.');
    run.failureEventAt ||= eventAt;
    run.failureReviewedAt ||= this.now();
    atomicJSON(path.join(this.runsDir, `${run.id}.json`), run);this.emit('change',run);
    return {id:run.id,failureEventAt:run.failureEventAt,failureReviewedAt:run.failureReviewedAt,attentionRequired:false};
  }
  createRun(schedule, trigger = 'manual', slot = null, {deferStart=false} = {}) {
    schedule = this.prepareSchedule ? this.prepareSchedule(schedule, trigger) : schedule;
    validateSchedule(schedule);
    if (this.stopping) throw new Error('Runner is stopping.');
    if ([...this.runs.values()].some(run => run.schedule.id === schedule.id && active.has(run.status))) throw new Error('This schedule already has an active run.');
    for (const dir of [schedule.workspace.cwd, ...schedule.workspace.additionalDirectories]) if (!fs.statSync(dir).isDirectory()) throw new Error(`Workspace directory unavailable: ${dir}`);
    const run = {
      id: randomUUID(), schedule: structuredClone(schedule), scheduleRevision: revision(schedule),
      title: trigger === 'chat' ? (schedule.chatTitleManual ? schedule.name.trim() : suggestedChatTitle(schedule.prompt)) : schedule.name,
      ...(trigger === 'chat' ? { titleKind: schedule.chatTitleManual ? 'manual' : 'generated', titleRevision: randomUUID() } : {}),
      chatType:trigger==='chat'&&schedule.chatType==='internet'?'internet':trigger==='chat'?'user':'scheduled',
      trigger, slot, status: 'queued', createdAt: this.now(), updatedAt: this.now(),
      events: [{ role: 'user', text: schedule.prompt, at: this.now() }], pending: null,
      providerSessionId: null, usage: { inputTokens: 0, outputTokens: 0, observed: false },
      nextPrompt: schedule.prompt,...(deferStart?{deferredStart:true}:{})
    };
    this.runs.set(run.id, run); this.persist(run);if(!deferStart)queueMicrotask(() => this.drain()); return run;
  }
  verifyAttachmentDispatch(run,dispatch){if(!(this.attachmentConsents instanceof ChatAttachmentConsents)||!dispatch||typeof dispatch.proofId!=='string')throw new Error('Attachment send authorization is unavailable.');return this.attachmentConsents.assertPrepared({...dispatch,chatId:run.id,providerId:run.schedule.provider});}
  startDeferredRun(id,dispatch){const run=this.getRun(id);if(run.trigger!=='chat'||run.status!=='queued'||run.deferredStart!==true)throw new Error('Chat draft changed.');if(dispatch){run.events[0].data={attachments:this.verifyAttachmentDispatch(run,dispatch),delivery:{id:dispatch.messageId,state:'delivered'}};run.nextAttachmentDispatch=dispatch;}delete run.deferredStart;this.persist(run);queueMicrotask(()=>this.drain());return run;}
  discardDeferredRun(id){const run=this.getRun(id);if(run.trigger!=='chat'||run.status!=='queued'||run.deferredStart!==true)throw new Error('Chat draft changed.');this.runs.delete(id);this.historyCache.forget(id);fs.rmSync(path.join(this.runsDir,`${id}.json`),{force:true});this.emit('change',run);}
  resume(id, prompt) {
    const run = this.getRun(id);
    if (active.has(run.status)) throw new Error('Reply to the pending question, or wait for the active turn.');
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('A follow-up message is required.');
    const wasArchived=!!run.archivedAt;run.archivedAt=null;
    run.status = 'queued'; run.pending = null; run.nextPrompt = prompt;
    this.event(run, 'user', prompt);if(wasArchived)this.emit('lifecycle',{id:run.id,archivedAt:null,archived:false,updatedAt:run.updatedAt}); queueMicrotask(() => this.drain()); return run;
  }
  async send(id, prompt, mode = 'queue', messageId = randomUUID(), modelOptions, dispatch) {
    const run = this.getRun(id);
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('Write a message first.');
    if (!['queue','steer'].includes(mode)) throw new Error('Choose Queue next or Steer now.');
    if (typeof messageId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(messageId)) throw new Error('Invalid message identifier.');
    if (run.events.some(e => e.data?.delivery?.id === messageId)) return run;
    if (this.stopping) throw new Error('Runner is stopping.');
    if (mode === 'steer' && modelOptions) throw new Error('Steering keeps the current turn’s model. Queue a message to change model settings.');
    if(dispatch&&mode!=='queue')throw new Error('Attachments require a queued turn.');
    const attached=dispatch?this.verifyAttachmentDispatch(run,dispatch):[];
    const options = mode === 'queue' ? chatModelOptions(modelOptions || run.nextModelOptions || run.schedule) : null;
    if (options) run.nextModelOptions = options;
    if (!active.has(run.status)) {
      const wasArchived=!!run.archivedAt;run.archivedAt=null;
      if (options) this.applyModelOptions(run, options);
      run.status = 'queued'; run.pending = null; run.nextPrompt = prompt;if(dispatch)run.nextAttachmentDispatch=dispatch;
      this.event(run, 'user', prompt, { delivery: { id: messageId, state: 'delivered' },...(attached.length?{attachments:attached}:{}) });
      if(wasArchived)this.emit('lifecycle',{id:run.id,archivedAt:null,archived:false,updatedAt:run.updatedAt});queueMicrotask(() => this.drain()); return run;
    }
    if (mode === 'queue') {
      run.queuedMessages ??= []; run.queuedMessages.push({ id: messageId, prompt, at: this.now(), modelOptions: options,attachmentDispatch:dispatch });
      this.event(run, 'user', prompt, { delivery: { id: messageId, state: 'queued' },...(attached.length?{attachments:attached}:{}) });
      return run;
    }
    if (run.status !== 'running' || this.running?.id !== id) throw new Error('Steering is available during a running turn. Queue this message, or answer the pending request first.');
    const provider = this.providers[run.schedule.provider];
    if (!provider.steer) throw new Error('This provider does not support steering. Use Queue next.');
    this.event(run, 'user', prompt, { delivery: { id: messageId, state: 'sending' } });
    const delivery = run.events.find(e=>e.data?.delivery?.id === messageId).data.delivery;
    try { await provider.steer(run, prompt); delivery.state = 'steered'; }
    catch (error) { delivery.state = 'failed'; delivery.error = error.message; throw error; }
    finally { this.persist(run); }
    return run;
  }
  applyModelOptions(run, options) {
    const before = chatModelOptions(run.schedule);
    if (JSON.stringify(before) === JSON.stringify(options)) return;
    run.initialSchedule ??= structuredClone(run.schedule);
    run.modelHistory ??= []; run.modelHistory.push({ at: this.now(), before, after: structuredClone(options) });
    Object.assign(run.schedule, options);
    // Persist together with the caller's queue transition; no half-delivered message on a crash.
    run.events.push({role:'system',at:this.now(),text:`Next turn: ${options.model || 'Local rehearsal'} · effort ${options.reasoningEffort || 'default'} · speed ${options.serviceTier || 'default'} · context ${options.contextTier}. Earlier messages remain in this session; the provider may compact them to fit.`,data:{modelOptions:options}});
  }
  async steerQueued(id,messageId) {
    const run=this.getRun(id),message=run.queuedMessages?.find(item=>item.id===messageId);
    if(!message){if(run.events.some(e=>e.data?.delivery?.id===messageId&&e.data.delivery.state==='steered'))return run;throw new Error('This queued message was already delivered or removed.');}
    if(run.status!=='running'||this.running?.id!==id)throw new Error('Steering is available during a running turn.');
    if(message.attachmentDispatch)throw new Error('Messages with attachments must stay queued.');
    const provider=this.providers[run.schedule.provider];if(!provider.steer)throw new Error('This provider does not support steering. The message remains queued.');
    if(this.queuedSteers.has(id))throw new Error('Wait for the current steering request.');
    const delivery=run.events.find(e=>e.data?.delivery?.id===messageId)?.data.delivery;
    const operation=(async()=>{try{await provider.steer(run,message.prompt);run.queuedMessages=run.queuedMessages.filter(item=>item.id!==messageId);if(delivery){delivery.state='steered';delete delivery.error;}}catch(error){if(delivery)delivery.error=error.message;throw error;}finally{this.persist(run);}})();
    this.queuedSteers.set(id,operation);try{await operation;return run;}finally{this.queuedSteers.delete(id);}
  }
  removeQueued(id, messageId) {
    if(this.queuedSteers.has(id))throw new Error('Wait for the current steering request.');
    const run = this.getRun(id); const index = run.queuedMessages?.findIndex(m=>m.id===messageId) ?? -1;
    if (index < 0) throw new Error('This message has already been delivered.');
    const [removed]=run.queuedMessages.splice(index,1);if(removed.attachmentDispatch)void this.attachmentConsents?.releaseProof(removed.attachmentDispatch.proofId).catch(()=>{});
    const event=run.events.find(e=>e.data?.delivery?.id===messageId);if(event)event.data.delivery.state='removed';
    this.persist(run);return run;
  }
  reply(id, answer, requestId) {
    const run = this.getRun(id); const pending = this.pending.get(id);
    if (!pending || run.pending?.id !== requestId) throw new Error('This request is no longer waiting for an answer.');
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('A reply is required.');
    const isPermission = run.pending.type === 'permission';
    const questionEvent=run.events.find(event=>event.data?.question?.id===requestId);
    if(questionEvent){Object.assign(questionEvent.data.question,{status:'answered',answer,answeredAt:this.now()});}
    if (isPermission) {
      if (!['approve', 'deny'].includes(answer)) {
        const offered = run.pending.permissionChoices?.find(choice => choice.value === answer);
        const current = this.permissions.choices(run.schedule, run.pending.details || {}).find(choice => choice.value === answer);
        if (!offered || offered.label !== current?.label) throw new Error('Permission scope changed. Review the workspace permissions before continuing.');
        this.permissions.remember(run.schedule, run.pending.details, answer);
      }
      this.event(run, 'system', answer === 'deny' ? 'Permission denied.' : `Permission approved: ${answer}.`, { permission: { kind: run.pending.details?.kind, intention:displayText(run.pending.details?.intention||run.pending.question||'Tool permission',240), request:displayText(run.pending.details||{},12000), decision: answer, automatic: false } });
    }
    this.pending.delete(id); run.pending = null; run.status = 'running';resumeTurn(run,this.now());
    if (!isPermission) this.event(run, 'user', answer, {questionReply:{requestId}}); else this.persist(run);
    pending.resolve(isPermission && !['approve','deny'].includes(answer) ? 'approve' : answer);
    if (isPermission) this.recheckPermissions();
    return run;
  }
  ask(run, request, signal) {
    const previous = this.questionQueues.get(run.id) || Promise.resolve();
    const response = previous.catch(() => {}).then(() => this.askNext(run, request, signal));
    this.questionQueues.set(run.id, response);
    const cleanup = () => { if (this.questionQueues.get(run.id) === response) this.questionQueues.delete(run.id); };
    response.then(cleanup, cleanup);
    return response;
  }
  askNext(run, request, signal) {
    if (signal.aborted) return Promise.reject(new Error('Cancelled'));
    if (request.type === 'permission') {
      const decision = this.decidePermission(run, request.details || {});
      if (decision.allowed) { this.recordAutomaticPermission(run, request.details, decision); return Promise.resolve('approve-auto'); }
      request = { ...request, permissionChoices: this.permissions.choices(run.schedule, request.details || {}), permissionReason: decision.reason };
    }
    return new Promise((resolve, reject) => {
      const onAbort = () => { const event=run.events.find(event=>event.data?.question?.id===run.pending?.id);if(event)event.data.question.status='cancelled';this.pending.delete(run.id); reject(new Error('Cancelled')); };
      signal.addEventListener('abort', onAbort, { once: true });
      this.pending.set(run.id, {
        resolve: value => { signal.removeEventListener('abort', onAbort); resolve(value); },
        reject: error => { signal.removeEventListener('abort', onAbort); reject(error); }
      });
      run.pending = { ...request, id: randomUUID() }; run.status = 'awaiting_input';pauseTurn(run,this.now(),run.pending.id);
      if(request.type!=='permission'){const question={id:run.pending.id,text:String(request.question||''),choices:request.choices||[],options:request.optionDetails||request.choices||[],providerQuestionId:request.providerQuestionId||null,status:'pending',askedAt:this.now()};this.event(run,'system','**Question**\n\n'+question.text+(question.choices.length?'\n\n'+question.options.map(choice=>'• '+(typeof choice==='string'?choice:(choice.label||choice.title||'')+(choice.description?' — '+choice.description:''))).join('\n'):''),{question});}
      this.persist(run);
    });
  }
  recordAutomaticPermission(run, request, decision) {
    run.automaticApprovals = (run.automaticApprovals || 0) + 1;
    const tool = request?.toolCallId ? run.events.findLast(event => event.data?.tool?.callId === request.toolCallId)?.data?.tool : null;
    if (tool) tool.approval = decision.reason;
    this.event(run, 'system', `Auto-approved ${request?.kind || 'tool'}: ${decision.reason}.`, { permission: { kind: request?.kind, request:displayText(request||{},12000), intention:displayText(request?.intention||request?.toolName||request?.fullCommandText||request?.fileName||request?.kind||'Tool request',240), automatic: true, reason: decision.reason, mode: decision.mode, source: decision.source || 'workspace',...(typeof request?.toolCallId==='string'?{toolCallId:request.toolCallId.slice(0,128)}:{}),...(decision.resolvedTarget?{resolvedTarget:decision.resolvedTarget.slice(0,1024)}:{}),...(decision.matchedRoot?{matchedRoot:decision.matchedRoot.slice(0,1024)}:{}) } });
  }
  recheckPermissions() {
    for (const provider of Object.values(this.providers)) provider.recheckPermissions?.();
    for (const [id, waiting] of this.pending) {
      const run = this.getRun(id); if (run.pending?.type !== 'permission') continue;
      const decision = this.decidePermission(run, run.pending.details || {});
      if (!decision.allowed) continue;
      this.recordAutomaticPermission(run, run.pending.details, decision);
      this.pending.delete(id); run.pending = null; run.status = 'running';resumeTurn(run,this.now()); this.persist(run); waiting.resolve('approve-auto');
    }
  }
  async drain() {
    if (this.stopping) return;
    for (const run of this.runs.values()) {
      if (run.status !== 'queued'||run.deferredStart===true||this.providerAuthHold?.(run.schedule.provider)) continue;
      const lane = this.executionLane?.(run.schedule) || null;
      if (lane ? this.backgroundRuns.has(lane) : this.running) continue;
      const controller = new AbortController();
      const slot = { id: run.id, controller };
      if (lane) this.backgroundRuns.set(lane, slot); else this.running = slot;
      const execution = this.execute(run, controller, lane);
      this.executions.add(execution);
      execution.finally(() => this.executions.delete(execution));
    }
  }
  async execute(run, controller, lane) {
    run.status = 'running';startTurn(run,this.now()); const prompt = run.nextPrompt,dispatch=run.nextAttachmentDispatch; delete run.nextPrompt; this.persist(run);
    try {
      await this.beforeRun?.(run.schedule);
      if (controller.signal.aborted) throw new Error('Cancelled');
      const provider = this.providers[run.schedule.provider]; if (!provider) throw new Error('Provider is not installed.');
      // Explicit sender consent is rechecked against the actual run/provider and
      // immutable accepted bytes immediately before the provider receives them.
      const attachments=dispatch?await this.attachmentConsents.readForProvider({...dispatch,chatId:run.id,providerId:run.schedule.provider}):[];
      await provider.run({
        run, prompt, attachments, signal: controller.signal,
        permissionProfile: () => this.describePermissions(run),
        emit: (role, text, data) => this.event(run, role, text, data),
        stream: (id, text) => this.stream(run, id, text),
        update: () => this.persist(run),
        ask: request => this.ask(run, request, controller.signal)
      });
      run.status = controller.signal.aborted ? (this.stopping ? 'interrupted' : 'cancelled') : 'completed';
    } catch (error) {
      run.status = controller.signal.aborted ? (this.stopping ? 'interrupted' : 'cancelled') : 'failed';
      this.event(run, 'system', error.message);
    } finally {
      // Provider errors/timeouts can leave permission promises pending. Settle them
      // before another turn reuses this run's serialized question queue.
      finishTurn(run,this.now(),run.status);
      controller.abort();
      await this.releaseBrowser?.(run.id);
      if(['failed','interrupted'].includes(run.status)){run.failureEventAt=this.now();delete run.failureReviewedAt;}
      this.pending.delete(run.id); run.pending = null; delete run.liveMessages;delete run.nextAttachmentDispatch;
      if(dispatch)await this.attachmentConsents.releaseProof(dispatch.proofId).catch(()=>{});
      await this.queuedSteers.get(run.id)?.catch(()=>{});
      if (run.status === 'completed' && run.queuedMessages?.length && !this.stopping) {
        const next = run.queuedMessages.shift(); if (next.modelOptions) this.applyModelOptions(run, next.modelOptions); run.nextPrompt = next.prompt;run.nextAttachmentDispatch=next.attachmentDispatch; run.status = 'queued';
        const event=run.events.find(e=>e.data?.delivery?.id===next.id);if(event)event.data.delivery.state='delivered';
      }
      this.persist(run); if (lane) this.backgroundRuns.delete(lane); else this.running = null;
      queueMicrotask(() => this.drain());
    }
  }
  cancel(id) {
    const run = this.getRun(id);
    if (!active.has(run.status)) throw new Error('This run is not active.');
    const running = this.running?.id === id ? this.running : [...this.backgroundRuns.values()].find(slot => slot.id === id);
    if (running) running.controller.abort();
    else { run.status = 'cancelled'; delete run.nextPrompt;if(run.nextAttachmentDispatch)void this.attachmentConsents?.releaseProof(run.nextAttachmentDispatch.proofId).catch(()=>{});delete run.nextAttachmentDispatch;this.persist(run); }
  }
  tick() {
    this.recheckPermissions();
    const now = this.clock(); const after = new Date(this.journal.lastPoll);
    if (now <= after) return;
    for (const scheduleInfo of this.schedules.list()) {
      if (scheduleInfo.error || !scheduleInfo.enabled) continue;
      const schedule = this.schedules.get(scheduleInfo.id);
      const due = lastDue(schedule, after, now);
      if (!due || this.journal.slots[schedule.id] === due) continue;
      // A persisted run is also a claim: a crash between run and journal writes cannot duplicate it.
      const exists = [...this.runs.values()].some(run => run.schedule.id === schedule.id && run.slot === due);
      if (!exists && (schedule.misfire === 'coalesce' || now - new Date(due) < 60000)) {
        try { this.createRun(schedule, 'scheduled', due); }
        catch (error) { this.emit('scheduler-error', { schedule: schedule.id, error: error.message, at: this.now() }); }
      }
      this.journal.slots[schedule.id] = due;
    }
    this.journal.lastPoll = now.toISOString(); atomicJSON(path.join(this.home, 'scheduler.json'), this.journal);
  }
  async close() {
    this.stopping = true;
    if (this.running) this.running.controller.abort();
    for (const slot of this.backgroundRuns.values()) slot.controller.abort();
    for (const provider of Object.values(this.providers)) await provider.close?.();
    await Promise.allSettled([...this.executions]);
    for (const run of this.runs.values()) if (active.has(run.status)) { run.status = 'interrupted'; run.pending = null; this.persist(run); }
  }
}
