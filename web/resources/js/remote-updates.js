// State is replaceable; acknowledgements and lifecycle events are never coalesced.
import {sameRunReferences} from './remote-state.js';
export function acceptRemoteState(current, state) {
    const previous = current.receivedState;
    const signatures = current.stateSectionSignatures ||= new Map();
    const changed = current.changedStateSections = new Set();
    for (const key of new Set([...Object.keys(previous || {}), ...Object.keys(state)])) {
        if (previous && (previous[key] === state[key] || key === 'runs' && sameRunReferences(previous[key],state[key])) && Object.hasOwn(previous,key) === Object.hasOwn(state,key)) continue;
        const signature = JSON.stringify(state[key]);
        if (!signatures.has(key) || signatures.get(key) !== signature || Object.hasOwn(previous || {},key) !== Object.hasOwn(state,key)) changed.add(key);
        if (Object.hasOwn(state,key)) signatures.set(key,signature); else signatures.delete(key);
    }
    current.receivedState = state;
    return changed.size > 0;
}
export function coalesceRender(render, schedule = requestAnimationFrame) {
    let pending = false;
    return () => {
        if (pending) return;
        pending = true;
        schedule(() => { pending = false; render(); });
    };
}
// Keep the prepared command even when the user edits while its result is uncertain.
const preparations = new WeakMap();
export async function draftSubmission(draft, values, prepare) {
    if (preparations.has(draft)) return preparations.get(draft);
    values = structuredClone(values);
    const work = (async () => { if (!draft.submission) {
        draft.values = {...draft.values, ...values};
        const id = draft.id, issuedAt = draft.sentAt ||= new Date().toISOString();
        const prepared = await prepare(values, draft);
        draft.submission = { prepared: structuredClone(prepared), id, issuedAt, values: structuredClone(values) };
    }
    return draft.submission; })();
    preparations.set(draft, work);
    try { return await work; } finally { preparations.delete(draft); }
}
export function acknowledgeDraft(draft, submission) {
    const unchanged = Object.entries(submission.values).every(([name,value]) => draft.values?.[name] === value);
    delete draft.submission;
    delete draft.sentAt;
    if (!unchanged) draft.id = crypto.randomUUID();
    return unchanged;
}
