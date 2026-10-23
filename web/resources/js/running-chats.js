import {chatType} from '../../../public/features/chats/chat-types.js';
import {hostRunningChatCount} from '../../../public/services/remote/computer-identity.js';
const observations=new Map();
export function observeRunningChats(hostId,source,state,online=true){
 if(!hostId)return;
 const key=hostId+':'+source;
 if(!online)observations.delete(key);else observations.set(key,{hostId,count:hostRunningChatCount(state),state,at:Date.now()});
 const latest=new Map();for(const row of observations.values())if(!latest.has(row.hostId)||latest.get(row.hostId).at<=row.at)latest.set(row.hostId,row);
 const count=[...latest.values()].reduce((sum,row)=>sum+row.count,0),badge=document.querySelector('#shell-running-chats');
 if(badge){badge.hidden=false;badge.textContent=String(count);badge.setAttribute('aria-label',count+' running chats');}
 for(const feature of ['schedules','internet','attention']){const total=[...latest.values()].reduce((sum,row)=>sum+(feature==='schedules'?(row.state?.schedules||[]).length:feature==='internet'?(row.state?.runs||[]).filter(run=>!run.archivedAt&&chatType(run)==='internet').length:(row.state?.attention||[]).length+(row.state?.runs||[]).filter(run=>run.attentionRequired).length),0),node=document.querySelector('[data-feature-count="'+feature+'"]');if(node){node.textContent=String(total);node.hidden=false;node.classList.toggle('attention-count',feature==='attention'&&total>0);}}
 return count;
}
