import {workspaceSourceCategories} from './schedule-context.js';

export const workspaceSourcesSchema={type:'array',items:{type:'object',required:['workspaceId','categories'],additionalProperties:false,properties:{
 workspaceId:{type:'string',minLength:1},categories:{type:'array',items:{type:'string',enum:workspaceSourceCategories}}
}}};
const folder={type:'object',required:['path','access'],additionalProperties:false,properties:{path:{type:'string',description:'Absolute owner-local path; use the narrowest required directory.'},access:{type:'string',enum:['read','read-write']}}};
export const executionPermissionsSchema={type:'object',additionalProperties:false,description:'Future-run override, merged with inherited owner permissions. Omitted fields inherit. Arrays replace the explicit arrays, not inherited grants. Requires schedule-configure-permissions. Does not answer pending approvals.',properties:{
 sandboxedCommands:{type:'boolean',description:'Use host-owned scoped command execution for supported Codex, Copilot and Claude schedules. Requires custom mode, explicit folders and a verified destination containment adapter. Native provider command bypasses are disabled; command identity consent is separate and only explicit schedule consent persists. No blanket shell grants or network access; unsupported destinations fail closed.'},
 mode:{type:'string',enum:['ask','custom'],description:'custom uses saved exact rules; ask requires human approval for tools. Blanket automatic approval is unavailable here.'},
 readOnlyTools:{type:'boolean'},folders:{type:'array',items:folder},
 rules:{type:'array',items:{type:'object',description:'Exact operation rule. Shell command is the complete command, never an interpreter-wide grant. MCP rules require server and tool; include action for action-based tools. No wildcard tool/server/action.',properties:{
  kind:{type:'string',enum:['shell','mcp','custom-tool','url','chat-access']},command:{type:'string'},server:{type:'string'},tool:{type:'string'},action:{type:'string'},origin:{type:'string'},
  scope:{type:'object',properties:{hostId:{type:'string'},projectId:{type:'string'},chatIds:{type:'array',items:{type:'string'}},actions:{type:'array',items:{type:'string',enum:['read','dispatch','answer','cancel']}}}}
 },required:['kind']}}
}};
