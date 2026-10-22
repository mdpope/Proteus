import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Native executables work with shell:false. Never pass provider prompts through
// a .cmd shim or PowerShell command string just to find an optional installation.
export function windowsProviderExecutable(provider, {home=os.homedir(), env=process.env}={}) {
  if(!['codex','claude'].includes(provider))throw new Error('Unknown Windows provider.');
  const native=path.join(home,'.local','bin',provider+'.exe');
  if(fs.existsSync(native)&&fs.statSync(native).isFile())return native;
  if(provider==='codex') {
    const root=path.join(env.LOCALAPPDATA||path.join(home,'AppData','Local'),'OpenAI','Codex','bin');
    try {
      const candidates=fs.readdirSync(root,{withFileTypes:true}).filter(entry=>entry.isDirectory())
        .map(entry=>path.join(root,entry.name,'codex.exe')).filter(file=>fs.existsSync(file)&&fs.statSync(file).isFile())
        .sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs||a.localeCompare(b));
      if(candidates.length)return candidates[0];
    } catch { /* The desktop app is optional; native PATH installs also work. */ }
  }
  return provider+'.exe';
}
