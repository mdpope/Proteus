/** Choose a native owner window without consulting arbitrary global browser focus. */
function agentWindow({contexts,origin,currentId,runId,parentId,explicitWindowId,scheduled=false,allocatedWindowId}){
 const available=contexts.filter(ctx=>!ctx.window.isDestroyed()),byId=id=>available.find(ctx=>ctx.id===id);
 if(explicitWindowId){if(!byId(explicitWindowId))throw Error('The requested app window is closed.');return {id:explicitWindowId,note:'Explicitly selected app window.'};}
 if(origin?.client==='desktop'&&origin.deviceId==='local-desktop'&&byId(origin.windowId))return {id:origin.windowId,note:'Submitting app window.'};
 // A schedule has no human-selected UI container. Keep its owner allocation stable
 // across tools without moving focus, selection, membership or browser authority.
 if(scheduled&&byId(allocatedWindowId))return {id:allocatedWindowId,note:'Retained scheduled browser owner window.'};
 const matching=available.filter(ctx=>(ctx.session?.get()?.tabs||[]).some(tab=>!tab.navigationClosed&&(parentId&&tab.id===parentId||!tab.hostId&&(tab.runId||tab.chatId||tab.id)===runId)));
 const chosen=matching.find(ctx=>ctx.id===currentId)||matching.sort((a,b)=>a.id.localeCompare(b.id))[0];
 if(chosen)return {id:chosen.id,note:origin?.client==='desktop'?'The submitting window closed; using an owner window with the same project/chat.':'This client’s browser is on another device; using the owner window with this project/chat.'};
 if(scheduled&&available.length){const target=byId('main')||[...available].sort((a,b)=>a.id.localeCompare(b.id))[0];return {id:target.id,note:'Scheduled browser owner allocated without selecting its chat or changing focus.'};}
 if(available.length===1)return {id:available[0].id,note:origin?'Using the only available owner window; this device’s web view cannot be controlled remotely.':'No submitting-window record; using the only owner window.'};
 if(!origin&&byId(currentId))return {id:currentId,note:'No submitting-window record; using the current owner window.'};
 throw Error('No owner window has this project/chat open. Open it on the owning computer, or explicitly choose an app window.');
}
function originTab(tabs,tabId,windowId){
 const tab=tabs.get(tabId);if(!tab)return tabId;
 if((tab.windowId||'main')===windowId)return tabId;
 const logical=tab.thumbnailId||tab.contentTabId||tab.id;
 const mirror=[...tabs.values()].find(row=>(row.windowId||'main')===windowId&&(row.thumbnailId||row.contentTabId||row.id)===logical&&(row.profileId||'default')===(tab.profileId||'default'));
 if(!mirror)throw Error('This tab is not open in the submitting window. Refresh the tab list there or explicitly choose its owning window.');
 return mirror.id;
}
module.exports={agentWindow,originTab};
