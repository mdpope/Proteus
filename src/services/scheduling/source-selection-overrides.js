const keys=['provider','model','reasoningMode','reasoningEffort','contextTier','serviceTier'];
const selection=schedule=>Object.fromEntries(keys.filter(key=>schedule[key]!==undefined).map(key=>[key,schedule[key]]));
export function validateSelectionOverride(value){
 const text=(value,empty=false)=>typeof value==='string'&&(empty||value.length>0)&&value.length<=4096&&!/[\x00-\x1f]/.test(value);
 if(!value||value.version!==1||Object.keys(value).some(key=>!['version','source','selection','baseSelection'].includes(key))||!value.source||Object.keys(value.source).some(key=>!['system','manifest'].includes(key))||!text(value.source.system)||!text(value.source.manifest)||[value.selection,value.baseSelection].some(row=>!row||!text(row.provider)||!text(row.model,true)||Object.entries(row).some(([key,value])=>!keys.includes(key)||!text(value,true))))throw Error('Invalid source-owned provider selection override.');
}
export function ownerSelectionUpdate(current,next){
 if(!current.source?.manifest)return next;
 const before=selection(current),after=selection(next);
 if(JSON.stringify(before)===JSON.stringify(after))return next;
 return {...next,ownerSelectionOverride:{version:1,source:{system:current.source.system,manifest:current.source.manifest},selection:after,baseSelection:current.ownerSelectionOverride?.baseSelection||before}};
}
export function reconcileOwnerSelection(current,exported,next){
 const override=current.ownerSelectionOverride;
 if(!override){const result={...next};delete result.ownerSelectionOverride;return result;}
 validateSelectionOverride(override);
 if(override.source.system!==next.source?.system||override.source.manifest!==next.source?.manifest)throw Error('Provider selection override belongs to another canonical source.');
 const result={...next,ownerSelectionOverride:{...override,baseSelection:selection(exported)}};
 for(const key of keys)delete result[key];return {...result,...override.selection};
}
export function clearOwnerSelection(schedule){
 const override=schedule.ownerSelectionOverride;validateSelectionOverride(override);
 const result={...schedule};delete result.ownerSelectionOverride;for(const key of keys)delete result[key];return {...result,...override.baseSelection};
}
