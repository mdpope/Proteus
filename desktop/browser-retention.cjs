const RETAINED_TABS=6;
const RECENT_MS=60*60*1000;

function retirementCandidates(tabs, now, activeId) {
  const ordered=[...tabs].filter(tab=>tab.persist!==true).sort((a,b)=>(b.lastTouchedAt||0)-(a.lastTouchedAt||0));
  const newest=new Set(ordered.slice(0,RETAINED_TABS).map(tab=>tab.id));
  return ordered.filter(tab=>tab.view&&!newest.has(tab.id)&&now-(tab.lastTouchedAt||now)>=RECENT_MS&&tab.id!==activeId&&!tab.owner&&!tab.shared&&!tab.downloads?.size&&!tab.view.webContents.isCurrentlyAudible());
}

module.exports={retirementCandidates,RETAINED_TABS,RECENT_MS};
