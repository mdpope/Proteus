export function integrationTools(health,runId){return health?[{
  name:'proteus_integrations',defer:'never',
  description:'List this chat’s selected integration consumers, expected account labels, explicit resource contexts and observed connection health. Use list before verify or select. Labels are not proof of authenticated identity. Select works only when the adapter can isolate the context; never switch global CLI logins, copy tokens or substitute another account after a failure. Existing tool permissions and user authorization still apply.',
  parameters:{type:'object',properties:{action:{type:'string',enum:['list','verify','select']},consumerId:{type:'string'},contextId:{type:'string'}},required:['action'],additionalProperties:false},
  handler:async args=>JSON.stringify(await health.agent(runId,args))
}]:[];}
