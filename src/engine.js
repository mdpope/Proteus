import {providerAttachmentInputs} from './services/chats/attachment-input.js';
import {DelegationService} from './services/chats/delegation.js';
import {captureUserQuestions,answerUserQuestion,recoverUserQuestions,askBackgroundQuestion} from './services/chats/user-questions.js';
import {AllowanceContinuation,allowanceFailure} from './services/chats/allowance-continuation.js';
import {displayText} from './shared/tool-activity.js';
import { RunHistoryCache } from './services/chats/run-history-cache.js';
import { RunWriter } from './services/chats/run-writer.js';
import {startTurn,pauseTurn,resumeTurn,finishTurn,interruptTiming} from './services/chats/run-timing.js';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { atomicJSON, jsonFiles, readJSON } from './shared/files.js';
import { ScheduleStore, revision, validateSchedule } from './services/scheduling/schedules.js';
import { SchedulerWorker } from './services/scheduling/scheduler-client.js';
import { RehearsalProvider } from './providers/rehearsal.js';
import { PermissionStore, permissionContext, canonicalPath, operationRule, permissionRuleId } from './services/settings/permissions.js';
import {chatMembership} from '../public/features/chats/chat-membership.js';

import { chatModelOptions } from './models/model-catalog.js';
import { agentName } from '../public/features/chats/agent-name.js';
import { ChatAttachmentConsents } from './services/chats/chat-attachment-consent.js';
import {ChatRecovery} from './services/chats/chat-recovery.js';
import {capacityFailure} from '../public/features/chats/chat-recovery-state.js';
import {startProgress,providerProgress,checkProgress} from './services/chats/run-progress.js';

const active = new Set(['queued', 'running', 'awaiting_input']);
export function suggestedChatTitle(prompt) {
  const clean = String(prompt || '').replace(/\s+/g, ' ').trim().replace(/^(?:please\s+|can you\s+|could you\s+|i (?:want|need) (?:you )?to\s+)/i, '');
  const sentence = clean.split(/(?<=[.!?])\s/)[0].replace(/[.!?]+$/, '');
  return (sentence.split(' ').filter(Boolean).slice(0, 9).join(' ') || 'New chat').slice(0, 90);
}
export const streamChange=Object.freeze({stream:true});
// Only provider narration during an active turn is coalesced. User input, delivery
// receipts, questions, approvals and attachments always save before continuing.
const deferredEvent=(run,role,data)=>role!=='user'&&run.status==='running'&&!(data&&(data.question||data.questionReply||data.delivery||data.attachments||data.permission?.decision||data.pending));
export class Engine extends EventEmitter {
  constructor(home, providers = {}, clock = () => new Date(), { desktopPreview = false, permissionControls = desktopPreview, recoveryBarrier=false } = {}) {
    super();this.updateBarrier=recoveryBarrier;this.historyCache=new RunHistoryCache(id=>path.join(home,'runs',id+'.json'),4,{isPinned:run=>this.runWriter?.pending(run.id)||this.running?.has(run.id)||[...(this.backgroundRuns?.values()||[])].some(slot=>slot.id===run.id)}); this.home = home; this.clock = clock;
    this.schedules = new ScheduleStore(path.join(home, 'schedules'));
    this.permissions = new PermissionStore(home, {preserveInheritedDefaults:permissionControls===true});
    this.runsDir = path.join(home, 'runs');
    this.runWriter = new RunWriter({fileFor:id=>path.join(this.runsDir,`${id}.json`),canWrite:run=>!this.tombstones?.[run.id]&&this.runs.get(run.id)===run,onError:(error,run)=>{this.runWriter.failed.add(run.id);this.emit('scheduler-error',{at:this.now(),code:'RUN_PERSIST',message:'A chat record could not be saved in the background. The next save is written immediately.',runId:run.id,error:error?.code||'IO_ERROR'});}});
    this.tombstoneFile = path.join(home, 'chat-tombstones.json');
    this.tombstones = readJSON(this.tombstoneFile, {});
    this.providers = { rehearsal: new RehearsalProvider(), ...providers };
    // Provider-owned state is an automatic owner-local grant, not a saved workspace exception.
    this.permissions.automaticProviderFolders=run=>{
      const provider=run.schedule.provider;if(!['copilot','claude'].includes(provider))return [];
      const home=run.providerHome||this.providers[provider]?.dataDirectory?.();
      const root=home&&path.isAbsolute(home)&&canonicalPath(home,run.schedule.workspace.cwd);
      return root?[{path:root,access:'read-write',source:'provider',label:(provider==='claude'?'Claude':'Copilot')+' working folder (automatic)'}]:[];
    };
    this.queuedSteers = new Map(); this.pending = new Map(); this.questionQueues = new Map(); this.backgroundQuestions=new Map(); this.running = new Map(); this.backgroundRuns = new Map(); this.executions = new Set(); this.stopping = false;
    fs.mkdirSync(this.runsDir, { recursive: true, mode: 0o700 });
    this.journal = readJSON(path.join(home, 'scheduler.json'), { lastPoll: clock().toISOString(), slots: {} });
    this.runs = new Map();this.recovery=new ChatRecovery(this);
    for (const file of jsonFiles(this.runsDir)) {
      try {
        const run = readJSON(file);
        recoverUserQuestions(run);
        if(run.capacityRetry){delete run.capacityRetry;run.events.push({role:'system',text:'Automatic capacity retry stopped when Proteus closed. Continue this chat or enable retry again when ready.',at:clock().toISOString()});atomicJSON(file,run);}
        if (this.tombstones[run.id]) { fs.rmSync(file, { force: true }); continue; }
        if (run.trigger === 'chat' && (!run.titleRevision || !run.titleKind)) {
          run.titleRevision ||= randomUUID(); run.titleKind ||= 'legacy';
          atomicJSON(file, run);
        }
        if (active.has(run.status)&&!(recoveryBarrier&&run.status==='queued')) {
          interruptTiming(run);
          for(const event of run.events)if(event.data?.question?.status==='pending')event.data.question.status='interrupted';
          run.status = 'interrupted'; run.pending = null; delete run.liveMessages;
          for(const child of run.subagents||[])if(!['completed','failed','interrupted','closed','unavailable'].includes(child.status)){child.status='interrupted';child.finishedAt=clock().toISOString();delete child.liveMessages;}
          run.failureEventAt = clock().toISOString(); delete run.failureReviewedAt;
          for (const event of run.events) if (event.data?.delivery?.state === 'sending') Object.assign(event.data.delivery, {state:'failed',error:'The runner stopped before confirming delivery. Inspect the provider session before retrying.'});
          run.events.push({ role: 'system', text: 'The runner stopped. Continue this session to recover; no work was silently replayed.', at: clock().toISOString() });
          atomicJSON(file, run);
        }
        this.runs.set(run.id, run);this.historyCache.attach(run);
      } catch (error) { this.recoveryErrors ??= []; this.recoveryErrors.push({ file, error: error.message }); }
    }
    this.turnAttachments=new Map();
    this.delegation=new DelegationService(this);
    this.allowance=new AllowanceContinuation(this);
  }
  now() { return this.clock().toISOString(); }
  persist(run,{deferred=false}={}) { if(this.tombstones[run.id]||!this.runs.has(run.id))throw new Error('Deleted chat cannot be restored.');
    if(run.chatPermission && run.chatPermission.contextId !== permissionContext(run.schedule).id){run.chatPermission=null;run.chatPermissionRevision=randomUUID();}
    run.updatedAt = this.now();
    // Provider progress during a running turn is coalesced off the owner thread;
    // every other save stays immediate and durable before callers continue.
    if(deferred&&!this.closingWrites){this.runWriter.defer(run);this.historyCache.attach(run);this.emit('change', run);return;}
    const bytes=this.runWriter.writeNow(run); this.historyCache.attach(run,bytes);this.emit('change', run); }
  event(run, role, text, data) {
    if(role!=='user'&&run.status==='running')providerProgress(run,this.now(),{observable:true});
    if(role==='user')this.allowance?.onInput(run,data?.delivery?.id);
    captureUserQuestions(run,data,run.events.length,this.now());
    run.events.push({ role, text, ...(role === 'assistant' ? { agentName: agentName(run) } : {}), data:{...data,...(run.turns?.at(-1)&&['running','awaiting_input'].includes(run.status)?{turnId:run.turns.at(-1).id}:{})}, at: this.now() }); this.persist(run,{deferred:deferredEvent(run,role,data)});
  }
  stream(run, messageId, text) {
    if(text)providerProgress(run,this.now(),{observable:true});
    run.liveMessages ??= {}; run.liveMessages[messageId] = (run.liveMessages[messageId] || '') + text; run.liveRevision=(run.liveRevision||0)+1;
    // Streaming text changes only this chat's live transcript. Listeners may batch or
    // skip it; durable state changes still arrive as ordinary change events.
    this.emit('change', run, streamChange);
  }
  listRuns() { return [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  visibleRuns(includeArchived = false) { return this.listRuns().filter(run => !run.delegation && (includeArchived || !run.archivedAt)); }
  getRun(id) { const run = this.runs.get(id); if (!run) throw new Error('Run not found.'); return run; }
  describePermissions(run) {
    if(!run.delegation)return this.permissions.describeRun(run);
    const parent=this.getRun(run.delegation.parentRunId),captured=run.delegation.permissionProfile;
    if(!this.delegation.current(parent)||parent.turns?.at(-1)?.id!==run.delegation.parentTurnId)throw Error('Delegated parent turn ended or was revoked.');
    const current=this.describePermissions(parent);
    if(permissionRuleId(current)!==permissionRuleId(captured))throw Error('Parent permissions changed; delegated scope expired.');
    return {...captured,source:'delegated-parent'};
  }

  moveWorkspace(id,{workspaceId,workspaceName='',expectedUpdatedAt}={}){
    const run=this.getRun(id);
    if(workspaceId!==null&&!/^[a-zA-Z0-9_-]{1,128}$/.test(workspaceId||''))throw new Error('Choose a workspace or Unhoused.');
    if(expectedUpdatedAt!==undefined&&expectedUpdatedAt!==run.updatedAt)throw new Error('Chat changed. Refresh before moving it.');
    const before=chatMembership(run);
    if(before.workspaceId===workspaceId&&before.workspaceName===workspaceName)return run;
    // Freeze future inherited source/default refresh, retaining the captured execution roots,
    // session and permission-context identity. No active provider is restarted or reconfigured.
    run.initialSchedule??=structuredClone(run.schedule);
    if(run.schedule.context)run.schedule.context={...run.schedule.context,followsWorkspace:false};
    run.workspaceId=workspaceId;run.workspaceName=workspaceId?String(workspaceName).slice(0,200):'';
    run.workspaceMoves??=[];run.workspaceMoves.push({from:before.workspaceId,to:workspaceId,at:this.now()});
    this.persist(run);this.emit('lifecycle',{id:run.id,...chatMembership(run),updatedAt:run.updatedAt,moved:true});
    return run;
  }
  setChatPermission(id, mode, expectedContextId, expectedChatRevision, expectedRequestId) {
    const run = this.getRun(id), context = this.permissions.describe(run.schedule);
    if (run.trigger !== 'chat' && mode !== 'inherit' && (!['scheduled','manual'].includes(run.trigger) || run.status !== 'awaiting_input' || run.pending?.type !== 'permission' || typeof expectedRequestId !== 'string' || expectedRequestId !== run.pending.id)) throw new Error('Conversation-only approval requires the current waiting permission request.');
    if (expectedRequestId !== undefined && (typeof expectedRequestId !== 'string' || !expectedRequestId || run.pending?.id !== expectedRequestId || run.pending?.type !== 'permission')) throw new Error('The approval request changed. Refresh before changing chat approval.');
    if (context.id !== expectedContextId) throw new Error('Workspace configuration changed. Review the permission context.');
    if (expectedChatRevision !== (run.chatPermissionRevision || null)) throw new Error('Chat approval changed. Refresh before saving.');
    if (!(this.permissions.preserveInheritedDefaults ? ['ask','custom','autopilot','inherit'] : ['autopilot', 'inherit']).includes(mode)) throw new Error('Choose chat auto-approval or inherit workspace settings.');
    const previous = run.chatPermission?.contextId === context.id ? run.chatPermission : {};
    const folders = previous.folders || [];
    run.chatPermission = this.permissions.preserveInheritedDefaults ? { ...previous, mode, folders, contextId: context.id, grantedAt: this.now() } : mode === 'autopilot' || folders.length ? { mode, folders, contextId: context.id, grantedAt: this.now() } : null;
    run.chatPermissionRevision = randomUUID(); this.persist(run); this.recheckPermissions();
    return this.describePermissions(run);
  }
  setChatReadOnly(id, enabled, expectedContextId, expectedChatRevision, expectedRequestId) {
    if (!this.permissions.preserveInheritedDefaults) throw new Error('Chat read-only tool settings require permission controls.');
    if (enabled !== null && typeof enabled !== 'boolean') throw new Error('Choose enabled, disabled, or inherit for read-only tools.');
    const run = this.getRun(id), context = this.permissions.describe(run.schedule);
    if (run.trigger !== 'chat' && (!['scheduled','manual'].includes(run.trigger) || run.status !== 'awaiting_input' || run.pending?.type !== 'permission' || typeof expectedRequestId !== 'string' || expectedRequestId !== run.pending.id)) throw new Error('Conversation-only approval requires the current waiting permission request.');
    if (expectedRequestId !== undefined && (typeof expectedRequestId !== 'string' || !expectedRequestId || run.pending?.id !== expectedRequestId || run.pending?.type !== 'permission')) throw new Error('The approval request changed. Refresh before changing chat approval.');
    if (context.id !== expectedContextId || expectedChatRevision !== (run.chatPermissionRevision || null)) throw new Error('Chat approval changed. Refresh before saving.');
    const previous = run.chatPermission?.contextId === context.id ? run.chatPermission : {mode:'inherit', contextId:context.id};
    run.chatPermission = {...previous, readOnlyTools:enabled}; run.chatPermissionRevision = randomUUID();
    this.persist(run); this.recheckPermissions(); return this.describePermissions(run);
  }
  revokeChatRule(id, ruleId, expectedContextId, expectedChatRevision, expectedRequestId) {
    if (!this.permissions.preserveInheritedDefaults) throw new Error('Chat operation rules require permission controls.');
    const run = this.getRun(id), context = this.permissions.describe(run.schedule);
    if (run.trigger !== 'chat' && (!['scheduled','manual'].includes(run.trigger) || run.status !== 'awaiting_input' || run.pending?.type !== 'permission' || typeof expectedRequestId !== 'string' || expectedRequestId !== run.pending.id)) throw new Error('Conversation-only approval requires the current waiting permission request.');
    if (expectedRequestId !== undefined && (typeof expectedRequestId !== 'string' || !expectedRequestId || run.pending?.id !== expectedRequestId || run.pending?.type !== 'permission')) throw new Error('The approval request changed. Refresh before changing chat approval.');
    if (context.id !== expectedContextId || expectedChatRevision !== (run.chatPermissionRevision || null)) throw new Error('Chat approval changed. Refresh before saving.');
    const previous = run.chatPermission?.contextId === context.id ? run.chatPermission : null;
    if (typeof ruleId !== 'string' || !previous?.rules?.some(rule => permissionRuleId(rule) === ruleId)) throw new Error('That chat rule no longer exists. Refresh before removing it.');
    run.chatPermission = {...previous, rules:previous.rules.filter(rule=>permissionRuleId(rule)!==ruleId)};
    run.chatPermissionRevision = randomUUID(); this.persist(run); this.recheckPermissions(); return this.describePermissions(run);
  }
  setChatFolder(id, folder, access, revoke, expectedContextId, expectedChatRevision, recheck = true) {
    const run = this.getRun(id), context = this.permissions.describe(run.schedule);
    if (run.trigger !== 'chat' && !revoke) {
      const offer = run.status === 'awaiting_input' && run.pending?.type === 'permission' ? this.permissions.folderOffer(run.schedule, run.pending.details || {}) : null;
      if (!['scheduled','manual'].includes(run.trigger) || !offer || canonicalPath(folder, context.cwd) !== offer.path || access !== offer.access) throw new Error('Conversation-only folder trust requires the folder offered by the current waiting request.');
    }
    if (context.id !== expectedContextId || expectedChatRevision !== (run.chatPermissionRevision || null)) throw new Error('Chat approval changed. Refresh before saving.');
    const canonical = canonicalPath(folder, context.cwd);
    if (!canonical || !path.isAbsolute(folder || '') || (!revoke && !fs.statSync(canonical).isDirectory())) throw new Error('Choose an existing absolute folder on the chat owner.');
    if (!revoke && !['read', 'read-write'].includes(access)) throw new Error('Choose read or read-write folder access.');
    const previous = run.chatPermission?.contextId === context.id ? run.chatPermission : { mode: 'inherit', contextId: context.id };
    const folders = (previous.folders || []).filter(item => item.path !== canonical);
    if (!revoke) folders.push({ path: canonical, access });
    run.chatPermission = { ...previous, folders }; run.chatPermissionRevision = randomUUID();
    this.persist(run); if (recheck) this.recheckPermissions(); return this.describePermissions(run);
  }
  decidePermission(run, request) {
    const profile = this.describePermissions(run);
    // An update coordinator exists only because a person started that update (Updates
    // page or an explicit update dispatch). Its own update tool needs no second prompt.
    // Protected requests and every other tool keep their normal approval path.
    if(request?.kind==='custom-tool'&&request.toolName==='proteus_update'&&run.schedule.purpose==='update'&&run.schedule.updateAuthorization?.tool==='proteus_update'&&!request.managedApprovalRequired&&!request.requestSandboxBypass)
      return {source:'update',allowed:true,reason:'User-started update coordinator',mode:profile.mode};
    return { source: profile.source, ...this.permissions.decide(run.schedule, request, profile) };
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
    if (active.has(run.status) || run.deferredStart || run.capacityRetry || run.queuedMessages?.length || this.running.has(run.id) || [...this.backgroundRuns.values()].some(slot=>slot.id===run.id) || this.pending.has(run.id)) throw new Error('Finish or cancel the active or queued chat work before archiving or deleting it.');
    if (action === 'archive' || action === 'unarchive') {
      run.archivedAt = action === 'archive' ? (run.archivedAt || this.now()) : null;
      this.runWriter.writeNow(run);
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
    this.runWriter.cancel(run.id);fs.rmSync(path.join(this.runsDir, `${run.id}.json`), { force: true });
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
    this.runWriter.writeNow(run);this.emit('change',run);
    return {id:run.id,failureEventAt:run.failureEventAt,failureReviewedAt:run.failureReviewedAt,attentionRequired:false};
  }
  createRun(schedule, trigger = 'manual', slot = null, {deferStart=false} = {}) {
    if(trigger!=='scheduled')this.updateGuard?.();
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
      events: [{ role: 'user', text: schedule.prompt, at: this.now() }, ...(schedule.context?.warnings || []).map(warning => ({ role: 'system', text: warning.message, at: this.now(), data: { contextWarning: warning } }))], pending: null,
      providerSessionId: null, usage: { inputTokens: 0, outputTokens: 0, observed: false },
      nextPrompt: schedule.prompt,...(deferStart?{deferredStart:true}:{})
    };
    this.runs.set(run.id, run);
    try { this.persist(run); }
    catch (error) {
      // No drain (including one queued by another run) may execute an
      // undurable initial claim. Later persistence keeps its existing behavior.
      this.runs.delete(run.id); this.historyCache.forget(run.id);
      error.undurableRunClaim = true; throw error;
    }
    if(!deferStart)queueMicrotask(() => this.drain()); return run;
  }
  verifyAttachmentDispatch(run,dispatch){if(!(this.attachmentConsents instanceof ChatAttachmentConsents)||!dispatch||typeof dispatch.proofId!=='string')throw new Error('Attachment send authorization is unavailable.');return this.attachmentConsents.assertPrepared({...dispatch,chatId:run.id,providerId:run.schedule.provider});}
  startDeferredRun(id,dispatch){const run=this.getRun(id);if(run.trigger!=='chat'||run.status!=='queued'||run.deferredStart!==true)throw new Error('Chat draft changed.');if(dispatch){run.events[0].data={attachments:this.verifyAttachmentDispatch(run,dispatch),delivery:{id:dispatch.messageId,state:'delivered'}};run.nextAttachmentDispatch=dispatch;}delete run.deferredStart;this.persist(run);queueMicrotask(()=>this.drain());return run;}
  discardDeferredRun(id){const run=this.getRun(id);if(run.trigger!=='chat'||run.status!=='queued'||run.deferredStart!==true)throw new Error('Chat draft changed.');this.runs.delete(id);this.historyCache.forget(id);this.runWriter.cancel(id);fs.rmSync(path.join(this.runsDir,`${id}.json`),{force:true});this.emit('change',run);}
  resume(id, prompt, {keepCapacityRetry=false}={}) {
    this.updateGuard?.();
    const run = this.getRun(id);
    if (active.has(run.status)) throw new Error('Reply to the pending question, or wait for the active turn.');
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('A follow-up message is required.');
    if(!keepCapacityRetry)this.recovery.stop(id,false);
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
    this.updateGuard?.();
    if (mode === 'steer' && modelOptions) throw new Error('Steering keeps the current turn’s model. Queue a message to change model settings.');
    const attached=dispatch?this.verifyAttachmentDispatch(run,dispatch):[];
    const provider=this.providers[run.schedule.provider];
    if(mode==='steer'){
      if(run.status!=='running'||!this.running.has(id))throw Error('Steering is available during a running turn. Queue this message, or answer the pending request first.');
      if(!provider?.steer)throw Error('This provider does not support steering. Use Queue next.');
      if(attached.some(item=>!provider.acceptedSteeringMediaTypes?.includes(item.mediaType)))throw Error('This provider cannot steer with these attachment types. Queue this message instead.');
    }
    const options = mode === 'queue' ? chatModelOptions(modelOptions || run.nextModelOptions || run.schedule) : null;
    this.recovery.stop(id,false);
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
    if (run.status !== 'running' || !this.running.has(id)) throw new Error('Steering is available during a running turn. Queue this message, or answer the pending request first.');
    if (!provider.steer) throw new Error('This provider does not support steering. Use Queue next.');
    const slot=this.running.get(id);
    this.event(run, 'user', prompt, { delivery: { id: messageId, state: 'sending' },...(attached.length?{attachments:attached}:{}) });
    const delivery = run.events.find(e=>e.data?.delivery?.id === messageId).data.delivery;
    try {
      const files=dispatch?await this.attachmentConsents.readForProvider({...dispatch,chatId:run.id,providerId:run.schedule.provider}):[];
      if(this.stopping||run.status!=='running'||this.running.get(id)!==slot||slot.controller.signal.aborted)throw Error('This turn ended before steering delivery. Inspect the chat before sending again.');
      const originals=this.turnAttachments.get(id),offset=originals?.length||0;if(originals)originals.push(...files);
      await provider.steer(run,prompt,providerAttachmentInputs(files,provider.acceptedSteeringMediaTypes,offset)); delivery.state = 'steered';
    }
    catch (error) { delivery.state = 'failed'; delivery.error = error.message; throw error; }
    finally { if(dispatch)await this.attachmentConsents.releaseProof(dispatch.proofId).catch(()=>{});this.persist(run); }
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
    if(run.status!=='running'||!this.running.has(id))throw new Error('Steering is available during a running turn.');
    const provider=this.providers[run.schedule.provider];if(!provider.steer)throw new Error('This provider does not support steering. The message remains queued.');
    const dispatch=message.attachmentDispatch,attached=dispatch?this.verifyAttachmentDispatch(run,dispatch):[];
    if(attached.some(item=>!provider.acceptedSteeringMediaTypes?.includes(item.mediaType)))throw Error('This provider cannot steer with these attachment types. The message remains queued.');
    if(this.queuedSteers.has(id))throw new Error('Wait for the current steering request.');
    const delivery=run.events.find(e=>e.data?.delivery?.id===messageId)?.data.delivery;
    const slot=this.running.get(id);
    const operation=(async()=>{let attempted=false;try{
      const files=dispatch?await this.attachmentConsents.readForProvider({...dispatch,chatId:id,providerId:run.schedule.provider}):[];
      if(this.stopping||run.status!=='running'||this.running.get(id)!==slot||slot.controller.signal.aborted)throw Error('This turn ended before steering delivery. Inspect the chat before sending again.');
      const originals=this.turnAttachments.get(id),offset=originals?.length||0;if(originals)originals.push(...files);
      attempted=true;await provider.steer(run,message.prompt,providerAttachmentInputs(files,provider.acceptedSteeringMediaTypes,offset));run.queuedMessages=run.queuedMessages.filter(item=>item.id!==messageId);if(delivery){delivery.state='steered';delete delivery.error;}
    }catch(error){if(delivery)delivery.error=error.message;if(dispatch){
      // A consumed proof cannot be queued or replayed after ambiguous provider
      // transport. Preserve the event/receipt, rather than silently sending twice.
      run.queuedMessages=run.queuedMessages.filter(item=>item.id!==messageId);if(delivery)delivery.state=attempted?'uncertain':'failed';
    }throw error;}finally{if(dispatch)await this.attachmentConsents.releaseProof(dispatch.proofId).catch(()=>{});this.persist(run);}})();
    this.queuedSteers.set(id,operation);try{await operation;return run;}finally{this.queuedSteers.delete(id);}
  }
  editQueued(id, messageId, prompt, expectedPrompt) {
    if (this.queuedSteers.has(id)) throw new Error('Wait for the current steering request.');
    const run = this.getRun(id), message = run.queuedMessages?.find(item => item.id === messageId);
    if (!message) throw new Error('This message has already been delivered or removed.');
    if (typeof expectedPrompt !== 'string' || message.prompt !== expectedPrompt) throw new Error('This queued message changed. Reopen it before editing.');
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 1_000_000) throw new Error('Write a message of at most 1,000,000 characters.');
    const event = run.events.find(item => item.data?.delivery?.id === messageId);
    if (!event || event.data.delivery.state !== 'queued') throw new Error('This message is no longer queued.');
    message.prompt = prompt; message.editedAt = this.now();
    event.text = prompt; event.data.delivery.editedAt = message.editedAt;
    delete event.data.delivery.error;
    this.persist(run); return run;
  }
  removeQueued(id, messageId) {
    if(this.queuedSteers.has(id))throw new Error('Wait for the current steering request.');
    const run = this.getRun(id); const index = run.queuedMessages?.findIndex(m=>m.id===messageId) ?? -1;
    if (index < 0) throw new Error('This message has already been delivered.');
    const [removed]=run.queuedMessages.splice(index,1);if(removed.attachmentDispatch)void this.attachmentConsents?.releaseProof(removed.attachmentDispatch.proofId).catch(()=>{});
    const event=run.events.find(e=>e.data?.delivery?.id===messageId);if(event)event.data.delivery.state='removed';
    this.persist(run);return run;
  }
  reply(id, answer, requestId, attachmentDispatch=null) {
    const run = this.getRun(id); const pending = this.pending.get(id);
    if (!pending || run.pending?.id !== requestId) throw new Error('This request is no longer waiting for an answer.');
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('A reply is required.');
    const isPermission = run.pending.type === 'permission';
    let questionFiles=[];
    if(attachmentDispatch){
      if(isPermission)throw Error('Tool approvals cannot contain attachments.');
      questionFiles=this.attachmentConsents.assertPrepared({...attachmentDispatch,chatId:id,providerId:run.schedule.provider});
      run.questionAttachmentReplies??={};run.questionAttachmentReplies[requestId]={...attachmentDispatch,providerId:run.schedule.provider};
    }
    const questionEvent=run.events.find(event=>event.data?.question?.id===requestId);
    if(questionEvent){Object.assign(questionEvent.data.question,{status:'answered',answer,answeredAt:this.now()});}
    if (isPermission) {
      if (this.permissions.preserveInheritedDefaults && run.pending.permissionContextId && run.pending.permissionContextId !== this.permissions.describe(run.schedule).id) throw new Error('Permission scope changed. Review the workspace permissions before continuing.');
      if (!['approve', 'deny'].includes(answer)) {
        const offered = run.pending.permissionChoices?.find(choice => choice.value === answer);
        const current = this.permissions.choices(run.schedule, run.pending.details || {}).find(choice => choice.value === answer);
        if (!offered || offered.label !== current?.label) throw new Error('Permission scope changed. Review the workspace permissions before continuing.');
        if (answer === 'trust-folder-chat') { const folder = this.permissions.folderOffer(run.schedule, run.pending.details); this.setChatFolder(run.id, folder.path, folder.access, false, this.permissions.describe(run.schedule).id, run.chatPermissionRevision || null, false); }
        else if (answer === 'always-tool-chat') {
          const context = this.permissions.describe(run.schedule), rule = operationRule(run.pending.details);
          const previous = run.chatPermission?.contextId === context.id ? run.chatPermission : {mode:'inherit',contextId:context.id};
          const rules = [...(previous.rules || [])];
          if (!rules.some(saved => revision(saved) === revision(rule))) rules.push(rule);
          run.chatPermission = {...previous, rules}; run.chatPermissionRevision = randomUUID(); this.persist(run);
        } else this.permissions.remember(run.schedule, run.pending.details, answer);
      }
      this.event(run, 'system', answer === 'deny' ? 'Permission denied.' : `Permission approved: ${answer}.`, { permission: { kind: run.pending.details?.kind, intention:displayText(run.pending.details?.intention||run.pending.question||'Tool permission',240), request:displayText(run.pending.details||{},12000), decision: answer, automatic: false, ...(typeof run.pending.details?.toolCallId === 'string' ? { toolCallId: run.pending.details.toolCallId.slice(0,128) } : {}) } });
    }
    this.pending.delete(id); run.pending = null; run.status = 'running';resumeTurn(run,this.now());providerProgress(run,this.now(),{observable:true});
    if (!isPermission) this.event(run, 'user', answer, {questionReply:{requestId},...(attachmentDispatch?{attachments:questionFiles,delivery:{id:attachmentDispatch.messageId,questionReplyDigest:attachmentDispatch.signature}}:{})}); else this.persist(run);
    const providerAnswer=attachmentDispatch?answer+`\nThe user attached ${questionFiles.length} file(s). Call proteus_question_attachments with requestId ${requestId} to view the images/text before continuing.`:answer;
    pending.resolve(isPermission && !['approve','deny'].includes(answer) ? 'approve' : providerAnswer);
    if (isPermission) this.recheckPermissions();
    return run;
  }
  answerQuestion(id,questionId,answer,messageId,action,dispatch){return answerUserQuestion(this,id,questionId,answer,messageId,action,dispatch);}
  async readQuestionAttachments(id,requestId){
    const run=this.getRun(id),slot=this.running.get(id),dispatch=run.questionAttachmentReplies?.[requestId];
    if(!slot||slot.controller.signal.aborted||!dispatch||dispatch.providerId!==run.schedule.provider)throw Error('These question attachments are not available to this active chat/provider.');
    this.questionAttachmentCache??=new Map();const key=id+':'+requestId;
    if(!this.questionAttachmentCache.has(key))this.questionAttachmentCache.set(key,this.attachmentConsents.readForProvider({...dispatch,chatId:id,providerId:run.schedule.provider}));
    const files=await this.questionAttachmentCache.get(key);
    if(this.running.get(id)!==slot||slot.controller.signal.aborted)throw Error('This turn ended before the attachments could be delivered.');
    return files;
  }
  ask(run, request, signal) {
    if(run.delegation){
      this.describePermissions(run);
      const parent=this.getRun(run.delegation.parentRunId);
      return this.ask(parent,{...request,details:{...request.details,delegation:{childRunId:run.id,parentRunId:parent.id}}},signal);
    }
    if(request.type==='question'&&request.isBlocking===false)return askBackgroundQuestion(this,run,request,signal,randomUUID());
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
      const details=request.details||{},questionDispatch=run.questionAttachmentReplies?.[details.args?.requestId];
      if(!details.managedApprovalRequired&&!details.requestSandboxBypass&&['proteus_attachments','mcp__proteus_app__proteus_attachments','proteus_agents','mcp__proteus_app__proteus_agents'].includes(details.toolName))return Promise.resolve('approve-auto');
      if(!details.managedApprovalRequired&&!details.requestSandboxBypass&&['proteus_question_attachments','mcp__proteus_app__proteus_question_attachments'].includes(details.toolName)&&questionDispatch?.providerId===run.schedule.provider)return Promise.resolve('approve-auto');
      const decision = this.decidePermission(run, details);
      if (decision.allowed) { this.recordAutomaticPermission(run, request.details, decision); return Promise.resolve('approve-auto'); }
      request = { ...request, ...(this.permissions.preserveInheritedDefaults ? {permissionContextId:this.permissions.describe(run.schedule).id} : {}), permissionChoices: this.permissions.choices(run.schedule, request.details || {}), permissionReason: decision.reason };
    }
    const requestId=randomUUID();
    return new Promise((resolve, reject) => {
      const onAbort = () => {if(run.pending?.id===requestId){const event=run.events.find(event=>event.data?.question?.id===requestId);if(event)event.data.question.status=signal.reason?.code==='provider-resolved'?'resolved':'cancelled';this.pending.delete(run.id);run.pending=null;if(run.status==='awaiting_input'){run.status='running';resumeTurn(run,this.now());}this.persist(run);}reject(new Error('Question request ended'));};
      signal.addEventListener('abort', onAbort, { once: true });
      this.pending.set(run.id, {
        resolve: value => { signal.removeEventListener('abort', onAbort); resolve(value); },
        reject: error => { signal.removeEventListener('abort', onAbort); reject(error); }
      });
      run.pending = { ...request, id: requestId }; run.status = 'awaiting_input';pauseTurn(run,this.now(),run.pending.id);
      if(request.type!=='permission'){const question={id:run.pending.id,text:String(request.question||''),choices:request.choices||[],options:request.optionDetails||request.choices||[],providerQuestionId:request.providerQuestionId||null,status:'pending',askedAt:this.now()};this.event(run,'system','**Question**\n\n'+question.text+(question.choices.length?'\n\n'+question.options.map(choice=>'• '+(typeof choice==='string'?choice:(choice.label||choice.title||'')+(choice.description?' — '+choice.description:''))).join('\n'):''),{question});}
      else this.persist(run);
    });
  }
  recordAutomaticPermission(run, request, decision) {
    run.automaticApprovals = (run.automaticApprovals || 0) + 1;
    const tool = request?.toolCallId ? run.events.findLast(event => event.data?.tool?.callId === request.toolCallId)?.data?.tool : null;
    if (tool) tool.approval = decision.reason;
    this.event(run, 'system', `Auto-approved ${request?.kind || 'tool'}: ${decision.reason}.`, { permission: { kind: request?.kind, request:displayText(request||{},12000), intention:displayText(request?.intention||request?.toolName||request?.fullCommandText||request?.fileName||request?.kind||'Tool request',240), automatic: true, reason: decision.reason, mode: decision.mode, source: decision.source || 'workspace',...(typeof request?.toolCallId==='string'?{toolCallId:request.toolCallId.slice(0,128)}:{}),...(decision.resolvedTarget?{resolvedTarget:decision.resolvedTarget.slice(0,1024)}:{}),...(decision.matchedRoot?{matchedRoot:decision.matchedRoot.slice(0,1024)}:{}) } });
  }
  recheckPermissions() {
    for(const run of this.runs.values())if(run.delegation&&active.has(run.status)){
      try{this.describePermissions(run);}catch{this.delegation.stopChildren(run.id);this.cancel(run.id);}
    }
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
    if (this.stopping||this.updateBarrier) return;
    for (const run of this.runs.values()) {
      if (run.status !== 'queued') continue;
      const lane = this.executionLane?.(run.schedule) || null;
      const reason = run.deferredStart === true ? 'Waiting for attachment delivery to finish.'
        : this.providerAuthHold?.(run.schedule.provider) ? 'Waiting for provider sign-in. Open Providers to check the connection.'
        : lane && this.backgroundRuns.has(lane) ? 'Waiting for the active local media task.'
        : this.running.has(run.id) ? 'Waiting for this chat’s current turn to finish.'
        : run.providerSessionId && [...this.running.values()].some(slot => { const other = this.getRun(slot.id); return other.schedule.provider === run.schedule.provider && other.providerSessionId === run.providerSessionId; }) ? 'Waiting for the active turn in this same provider session.'
        : this.providers[run.schedule.provider]?.queueReason?.(run);
      if (reason) { if (run.queueReason !== reason) { run.queueReason = reason; this.persist(run); } continue; }
      delete run.queueReason;
      const controller = new AbortController();
      const slot = { id: run.id, controller };
      if (lane) this.backgroundRuns.set(lane, slot); else this.running.set(run.id, slot);
      const execution = this.execute(run, controller, lane);
      this.executions.add(execution);
      execution.finally(() => this.executions.delete(execution));
    }
  }
  async execute(run, controller, lane) {
    run.status = 'running';startTurn(run,this.now());startProgress(run,this.now()); const prompt = run.nextPrompt,dispatch=run.nextAttachmentDispatch; delete run.nextPrompt; this.persist(run);
    try {
      await this.beforeTurn?.(run);
      await this.beforeRun?.(run.schedule);
      if (controller.signal.aborted) throw new Error('Cancelled');
      const provider = this.providers[run.schedule.provider]; if (!provider) throw new Error('Provider is not installed.');
      // Explicit sender consent is rechecked against the actual run/provider and
      // immutable accepted bytes immediately before the provider receives them.
      const attachments=dispatch?await this.attachmentConsents.readForProvider({...dispatch,chatId:run.id,providerId:run.schedule.provider}):[];
      this.turnAttachments.set(run.id,attachments);
      await provider.run({
        run, prompt, attachments:providerAttachmentInputs(attachments,provider.acceptedMediaTypes), signal: controller.signal,
        permissionProfile: () => this.describePermissions(run),
        emit: (role, text, data) => this.event(run, role, text, data),
        stream: (id, text) => this.stream(run, id, text),
        update: () => {providerProgress(run,this.now());this.persist(run,{deferred:run.status==='running'});},
        ask: (request,requestSignal) => this.ask(run, request, requestSignal||controller.signal)
      });
      if(controller.progressTimeout)throw Error(controller.progressTimeout);
      run.status = controller.signal.aborted ? (this.stopping ? 'interrupted' : 'cancelled') : 'completed';
    } catch (error) {
      run.status = controller.progressTimeout?'failed':controller.signal.aborted ? (this.stopping ? 'interrupted' : 'cancelled') : 'failed';
      this.event(run, 'system', controller.progressTimeout||error.message,{failure:{kind:controller.progressTimeout?'stalled':error.code==='COPILOT_ACTIVE_TIME_LIMIT'?'active-time-limit':capacityFailure(error.message)?'capacity':allowanceFailure(error)?'allowance':'error'}});
    } finally {
      // Provider errors/timeouts can leave permission promises pending. Settle them
      // before another turn reuses this run's serialized question queue.
      finishTurn(run,this.now(),run.status);
      this.turnAttachments.delete(run.id);this.delegation.stopChildren(run.id);controller.abort();
      await this.releaseBrowser?.(run.id);
      if(['failed','interrupted'].includes(run.status)){run.failureEventAt=this.now();delete run.failureReviewedAt;}
      this.pending.delete(run.id); run.pending = null; delete run.liveMessages;delete run.nextAttachmentDispatch;
      if(dispatch)await this.attachmentConsents.releaseProof(dispatch.proofId).catch(()=>{});
      for(const [requestId,questionDispatch] of Object.entries(run.questionAttachmentReplies||{})){
        await this.attachmentConsents.releaseProof(questionDispatch.proofId).catch(()=>{});
        this.questionAttachmentCache?.delete(run.id+':'+requestId);
      }
      delete run.questionAttachmentReplies;
      await this.queuedSteers.get(run.id)?.catch(()=>{});
      if (run.status === 'completed' && run.queuedMessages?.length && !this.stopping) {
        const next = run.queuedMessages.shift(); if (next.modelOptions) this.applyModelOptions(run, next.modelOptions); run.nextPrompt = next.prompt;run.nextAttachmentDispatch=next.attachmentDispatch; run.status = 'queued';
        const event=run.events.find(e=>e.data?.delivery?.id===next.id);if(event)event.data.delivery.state='delivered';
      }
      this.persist(run); if (lane) this.backgroundRuns.delete(lane); else this.running.delete(run.id);this.historyCache.trim();
      this.recovery.settled(run);this.allowance?.settled(run);queueMicrotask(() => this.drain());
    }
  }
  cancel(id) {
    const run = this.getRun(id);
    if (!active.has(run.status)) throw new Error('This run is not active.');
    this.delegation.stopChildren(id);this.recovery.stop(id,false);
    const running = this.running.get(id) || [...this.backgroundRuns.values()].find(slot => slot.id === id);
    if (running) running.controller.abort();
    else { run.status = 'cancelled'; delete run.nextPrompt;if(run.nextAttachmentDispatch)void this.attachmentConsents?.releaseProof(run.nextAttachmentDispatch.proofId).catch(()=>{});delete run.nextAttachmentDispatch;this.persist(run); }
  }
  tick() {
    for(const slot of [...this.running.values(),...this.backgroundRuns.values()]){
      const run=this.runs.get(slot.id);if(!run)continue;
      const state=checkProgress(run,this.now());
      if(state?.changed)this.persist(run);
      if(state?.timedOut&&!slot.controller.signal.aborted){
        slot.controller.progressTimeout='No observable provider/tool progress for 30 minutes. The turn was interrupted; inspect unfinished operations before continuing. Queued messages were preserved.';
        slot.controller.abort();
      }
    }
    if (this.stopping||this.updateBarrier) return Promise.resolve();
    const now = this.clock().toISOString();
    if (!this.pendingSchedulerTime || now > this.pendingSchedulerTime) this.pendingSchedulerTime = now;
    // All overlapping callers await one drain. Only the newest queued poll is
    // retained, so a slow disk cannot grow a timer backlog or race slot claims.
    if (this.schedulerTick) return this.schedulerTick;
    const operation = this.drainSchedulerTicks();
    this.schedulerTick = operation;
    operation.then(() => { this.schedulerTick = null; }, () => { this.schedulerTick = null; });
    return operation;
  }
  async drainSchedulerTicks() {
    while (this.pendingSchedulerTime && !this.stopping&&!this.updateBarrier) {
      const timestamp = this.pendingSchedulerTime; this.pendingSchedulerTime = null;
      const recheck = () => this.recheckPermissions();
      if (this.performanceDiagnostics) this.performanceDiagnostics.measureSync('scheduler.permissions', recheck); else recheck();
      if (new Date(timestamp) <= new Date(this.journal.lastPoll)) continue;
      this.schedulerWorker ??= new SchedulerWorker(this.home);
      const plan = await this.schedulerWorker.scan(this.journal, timestamp);
      if (this.stopping||this.updateBarrier) break;
      const currentErrors = new Map(plan.errors.map(error => [error.schedule, error.error]));
      for (const error of plan.errors) if (this.schedulerScheduleErrors?.get(error.schedule) !== error.error) this.emit('scheduler-error', { ...error, at: this.now() });
      this.schedulerScheduleErrors = currentErrors;
      if (plan.due.length && !await this.schedulerWorker.verify(plan.due)) throw new Error('A schedule changed during polling. Retrying on the next tick.');
      if (this.stopping||this.updateBarrier) break;
      const journal = { ...this.journal, slots: { ...this.journal.slots }, lastPoll: timestamp };
      for (const { schedule, slot } of plan.due) {
        // createRun synchronously persists before queuing provider work. This
        // durable run remains a claim even if the subsequent checkpoint fails.
        const exists = [...this.runs.values()].some(run => run.schedule.id === schedule.id && run.slot === slot);
        if (!exists && (schedule.misfire === 'coalesce' || new Date(timestamp) - new Date(slot) < 60000)) {
          try {
            const claim = () => this.createRun(schedule, 'scheduled', slot);
            if (this.performanceDiagnostics) this.performanceDiagnostics.measureSync('scheduler.claim', claim); else claim();
          } catch (error) {
            this.emit('scheduler-error', { schedule: schedule.id, error: error.message, at: this.now() });
            if (error.undurableRunClaim) throw error;
          }
        }
        journal.slots[schedule.id] = slot;
      }
      await this.schedulerWorker.checkpoint(journal);
      this.journal = journal;
    }
    if (this.stopping) this.pendingSchedulerTime = null;
  }
  async close() {
    if (this.closePromise) return this.closePromise;
    this.stopping = true;
    this.recovery.close();this.allowanceClosing=this.allowance?.close();
    for (const slot of this.running.values()) slot.controller.abort();
    for (const slot of this.backgroundRuns.values()) slot.controller.abort();
    this.closePromise = this.finishClose();
    return this.closePromise;
  }
  async finishClose() {
    // A started checkpoint must finish before the worker terminates. A scan
    // interrupted by shutdown cannot advance the poll past an unclaimed slot.
    let schedulerError;
    await this.allowanceClosing;
    try { await this.schedulerTick; } catch (error) { schedulerError = error; }
    try { await this.schedulerWorker?.close(); } catch (error) { schedulerError ||= error; }
    for (const provider of Object.values(this.providers)) await provider.close?.();
    await Promise.allSettled([...this.executions]);
    for (const run of this.runs.values()) if (active.has(run.status)&&!(this.updateBarrier&&run.status==='queued')) { run.status = 'interrupted'; run.pending = null; this.persist(run); }
    this.closingWrites=true;await this.runWriter.close(id=>this.runs.get(id));
    if (schedulerError) throw schedulerError;
  }
}
