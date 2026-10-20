import {proteusOrientation} from '../public/proteus-orientation.js';
export function captureAppCapabilities(run,tools,update,ceiling){
 const permits=name=>!ceiling||ceiling.includes('custom:*')||ceiling.includes(name);
 run.appCapabilities={core:proteusOrientation,capturedAt:new Date().toISOString(),tools:tools.map(tool=>({name:tool.name,description:tool.description,registered:true,enabledBySelection:permits(tool.name),loading:tool.defer==='auto'?'on-demand':'loaded'})),permissionNote:'Tool availability follows the current owner and connected devices. Browser tabs work across available profiles without tab-sharing or extension opt-ins. Per-chat and workflow approvals still apply.'};
 update?.();return run.appCapabilities;
}
