// Updater observation only: never cancel work, mutate downloads or clear counters.
const STALL_MS=5*60_000,firstSeen=new WeakMap();
function browserUpdateActivity(tabs,now=Date.now()){
 const rows=[];
 for(const tab of tabs){
  const title=String(tab.title||tab.view?.webContents?.getTitle?.()||tab.id).slice(0,200);
  for(const item of tab.downloads||[]){
   let state='unknown',paused=false;try{state=item.getState();paused=item.isPaused();}catch{}
   rows.push({tabId:tab.id,title,kind:'download',state:state==='progressing'&&paused?'paused':state,blocking:state==='progressing'&&!paused});
  }
  if(tab.agentActions){
   if(!firstSeen.has(tab))firstSeen.set(tab,now);
   const lastProgressAt=tab.lastAgentProgressAt||firstSeen.get(tab),stalled=now-lastProgressAt>=STALL_MS;
   rows.push({tabId:tab.id,title,kind:'agent action',state:stalled?'stalled':'progressing',lastProgressAt,blocking:!stalled});
  }else firstSeen.delete(tab);
 }
 return rows;
}
const browserUpdateBlockers=rows=>rows.filter(row=>row.blocking).map(row=>`Browser ${row.kind} is ${row.state}: ${row.title} (${row.tabId}).`);
module.exports={browserUpdateActivity,browserUpdateBlockers,STALL_MS};
