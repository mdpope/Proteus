import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function executableFile(file) {
 try { if(!fs.statSync(file).isFile())return false;fs.accessSync(file,fs.constants.X_OK);return true; }
 catch { return false; }
}

// Desktop launchers need not inherit a terminal's PATH. Keep an explicit choice
// authoritative, then honor PATH before checking known native installations.
// Discovery never runs a shell or changes provider credentials/configuration.
export function linuxCodexExecutable({env=process.env,home=os.homedir(),executable=executableFile}={}) {
 if(env.PROTEUS_CODEX_PATH)return env.PROTEUS_CODEX_PATH;
 const directories=(env.PATH||'').split(':').filter(directory=>path.posix.isAbsolute(directory));
 const candidates=[...directories.map(directory=>path.posix.join(directory,'codex')),
  '/opt/codex-desktop/resources/codex',path.posix.join(home,'.local/bin/codex'),'/usr/local/bin/codex','/usr/bin/codex'];
 return [...new Set(candidates)].find(file=>executable(file))||'codex';
}
