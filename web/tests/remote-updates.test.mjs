import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptRemoteState, coalesceRender, draftSubmission, acknowledgeDraft} from '../resources/js/remote-updates.js';
import {acceptWebTabs} from '../resources/js/workspace-tab-state.js';

test('identical pushes advance state without scheduling work; changed content remains visible', () => {
    const current = {}, frames = []; let renders = 0;
    const render = coalesceRender(() => renders++, callback => frames.push(callback));
    for (const state of [{runs:[{id:'a'}]}, {runs:[{id:'a'}]}, {runs:[{id:'b'}]}]) if (acceptRemoteState(current,state)) render();
    assert.equal(frames.length,1); frames.shift()(); assert.equal(renders,1);
    assert.equal(current.receivedState.runs[0].id,'b');
    if (acceptRemoteState(current,{runs:[]})) render();
    frames.shift()(); assert.equal(renders,2);
});
test('uncertain send retries frozen identity, timestamp and payload despite edited draft and reload', async () => {
    const draft = {id:'original',values:{prompt:'first'}};
    const first = await draftSubmission(draft,draft.values,async values => ({args:{prompt:values.prompt}}));
    draft.id='edited'; draft.values.prompt='second';
    const restored=JSON.parse(JSON.stringify(draft));
    const retry=await draftSubmission(restored,restored.values,()=>{throw Error('must not prepare another command');});
    assert.deepEqual(retry,first); assert.equal(retry.prepared.args.prompt,'first'); assert.equal(restored.values.prompt,'second');
    assert.equal(acknowledgeDraft(restored,retry),false);
    assert.equal(restored.submission,undefined);assert.equal(restored.values.prompt,'second');
    assert.equal(acknowledgeDraft(draft,{values:{prompt:'second'}}),true);
});
test('concurrent submit shares preparation and failed preparation can be retried', async () => {
    const draft={id:'original'}; let release, calls=0;
    const prepare=()=>{calls++;return new Promise(resolve=>release=resolve);};
    const first=draftSubmission(draft,{prompt:'a'},prepare),second=draftSubmission(draft,{prompt:'b'},prepare);
    release({args:{prompt:'a'}}); assert.deepEqual(await first,await second);assert.equal(calls,1);
    const failed={id:'failed'};await assert.rejects(draftSubmission(failed,{},()=>{throw Error('preparation');}));
    assert.equal((await draftSubmission(failed,{},async()=>({ok:true}))).id,'failed');
});
test('stale sync or mutation result cannot roll back URL, redirect, traversal or same-document entry', () => {
    for (const url of ['https://example.test/redirected','https://example.test/#section','https://example.test/back']) {
        const view={tabs:{revision:12,tabs:[{id:'browser',url,history:{revision:6,currentEntryId:'new'}}]}};
        assert.equal(acceptWebTabs(view,{revision:11,tabs:[{id:'browser',url:'https://example.test/old',history:{revision:5}}]}),false);
        assert.equal(view.tabs.tabs[0].url,url);
        assert.equal(acceptWebTabs(view,{revision:13,tabs:[{id:'browser',url:'https://example.test/stale',history:{revision:5}}]}),false);
        assert.equal(acceptWebTabs(view,{revision:13,tabs:[{id:'browser',url,hidden:true,history:{revision:7}}]}),true);
        assert.equal(view.tabs.tabs[0].hidden,true);
    }
});
