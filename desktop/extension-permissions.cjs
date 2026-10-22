// Keep user-approved optional grants with the owning profile's extension record.
// The adapter router still verifies the sending extension and Electron session.
function installExtensionPermissions(host,save,notify=()=>{}){
 const {api,ctx}=host.adapter,permissions=api.permissions,router=ctx.router;
 const restore=extension=>{
  const current=permissions.permissionMap.get(extension.id);if(!current)return;
  const row=host.rows.find(row=>row.id===extension.id),manifest=extension.manifest;
  current.permissions=[...new Set([...(manifest.permissions||[]),...(row?.optionalPermissions||[]).filter(p=>(manifest.optional_permissions||[]).includes(p))])];
  current.origins=[...new Set([...(manifest.host_permissions||[]),...(row?.optionalOrigins||[]).filter(p=>(manifest.optional_host_permissions||[]).includes(p))])];
 };
 const persist=extension=>{
  const row=host.rows.find(row=>row.id===extension.id);if(!row)return;
  const current=permissions.permissionMap.get(extension.id);
  row.optionalPermissions=(current?.permissions||[]).filter(p=>!(extension.manifest.permissions||[]).includes(p));
  row.optionalOrigins=(current?.origins||[]).filter(p=>!(extension.manifest.host_permissions||[]).includes(p));save();
 };
 host.session.extensions.on('extension-loaded',(_event,extension)=>restore(extension));
 host.session.extensions.on('extension-unloaded',(_event,extension)=>{for(const connection of Object.values(api.runtime.hostMap))if(connection?.extensionId===extension.id)connection.destroy();});
 for(const extension of host.session.extensions.getAllExtensions())restore(extension);
 const request=router.handlers.get('permissions.request'),original=request.callback;
 request.callback=async(event,value)=>{
  const origins=[...(event.extension.manifest.host_permissions||[]),...(event.extension.manifest.optional_host_permissions||[])];
  if(value.origins?.some(origin=>!origins.includes(origin)))throw Error('Permissions request includes an undeclared origin.');
  const granted=await original(event,value);if(granted)persist(event.extension);return granted;
 };
 router.handlers.get('permissions.remove').callback=(event,value)=>{
  const current=permissions.permissionMap.get(event.extension.id),manifest=event.extension.manifest;
  current.permissions=current.permissions.filter(p=>!value.permissions?.includes(p)||(manifest.permissions||[]).includes(p));
  current.origins=current.origins.filter(p=>!value.origins?.includes(p)||(manifest.host_permissions||[]).includes(p));persist(event.extension);
  if(value.permissions?.includes('nativeMessaging'))for(const connection of Object.values(api.runtime.hostMap))if(connection?.extensionId===event.extension.id)connection.destroy();
  return true;
 };
 for(const name of ['runtime.connectNative','runtime.sendNativeMessage','runtime.disconnectNative']){
  const handler=router.handlers.get(name),callback=handler.callback;handler.permission=undefined;
  handler.callback=(event,...args)=>{
   if(!permissions.permissionMap.get(event.extension.id)?.permissions.includes('nativeMessaging'))throw Error('Native messaging permission is required.');
   if(name==='runtime.disconnectNative'){
    const connection=api.runtime.hostMap[args[0]];if(connection&&connection.extensionId!==event.extension.id)throw Error('This native connection belongs to another extension.');
   }
   const result=callback(event,...args);
   if(name==='runtime.connectNative'){
    const connection=api.runtime.hostMap[args[0]];
    if(connection){connection.onClosed=error=>{if(api.runtime.hostMap[args[0]]===connection)delete api.runtime.hostMap[args[0]];if(error)notify(event.extension,error);};if(connection.closed)connection.onClosed(connection.failure);}
   }
   if(name==='runtime.sendNativeMessage')return Promise.resolve(result).catch(error=>{notify(event.extension,error);throw error;});
   return result;
  };
 }
}
module.exports={installExtensionPermissions};
