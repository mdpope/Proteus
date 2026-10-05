const { execFileSync } = require('node:child_process');

function trackedChildren(rootPid, knownPids = new Set(), psOutput = null) {
  if (process.platform === 'win32') return [];
  let output=psOutput;
  try { output ??= execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,rss=,%cpu=,comm='], { encoding: 'utf8', timeout: 2000, maxBuffer: 2_000_000 }); }
  catch { return []; }
  const rows=output.split('\n').map(line=>{const match=line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+(.+)$/);return match?[Number(match[1]),Number(match[2]),Number(match[3]),Number(match[4]),match[5]]:null;}).filter(Boolean);
  const descendants=new Set([rootPid]),found=[];
  let changed=true;
  while(changed){changed=false;for(const [pid,parent] of rows)if(!descendants.has(pid)&&descendants.has(parent)){descendants.add(pid);changed=true;}}
  for(const [pid,,rssKiB,cpuPercent,command] of rows)if(pid!==rootPid&&descendants.has(pid)&&!knownPids.has(pid)&&!/\/(?:ps)$|^ps$/.test(command))found.push({pid,type:'child',name:'Proteus child process',cpuPercent,memoryBytes:rssKiB*1024,tabIds:[]});
  return found;
}
function trackedPids(entries, knownPids = new Set(), psOutput = null) {
  if (process.platform === 'win32' || !Array.isArray(entries) || !entries.length) return [];
  let output=psOutput;
  try { output ??= execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,rss=,%cpu=,comm='], { encoding:'utf8', timeout:2000, maxBuffer:2_000_000 }); }
  catch { return []; }
  const selected=new Map(entries.filter(item=>Number.isSafeInteger(item?.pid)&&item.pid>0).map(item=>[item.pid,item]));
  return output.split('\n').map(line=>{const match=line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+(.+)$/);if(!match)return null;const pid=Number(match[1]),entry=selected.get(pid);return entry&&!knownPids.has(pid)?{pid,type:'persistent-terminal',name:entry.role||'tmux',cpuPercent:Number(match[4]),memoryBytes:Number(match[3])*1024,tabIds:[],sessionId:entry.sessionId||null}:null;}).filter(Boolean);
}
function resourceTotals(processes) {
  return {memoryBytes:processes.reduce((sum,p)=>sum+(Number.isFinite(p.memoryBytes)?p.memoryBytes:0),0),cpuPercent:processes.reduce((sum,p)=>sum+(Number.isFinite(p.cpuPercent)?p.cpuPercent:0),0),processCount:processes.length};
}
module.exports={trackedChildren,trackedPids,resourceTotals};
