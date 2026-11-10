import test from 'node:test';import assert from 'node:assert/strict';import {claudeToolAllowed} from '../src/providers/claude-tool-policy.js';
test('Claude owner hooks preserve source MCP filters and selected agent tools',()=>{
 const servers={notes:{tools:['read_note']},none:{tools:[]},proteus_app:{}};
 assert.equal(claudeToolAllowed('mcp__notes__read_note',{servers}),true);assert.equal(claudeToolAllowed('mcp__notes__delete_note',{servers}),false);assert.equal(claudeToolAllowed('mcp__none__anything',{servers}),false);assert.equal(claudeToolAllowed('mcp__unknown__anything',{servers}),false);
 const managed={agent:'selected',customAgents:[{name:'selected',tools:['view','grep','notes/read_note']}]};
 for(const name of ['Read','Grep','mcp__notes__read_note','AskUserQuestion'])assert.equal(claudeToolAllowed(name,{managed,servers}),true,name);
 for(const name of ['Write','Bash','Agent','mcp__notes__delete_note','mcp__proteus_app__proteus_exec'])assert.equal(claudeToolAllowed(name,{managed,servers}),false,name);
 managed.customAgents[0].tools.push('bash');assert.equal(claudeToolAllowed('mcp__proteus_app__proteus_exec',{managed,servers}),true);
});
