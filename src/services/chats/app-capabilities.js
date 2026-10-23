import {proteusOrientation} from '../../../public/shared/ui/proteus-orientation.js';
export function captureAppCapabilities(run,tools,update,ceiling){
 const permits=name=>!ceiling||ceiling.includes('custom:*')||ceiling.includes(name);
 run.appCapabilities={core:proteusOrientation,capturedAt:new Date().toISOString(),tools:tools.map(tool=>({name:tool.name,description:tool.description,registered:true,enabledBySelection:permits(tool.name),loading:tool.defer==='auto'?'on-demand':'loaded'})),permissionNote:'Tool availability follows the current owner and connected devices. Browser tabs work across available profiles. Human-opened tabs require explicit sharing; agent-opened tabs start shared. Profile extension opt-ins are not required. Per-chat and workflow approvals still apply.'};
 update?.();return run.appCapabilities;
}
