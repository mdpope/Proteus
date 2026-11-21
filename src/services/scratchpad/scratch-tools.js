import {scratchActions} from './scratch-access.js';

export function scratchTools(handle, runId) {
 return handle ? [{name: 'proteus_scratchpad', defer: 'never',
  description: 'Built-in tool for Markdown-backed Scratchpad notes. Call status for rootId and the captured project. Use that rootId with list to find a note and read by its id before editing. An update with body replaces the whole body. Use the read revision as expectedRevision and a stable UUID operationId for each mutation. Verify the saved revision and reconcile uncertain delivery with the original operationId and input. Other projects and unassigned notes require request-access with exact scope, actions, reason and operationId when offered. Moving a chat preserves its captured scope. Moving a scratch requires access to both locations. Use the tool for edits so the owner can enforce scope and revision. Ordinary tool permissions apply.',
  parameters: {type: 'object', properties: {
   action: {type: 'string', enum: ['status', 'request-access', ...scratchActions]},
   rootId: {type:'string',description:'Opaque storage identity from status; include it to bind reads and edits to the selected root.'},
   projectId: {type: ['string', 'null']}, workspaceId: {type: ['string', 'null']}, id: {type: 'string'},
   operationId: {type: 'string'}, expectedRevision: {type: 'string'}, title: {type: 'string'}, body: {type: 'string'},
   format: {type: 'string', enum: ['markdown','text','code']}, category: {type: 'string'}, search: {type: 'string'},
   sort: {type: 'string', enum: ['updated','created','title','category']}, offset: {type: 'integer', minimum: 0}, deleted: {type: 'boolean'},
   actions: {type: 'array', items: {type: 'string', enum: scratchActions}}, reason: {type: 'string'}
  }, required: ['action'], additionalProperties: false},
  handler: async args => JSON.stringify(await handle(args, runId))
 }] : [];
}
