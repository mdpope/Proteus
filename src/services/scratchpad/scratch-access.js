import {createHash} from 'node:crypto';

export const scratchActions = ['list', 'read', 'create', 'update', 'rename', 'move', 'delete', 'sync'];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const pending = new WeakMap();

// Capture project membership once per provider turn. Moving a running chat must
// never silently grant it the destination project's scratch contents.
export function captureScratchProject(engine, projects, run) {
 const turn = engine.running.get(run.id);
 if (!turn) return;
 const parent = run.delegation && engine.running.get(run.delegation.parentRunId);
 turn.scratchProjectId = parent ? parent.scratchProjectId ?? null : projects.membership(run).projectId ?? null;
}
export function scratchTurn(engine, runId) {
 const turn = engine.running.get(runId);
 if (!turn || turn.controller.signal.aborted || !Object.hasOwn(turn, 'scratchProjectId')) throw Error('Scratchpad requires the captured active chat turn.');
 return turn;
}
export function assertScratchAccess(engine, runId, rootId, target, action) {
 const turn = scratchTurn(engine, runId), run = engine.getRun(runId);
 if (target.projectId && target.projectId === turn.scratchProjectId) return turn;
 if (run.scratchpadGrants?.some(grant => grant.rootId === rootId && grant.scope === target.scope && grant.actions.includes(action))) return turn;
 throw Error('This scratch belongs outside the captured project. Request explicit Scratchpad access before reading or changing it.');
}
export async function requestScratchAccess(engine, runId, rootId, target, args, stillCurrent) {
 const turn = scratchTurn(engine, runId), run = engine.getRun(runId);
 if (run.delegation || run.trigger !== 'chat') throw Error('Only the active user chat can request access to another project.');
 if (!uuid.test(args.operationId || '') || !Array.isArray(args.actions) || !args.actions.length || args.actions.some(action => !scratchActions.includes(action))) throw Error('Choose explicit Scratchpad actions and a stable UUID operationId.');
 if (typeof args.reason !== 'string' || !args.reason.trim() || args.reason.length > 1000) throw Error('Explain why this chat needs these scratches.');
 const actions = [...new Set(args.actions)].sort(), signature = createHash('sha256').update(JSON.stringify([rootId, target.scope, actions, args.reason])).digest('hex');
 run.scratchpadRequests ??= {};
 let waiting = pending.get(engine); if (!waiting) pending.set(engine, waiting = new Map());
 const key = runId + ':' + args.operationId, prior = run.scratchpadRequests[args.operationId];
 if (prior) {
  if (prior.signature !== signature) throw Error('This operationId belongs to another Scratchpad access request.');
  return waiting.get(key) ?? {...prior, ...(prior.status === 'pending' ? {status: 'interrupted', granted: false} : {})};
 }
 if (Object.keys(run.scratchpadRequests).length >= 256) throw Error('Review existing Scratchpad grants before requesting more.');
 const receipt = {signature, rootId, scope: target.scope, actions, status: 'pending', granted: false};
 run.scratchpadRequests[args.operationId] = receipt; engine.persist(run);
 const work = (async () => {
  const question = `Allow this chat to ${actions.join(', ')} scratches in ${target.label}? ${args.reason} This grants Scratchpad tool access only, without changing folder or shell permissions.`;
  try {
   const answer = await engine.ask(run, {type: 'permission', question, details: {kind: 'scratchpad-access', toolName: 'proteus_scratchpad', managedApprovalRequired: true, intention: question, args: {scope: target.scope, actions, operationId: args.operationId}}}, turn.controller.signal);
   if (answer !== 'approve') {receipt.status = 'denied'; return {...receipt};}
   if (scratchTurn(engine, runId) !== turn || !stillCurrent()) throw Error('The chat turn or Scratchpad root changed during approval.');
   run.scratchpadGrants ??= []; run.scratchpadGrants.push({rootId, scope: target.scope, actions});
   receipt.status = 'granted'; receipt.granted = true; return {...receipt};
  } catch (error) {receipt.status = 'interrupted'; throw error;}
  finally {engine.persist(run);}
 })();
 waiting.set(key, work); try {return await work;} finally {waiting.delete(key);}
}
