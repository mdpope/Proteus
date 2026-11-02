const id=value=>typeof value==='string'&&/^[a-zA-Z0-9_:.-]{1,256}$/.test(value)?value:null;
export function inputOrigin(value,{hostId,deviceId='local-desktop',client='desktop'}={}){
 if(!value||typeof value!=='object')return null;
 // Device/owner identity is supplied by the authenticated transport. Client values only
 // narrow a presentation target; they never carry sharing, source or filesystem grants.
 return {hostId,deviceId,client,windowId:id(value.windowId),viewId:id(value.viewId)};
}
export function localInputOrigin(value,service){
 if(!value)return null;
 const peer=value.client!=='desktop'&&service.remote.config.devices.find(device=>device.id===value.deviceId);
 return inputOrigin(value,{hostId:service.remote.info().hostId,...(peer?{deviceId:peer.id,client:value.client==='mobile'?'mobile':value.client==='website'?'website':'remote-desktop'}:{})});
}
