import {proteusOrientation} from '../public/proteus-orientation.js';
export function captureAppCapabilities(run,tools,update,ceiling){
 const permits=name=>!ceiling||ceiling.includes('custom:*')||ceiling.includes(name);
 run.appCapabilities={core:proteusOrientation,capturedAt:new Date().toISOString(),tools:tools.map(tool=>({name:tool.name,description:tool.description,registered:true,enabledBySelection:permits(tool.name),loading:tool.defer==='auto'?'on-demand':'loaded'})),permissionNote:'Registration and selection do not grant access. Per-chat approvals, tab/profile sharing, developer scope and owner-device grants are checked for each operation.'};
 update?.();return run.appCapabilities;
}
