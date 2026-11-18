import {scratchActions} from './scratch-access.js';

export function scratchTools(handle, runId) {
 return handle ? [{name: 'proteus_scratchpad', defer: 'never',
  description: 'Manage Markdown-backed Scratchpad notes through the owning computer. Status reports configuration and this turn’s captured project. List defaults to that project; reads/writes there need no extra Scratchpad grant. Other projects (including unassigned notes) require request-access with exact projectId/workspaceId, actions, reason and stable operationId, approved by the user. Moving a chat does not widen its running turn. Read before edits; preserve expectedRevision and operationId on retries. Sync is explicit and imports manual files/normalizes frontmatter; no watcher runs. Moving a scratch requires access to both projects. Do not use shell paths to bypass this boundary. Ordinary tool permissions apply.',
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
