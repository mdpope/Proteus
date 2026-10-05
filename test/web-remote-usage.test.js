import test from 'node:test';
import assert from 'node:assert/strict';
import {allowance, usagePanel} from '../web/resources/js/remote-usage.js';
test('web provider meter preserves unknown, exhausted, unlimited and expired allowances',()=>{
 const now=Date.parse('2026-10-04T08:00:00Z');
 assert.equal(allowance({remainingPercent:0},now).label,'0%');
 assert.equal(allowance({remainingPercent:null},now).label,'Unreported');
 assert.equal(allowance({remainingPercent:87.2},now).label,'87%');
 assert.equal(allowance({unlimited:true},now).label,'Unlimited');
 assert.equal(allowance({remainingPercent:90,resetAt:'2026-10-04T07:00:00Z'},now).label,'Unreported');
 const html=usagePanel({providers:{codex:{checkedAt:'2026-10-04T07:00:00Z',windows:[{label:'Short window',remainingPercent:70},{label:'Week',remainingPercent:23}]},claude:{stale:true,windows:[]}}},{destination:'Example <Mac>',now});
 assert.doesNotMatch(html,/style=/);assert.match(html,/<progress[^>]+value="23"/);
 assert.match(html,/23%/);assert.match(html,/Short window/);assert.match(html,/Reset time unreported/);assert.match(html,/Claude · stale/);assert.match(html,/Example &lt;Mac&gt;/);assert.doesNotMatch(html,/Example <Mac>/);
 assert.match(usagePanel({},{collapsed:true}),/Expand AI Allowance/);assert.doesNotMatch(usagePanel({providers:{codex:{windows:[{remainingPercent:23}]}}},{collapsed:true}),/data-usage-refresh|23%|provider-meter/);
 assert.match(usagePanel({providers:{codex:{windows:[{remainingPercent:23}]}}},{compact:true}),/23%/);
});
