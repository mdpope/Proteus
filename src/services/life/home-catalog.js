// Project only public control metadata. HA state attributes can contain camera
// URLs and tokens; neither they nor service responses belong in model context.
const part = /^[a-z0-9_]+$/;
export const entityIdPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/;
export function homeEntity(entity) {
 if (!entityIdPattern.test(entity?.entity_id || '')) return null;
 return {id:entity.entity_id,domain:entity.entity_id.split('.')[0],name:String(entity.attributes?.friendly_name || entity.entity_id).slice(0,160),state:String(entity.state).slice(0,60)};
}
export function homeServices(rows) {
 if (!Array.isArray(rows)) throw Error('Home Assistant returned invalid services.');
 return rows.flatMap(row => !part.test(row.domain || '') ? [] : Object.entries(row.services || {}).flatMap(([service,info]) => {
  if (!part.test(service) || !info || typeof info !== 'object') return [];
  return [{domain:row.domain,service,name:String(info.name || service).slice(0,160),description:String(info.description || '').slice(0,1000),requiresTarget:!!info.target,responseRequired:info.response?.optional===false,fields:Object.entries(info.fields || {}).filter(([name])=>part.test(name)).map(([name,field])=>({name,required:field?.required===true,description:String(field?.description || '').slice(0,600)}))}];
 }));
}
function canonical(value, depth=0) {
 if(depth>12)throw Error('Service data is too deeply nested.');
 if(value===null||typeof value==='boolean'||typeof value==='string')return value;
 if(typeof value==='number'&&Number.isFinite(value))return value;
 if(Array.isArray(value))return value.map(item=>canonical(item,depth+1));
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key],depth+1)]));
 throw Error('Service data must contain JSON values.');
}
export function homeCommandShape(args) {
 const ids=args.entityIds ?? (args.entityId ? [args.entityId] : []);
 if(!Array.isArray(ids)||ids.length>1000||ids.some(id=>typeof id!=='string'||!entityIdPattern.test(id))||new Set(ids).size!==ids.length)throw Error('Choose exact Home Assistant entity IDs.');
 if(args.entityIds&&args.entityId&&!ids.includes(args.entityId))throw Error('Conflicting Home Assistant targets.');
 const domain=args.domain || ids[0]?.split('.')[0];
 if(!part.test(domain || '')||!part.test(args.service || ''))throw Error('Choose an exposed Home Assistant domain and service.');
 const data=canonical(args.data ?? {});
 if(!data||Array.isArray(data)||typeof data!=='object'||JSON.stringify(data).length>65536)throw Error('Service data must be a JSON object of at most 64 KiB.');
 if(Object.hasOwn(data,'entity_id'))throw Error('Specify entity targets using entityIds, not service data.');
 return {domain,service:args.service,entityIds:[...ids].sort(),data};
}
export function validateHomeCommand(command,{entities,services}) {
 const service=services.find(row=>row.domain===command.domain&&row.service===command.service);
 if(!service)throw Error('This service is no longer exposed by Home Assistant. Refresh Smart Home.');
 if(command.entityIds.some(id=>!entities.some(entity=>entity.id===id)))throw Error('A selected device is no longer available. Refresh Smart Home.');
 if(service.requiresTarget&&!command.entityIds.length)throw Error('Choose explicit devices for this service; an empty target must not control every device.');
 // Some services (for example notifications) use "target" as an ordinary
 // declared field. Do not confuse those parameters with implicit HA targeting.
 for(const name of ['device_id','area_id','floor_id','label_id','target'])if(Object.hasOwn(command.data,name)&&!service.fields.some(field=>field.name===name))throw Error('Specify explicit entity targets; '+name+' is not a declared field of this service.');
 for(const field of service.fields)if(field.required&&!(field.name==='entity_id'&&command.entityIds.length)&&!Object.hasOwn(command.data,field.name))throw Error('This service requires '+field.name+'.');
 return service;
}
