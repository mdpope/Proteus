import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {createRequire} from 'node:module';
const {installExtensionPermissions}=createRequire(import.meta.url)('../desktop/browser/extension-permissions.cjs');
function host(rows){
 const extension={id:'fixture',manifest:{permissions:['tabs'],optional_permissions:['nativeMessaging']}},events=new EventEmitter();events.getAllExtensions=()=>[extension];const permissionMap=new Map([[extension.id,{permissions:['tabs'],origins:[]}]]);const handlers=new Map();
 handlers.set('permissions.request',{callback:async(_event,value)=>{permissionMap.get(extension.id).permissions.push(...value.permissions);return true;}});handlers.set('permissions.remove',{});
 for(const name of ['runtime.connectNative','runtime.sendNativeMessage','runtime.disconnectNative'])handlers.set(name,{permission:'nativeMessaging',callback:()=>true});
 const value={rows,session:{extensions:events},adapter:{ctx:{router:{handlers}},api:{permissions:{permissionMap},runtime:{hostMap:{}}}}};let saved=0;installExtensionPermissions(value,()=>saved++);return {value,extension,handlers,permissionMap,saved:()=>saved};
}
test('optional native grants persist per profile, remain declared, are enforced and revoke independently',async()=>{
 const a=host([{id:'fixture'}]),b=host([{id:'fixture'}]),invoke=h=>h.handlers.get('runtime.connectNative').callback({extension:h.extension});assert.throws(()=>invoke(a),/required/);
 await a.handlers.get('permissions.request').callback({extension:a.extension},{permissions:['nativeMessaging']});assert.equal(invoke(a),true);assert.throws(()=>invoke(b),/required/);assert.equal(a.saved(),1);
 const restored=host(structuredClone(a.value.rows));assert.equal(invoke(restored),true);restored.handlers.get('permissions.remove').callback({extension:restored.extension},{permissions:['nativeMessaging']});assert.throws(()=>invoke(restored),/required/);assert.deepEqual(restored.value.rows[0].optionalPermissions,[]);
 const reloaded=host(restored.value.rows);assert.throws(()=>invoke(reloaded),/required/);assert.equal(invoke(a),true,'other sessions retain their separate consent');
 let closed=0;a.value.adapter.api.runtime.hostMap.connection={extensionId:a.extension.id,destroy(){closed++;}};a.value.session.extensions.emit('extension-unloaded',{},a.extension);assert.equal(closed,1);assert.equal(invoke(a),true,'disabling closes pipes without erasing saved consent');
});
