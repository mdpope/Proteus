import test from 'node:test';
import assert from 'node:assert/strict';
import {approvalDetails} from '../public/features/chats/chat-details.js';
import {previewApprovalChoices,previewApprovalRequest,previewRememberChoices,previewRememberDialog,previewRememberEffect,previewPermissionHelp,previewChatModeToggle} from '../public/shared/navigation/preview-permissions.js';
const context={id:'context',workspaceId:'original',mode:'custom',workspaceMode:'custom',folders:[{path:'/synthetic/project',access:'read'}],rules:[],chatFolders:[]};
test('preview sidebar is one compact destination without workspace mutations or embedded dialogs',()=>{
 const normal=approvalDetails(context),preview=approvalDetails(context,{desktopPreview:true,workspaceName:'Original workspace'});
 assert.match(normal,/Workspace tool approvals/);assert.match(preview,/Original workspace defaults/);
 assert.match(preview,/Saved permissions/);assert.match(preview,/data-preview-add-folder/);assert.match(preview,/data-preview-workspace-permissions/);
 for(const absent of ['Bounded Autopilot','<details','data-permission-mode','data-save-permissions','data-chat-folder-path','data-chat-autoapprove'])assert.ok(!preview.includes(absent),absent+' must stay out of the sidebar');
 assert.match(previewPermissionHelp('codex'),/each approval request received from the provider/);assert.match(previewPermissionHelp('codex'),/Codex/);
 assert.match(previewChatModeToggle(context),/data-preview-chat-mode="autopilot"/);assert.match(previewChatModeToggle(context),/data-preview-chat-mode="custom"/);assert.match(previewChatModeToggle(context),/data-preview-chat-mode="ask"/);assert.doesNotMatch(previewChatModeToggle(context),/<select/);
});
test('Remember shows exactly supported narrow host scopes, keeping broad mode switches out of requests',()=>{
 const request={details:{kind:'shell',fullCommandText:'node fixture.js'},permissionChoices:[{value:'always-tool',label:'Always allow command'},{value:'autopilot-workspace',label:'Auto approve'}]};
 const html=previewApprovalChoices(request);assert.match(html,/Allow once/);assert.match(html,/data-preview-remember/);assert.doesNotMatch(html,/<details|Auto-approve|data-permission-answer/);
 assert.deepEqual(previewRememberChoices(request).map(choice=>choice.value),['always-tool']);
 assert.match(previewRememberDialog(request),/This workspace · This exact command/);assert.doesNotMatch(previewRememberDialog(request),/This chat/);
 assert.match(previewRememberEffect(request,'always-tool'),/scripts or inputs can change later/);
 assert.doesNotMatch(previewApprovalChoices({details:{kind:'shell',requestSandboxBypass:true},permissionChoices:[]}),/data-preview-remember/);
});
test('server-wide MCP breadth remains in the compact action and untrusted request text is escaped',()=>{
 const pending={details:{kind:'mcp',serverName:'synthetic <script>',toolName:'*'},permissionReason:'No saved approval'};
 const html=previewApprovalRequest(pending);assert.match(html,/Enable all connection tools/);assert.match(html,/All tools/);assert.match(html,/synthetic &lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.match(previewRememberEffect(pending,'always-tool'),/every tool/);
});
test('removing a chat folder exception does not promise to revoke inherited access',()=>{
 const inherited={...context,chatFolders:[{path:'/synthetic/project/helper',access:'read'}],workspaceFolders:context.folders};
 assert.match(approvalDetails(inherited,{desktopPreview:true}),/Remove exception/);
 assert.match(approvalDetails({...inherited,workspaceMode:'ask'},{desktopPreview:true}),/>Revoke</);
});

test('effective inherited Auto-approve makes read-only inclusion clear and immutable',()=>{
 const html=approvalDetails({...context,chatMode:'inherit',mode:'autopilot',workspaceMode:'autopilot',readOnlyTools:false},{desktopPreview:true});
 assert.match(html,/including service changes/);assert.match(html,/data-preview-read-only checked disabled/);
});
