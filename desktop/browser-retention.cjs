const RETAINED_TABS=6;
const RECENT_MS=60*60*1000;

function retirementCandidates(tabs, now, activeId, limit=RETAINED_TABS) {
  if(!Number.isInteger(limit)||limit<1||limit>256)throw Error('Loaded tab limit must be an integer from 1 to 256.');
  const active=activeId instanceof Set?activeId:new Set([activeId]);
  const ordered=[...tabs].filter(tab=>tab.persist!==true&&tab.view).sort((a,b)=>(b.lastTouchedAt||0)-(a.lastTouchedAt||0));
  const newest=new Set(ordered.slice(0,limit).map(tab=>tab.id));
  return ordered.filter(tab=>!newest.has(tab.id)&&now-(tab.lastTouchedAt||now)>=RECENT_MS&&!active.has(tab.id)&&!tab.owner&&!tab.automationRuns?.size&&!tab.agentActions&&!tab.shared&&!tab.downloads?.size&&!tab.view.webContents.isCurrentlyAudible());
}

module.exports={retirementCandidates,RETAINED_TABS,RECENT_MS};
