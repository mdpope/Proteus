// Active orchestration time, not inference time or billed usage. Intervals are half-open.
const stamp=value=>typeof value==='number'?value:Date.parse(value);
export function unionDuration(intervals){
  const rows=intervals.map(([a,b])=>[stamp(a),stamp(b)]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>=a).sort((a,b)=>a[0]-b[0]);let total=0,end=-Infinity;
  for(const [a,b]of rows){total+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return total;
}
export function turnDuration(turn,now=Date.now(),verified=true){
  if(!turn||!Array.isArray(turn.intervals))return null;
  return unionDuration([...turn.intervals,...(turn.activeSince&&verified?[[turn.activeSince,Math.max(stamp(turn.activeSince),now)]]:[])]);
}
export function runtimeTotal(turns,now=Date.now(),verified=true){if(!Array.isArray(turns)||!turns.length)return null;return turns.reduce((total,turn)=>total+(turnDuration(turn,now,verified)||0),0);}
export function formatDuration(ms){if(!Number.isFinite(ms))return 'Unavailable';const seconds=Math.floor(Math.max(0,ms)/1000),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);return hours?`${hours}h ${minutes}m ${seconds%60}s`:minutes?`${minutes}m ${seconds%60}s`:`${seconds}s`;}
function toolIntervals(tools,now,verified){return tools.filter(t=>t.startedAt&&(t.finishedAt||t.status==='running'&&verified)).map(t=>[stamp(t.startedAt),t.finishedAt?stamp(t.finishedAt):now]);}
function activeOverlap(intervals,turns,now,verified){if(!turns?.length)return unionDuration(intervals);const active=turns.flatMap(turn=>[...(turn.intervals||[]),...(turn.activeSince&&verified?[[turn.activeSince,now]]:[])]).map(([a,b])=>[stamp(a),stamp(b)]);return unionDuration(intervals.flatMap(([a,b])=>active.map(([c,d])=>[Math.max(a,c),Math.min(b,d)])));}
export function toolDuration(tool,now=Date.now(),verified=true){
 if(Number.isFinite(tool.durationMs)&&tool.durationMs>=0)return tool.durationMs;
 const start=stamp(tool.startedAt),finish=stamp(tool.finishedAt);
 if(Number.isFinite(start)&&Number.isFinite(finish)&&finish>=start)return finish-start;
 if(Number.isFinite(start)&&tool.status==='running'&&verified&&Number.isFinite(now))return Math.max(0,now-start);
 return null;
}
export function groupDuration(tools,now=Date.now(),verified=true,turns){const intervals=toolIntervals(tools,now,verified);return intervals.length?activeOverlap(intervals,turns,now,verified):null;}
const timers=new Map();
const readers=new WeakMap();let timer=null;
function paint(node,read){const value=read();if(node.textContent!==value)node.textContent=value;}
function stopIdleTimer(){if(!timers.size&&timer!==null){clearInterval(timer);timer=null;}}
// Completed values are painted once, not revisited every second for the lifetime
// of a loaded transcript. The optional predicate also handles a running tool's
// transition to a fixed duration without leaving an idle interval behind.
export function bindRuntimeTimer(node,read,active=true){
 if(!node)return;readers.set(node,read);node.classList.add('runtime-timer');node.setAttribute('aria-live','off');paint(node,read);
 if(typeof active==='function'?active():active)timers.set(node,{read,active});else timers.delete(node);
 if(timers.size&&timer===null)timer=setInterval(()=>{
  for(const [node,binding]of timers){if(!node.isConnected){timers.delete(node);continue;}paint(node,binding.read);if(typeof binding.active==='function'&&!binding.active())timers.delete(node);}
  stopIdleTimer();
 },1000);
 stopIdleTimer();
}
export function refreshRuntimeTimers(root){for(const node of root?.querySelectorAll('.runtime-timer')||[]){const read=readers.get(node);if(read)paint(node,read);}}
export function disposeRuntimeTimers(root){for(const node of root?.querySelectorAll('.runtime-timer')||[])timers.delete(node);stopIdleTimer();}
