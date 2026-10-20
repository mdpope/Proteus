import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceCatalog} from '../public/workspace-ui.js';
import {contextPlan} from '../public/context-plan.js';
const entry=(id,root,mode='available')=>({id,name:id,kind:'instruction',path:root+'/'+id+'.md',roots:[root],mode,defaultMode:'available',characters:12});
function fixture(){return {defaultWorkspaceId:'one',workspaceId:'one',entries:[entry('chosen','/outside'),entry('universal','/universal'),entry('other','/two','universal'),entry('first','/one')],workspaces:[{id:'one',cwd:'/one',modes:{},defaults:{}},{id:'two',cwd:'/two',modes:{chosen:'available'},favorites:['chosen'],universalFolders:['/universal'],defaults:{includeDefaults:false,selectedIds:['chosen']}}]};}
test('workspace projection retains explicit source aliases and universal roots without leaking another workspace mode',()=>{const catalog=workspaceCatalog(fixture(),'two');assert.deepEqual(catalog.entries.map(e=>e.id),['chosen','universal','other']);assert.equal(catalog.entries.find(e=>e.id==='other').mode,'available');});
test('workspace plan inherits selected source defaults but explicit empty selections override them',()=>{const catalog=fixture();assert.deepEqual(contextPlan(catalog,{workspaceId:'two'}).entries.map(e=>e.id),['chosen']);assert.deepEqual(contextPlan(catalog,{workspaceId:'two',selectedIds:[]}).entries,[]);});
test('already scoped catalog retains discovered aliases whose original source root has moved',()=>{const catalog=fixture();catalog.workspaceId='two';catalog.entries.push(entry('alias','/previous-location'));assert.ok(workspaceCatalog(catalog,'two').entries.some(e=>e.id==='alias'));});
