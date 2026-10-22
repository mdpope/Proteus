// Unsent setup belongs to its window, separate from the shared blank-page record.
// Bound the complete record before accepting it; never persist attachment bytes.
function normalizeChatSetupDraft(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return;
 if(value.schemaVersion!==1)throw Error('New chat draft format is unsupported. The original workspace was preserved.');
 const encoded=JSON.stringify(value);if(Buffer.byteLength(encoded)>512*1024)throw Error('New chat draft exceeds its storage limit. The original workspace was preserved.');
 const clean=JSON.parse(encoded);for(const key of ['parentId','hostId','workspaceId','projectId','title'])if(clean[key]!==undefined&&typeof clean[key]!=='string')delete clean[key];
 if(clean.prompt!==undefined&&(typeof clean.prompt!=='string'||clean.prompt.length>200000))throw Error('New chat message exceeds its storage limit.');
 clean.form=Object.fromEntries(Object.entries(clean.form||{}).slice(0,100).filter(([key,value])=>/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(key)&&key!=='__proto__'&&(typeof value==='boolean'||typeof value==='string'&&value.length<=200000)));
 if(clean.selection){const selection=clean.selection;clean.selection={...selection,selectedIds:Array.isArray(selection.selectedIds)?selection.selectedIds.filter(id=>typeof id==='string'&&id.length<=256).slice(0,1000):[],includeDefaults:selection.includeDefaults!==false,agentId:typeof selection.agentId==='string'?selection.agentId.slice(0,256):null};}
 clean.peerSources=Array.isArray(clean.peerSources)?clean.peerSources.filter(id=>typeof id==='string'&&id.length<=256).slice(0,1000):[];
 clean.details=Array.isArray(clean.details)?clean.details.slice(0,100).map(value=>value===true):[];
 delete clean.attachments;return clean;
}
module.exports={normalizeChatSetupDraft};
