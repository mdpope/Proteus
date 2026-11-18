import test from 'node:test';
import assert from 'node:assert/strict';
import {previewApprovalRequest} from '../public/shared/navigation/preview-permissions.js';

// N11-10: a connection approval names the service and exact configured connection, states
// its turn-only duration and separates connecting from permission to run tools.
test('connection approval cards name the service and connection for this turn', () => {
  const managed = previewApprovalRequest({details:{kind:'mcp-connect',serverName:'hc-atlassian',serverLabel:'Jira',managed:true,approvalScope:'turn',toolName:'*'},permissionReason:'Server connection requires approval'});
  assert.match(managed, /Connect Jira · hc-atlassian for this turn\?/);
  assert.match(managed, /Managed connection · connects for this turn only/);
  assert.match(managed, /each tool call keeps its own permission check/);
  assert.doesNotMatch(managed, /Allow app action/);
  const selected = previewApprovalRequest({details:{kind:'mcp-connect',serverName:'example',toolName:'*'}});
  assert.match(selected, /Connect example for this turn\?/);
  assert.match(selected, /Selected MCP server/);
  const escaped = previewApprovalRequest({details:{kind:'mcp-connect',serverName:'a',serverLabel:'<b>x</b>'}});
  assert.doesNotMatch(escaped, /<b>x<\/b>/);
});
