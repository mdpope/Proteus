// Transport snapshots (including every shared subtree) are read-only. Local read
// results and presentation overlays replace the session root, never that snapshot.
export function updateWebState(current, changes) {
    current.state = {...current.state, ...changes};
}
export function sameRunReferences(before, after) {
    return before === after || Array.isArray(before) && Array.isArray(after) && before.length === after.length && before.every((run,index) => run === after[index]);
}
export function onlyChatIndexChanges(sections) {
    return [...sections].every(key => ['runs','runningChatCount','runCount','runCountIncludingArchived','attentionCount'].includes(key));
}
export function applyLifecycleState(current, change) {
    if (current.run?.id === change.id && !change.deleted) current.run = {...current.run, ...change};
    if (change.deleted && current.state?.runs) updateWebState(current,{runs:current.state.runs.filter(row => row.id !== change.id)});
}
export function updateRunSummary(current, id, changes) {
    if (current.state?.runs?.some(row => row.id === id)) updateWebState(current,{runs:current.state.runs.map(row => row.id === id ? {...row,...changes} : row)});
    for (const key of ['cachedRuns','archivedRuns']) if (current[key]) current[key] = current[key].map(row => row.id === id ? {...row,...changes} : row);
}

// Worker messages normally clone every object, destroying structural sharing.
// Carry only changed fields across that local bridge so page consumers
// receive the same identity guarantees as direct transport consumers.
export function createStateProjection() {
    let previous;
    return state => {
        const projection = project(previous,state);
        previous = state;
        return projection;
    };
}
function project(previous, state) {
    if (previous === state) return null;
    if (!previous || !state || typeof previous !== 'object' || typeof state !== 'object' || Array.isArray(previous) !== Array.isArray(state)) return {value:state};
    const fields = Object.entries(state).flatMap(([key,value]) => {
        const child = Object.hasOwn(previous,key) ? project(previous[key],value) : {value};
        return child ? [[key,child]] : [];
    });
    const removed = Object.keys(previous).filter(key => !Object.hasOwn(state,key));
    const length = Array.isArray(state) ? state.length : undefined;
    return fields.length || removed.length || length !== (Array.isArray(previous) ? previous.length : undefined) ? {fields,removed,length} : null;
}
export function mergeStateProjection(previous, projection) {
    if (!projection) return previous;
    if (Object.hasOwn(projection,'value')) return projection.value;
    const fields = Object.fromEntries(projection.fields.map(([key,child]) => [key,mergeStateProjection(previous[key],child)]));
    const state = Array.isArray(previous) ? previous.slice(0,projection.length) : {...previous,...fields};
    if (Array.isArray(state)) for (const [key,value] of Object.entries(fields)) state[key] = value;
    for (const key of projection.removed) delete state[key];
    return state;
}
export function projectSyncResult(method, result, projectState) {
    return method === 'sync' && result?.state ? {result:{...result,state:undefined},stateProjection:projectState(result.state)} : {result};
}
