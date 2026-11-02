import {chatModelOptions,validateModelOptions} from '../../models/model-catalog.js';

// Validate on the executing owner; the sender's catalog is not execution authority.
// The caller rechecks run identity/project/provider after this asynchronous preflight.
export async function validateAgentSendModelOptions(service,run,args){
 if(!args.modelOptions){if(args.modelScope!==undefined||args.expectedProvider!==undefined)throw Error('Scoped model settings are missing.');return undefined;}
 if(args.modelScope!=='next-turn'||args.mode==='steer')throw Error('Model settings require a queued next-turn scope.');
 if(args.expectedProvider!==run.schedule.provider)throw Error('The captured provider changed. Refresh the chat.');
 const options=chatModelOptions(args.modelOptions);
 if(run.schedule.provider!=='rehearsal'){
  const catalog=await service.catalogs?.[run.schedule.provider]?.get(true);
  if(!catalog?.available||catalog.stale||catalog.error)throw Error('The executing provider catalog is unavailable. Refresh before sending.');
  const model=catalog.models?.find(item=>item.id===options.model);
  if(!model)throw Error('Choose an available model from the executing computer.');
  validateModelOptions(options,model);
 }
 return options;
}
