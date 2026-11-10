// Qualified adapter capabilities, not SDK feature availability. Adding an adapter
// requires native boundary probes; a command approval is not a process sandbox.
export function executionCapabilities(provider) {
 return {provider,exactCommandApproval:['codex','copilot','claude'].includes(provider),workingDirectory:['codex','copilot','claude'].includes(provider),scopedFilesystem:['codex','copilot','claude'].includes(provider),denyNetwork:['codex','copilot','claude'].includes(provider),processSandbox:['codex','copilot','claude'].includes(provider),implementation:provider==='codex'?'codex-native-scoped-v1':['copilot','claude'].includes(provider)?'proteus-host-scoped-v1':null,runtimeQualificationRequired:provider!=='codex'};
}
export function resolveExecutionCapabilities(schedule) {
 const capabilities=executionCapabilities(schedule.provider);
 const required=schedule.executionPermissions?.sandboxedCommands===true;
 const missing=required?['scopedFilesystem','denyNetwork','processSandbox'].filter(key=>!capabilities[key]):[];
 return {version:1,capabilities,required:{scopedFilesystem:required,denyNetwork:required,processSandbox:required},supported:missing.length===0,missing};
}
export function assertExecutionCapabilities(schedule) {
 const result=resolveExecutionCapabilities(schedule);
 if(!result.supported){const error=Error(`${schedule.provider} cannot enforce this schedule's scoped filesystem, denied network and child-process sandbox. Exact command approval alone is insufficient. Keep the current provider until a verified execution adapter is available; the saved policy has not been relaxed.`);error.code='SCHEDULE_EXECUTION_UNSUPPORTED';throw error;}
 return result;
}
