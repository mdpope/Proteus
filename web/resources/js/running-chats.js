import {hostRunningChatCount} from '../../../public/computer-identity.js';
const observations=new Map();
export function observeRunningChats(hostId,source,state,online=true){
 if(!hostId)return;
 const key=hostId+':'+source;
 if(!online)observations.delete(key);else observations.set(key,{hostId,count:hostRunningChatCount(state),at:Date.now()});
 const latest=new Map();for(const row of observations.values())if(!latest.has(row.hostId)||latest.get(row.hostId).at<=row.at)latest.set(row.hostId,row);
 const count=[...latest.values()].reduce((sum,row)=>sum+row.count,0),badge=document.querySelector('#shell-running-chats');
 if(badge){badge.hidden=false;badge.textContent=String(count);badge.setAttribute('aria-label',count+' running chats');}
 return count;
}
