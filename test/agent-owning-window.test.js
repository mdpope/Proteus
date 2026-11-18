import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{originTab,owningWindow}=require('../desktop/windows/agent-origin.cjs');

// N11-12: Playwright/developer calls name an exact stable tab ID. A tab open only in another
// app window resolves to that window instead of failing; closed windows and unknown tabs do not.
test('an exact tab ID resolves to its open owning window', () => {
  const tabs=new Map([['a',{id:'a',windowId:'main'}],['other',{id:'other',windowId:'second'}],['orphan',{id:'orphan',windowId:'closed'}]]);
  const contexts=[{id:'main',window:{isDestroyed:()=>false}},{id:'second',window:{isDestroyed:()=>false}},{id:'closed',window:{isDestroyed:()=>true}}];
  assert.throws(()=>originTab(tabs,'other','main'),/not open in the submitting window/);
  assert.equal(owningWindow(tabs,'other',contexts),'second');
  assert.equal(owningWindow(tabs,'a',contexts),'main');
  assert.equal(owningWindow(tabs,'orphan',contexts),null,'a closed owner window is unavailable, not substituted');
  assert.equal(owningWindow(tabs,'missing',contexts),null);
});
