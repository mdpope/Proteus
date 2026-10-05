// Compatibility entry point for the current workspace acceptance checks.
// The original script asserted feature tabs, eager browser restoration and a
// manual shell-resume button, which were intentionally removed in 0.2.0.
// Run the focused successors in separate processes, as each fixture launches
// and tears down Electron and must not inherit another fixture's resources.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const directory=path.dirname(fileURLToPath(import.meta.url));
for (const file of [
  'content-tabs-ui.mjs',       // Home, content order, full-width tabs and scroll preservation
  'browser-actions-ui.mjs',    // browser lifecycle, overview and safe native actions
  'terminal-restart-ui.mjs',   // process/tmux restart without command replay
  'sidebar-tabs-ui.mjs',      // collapsed rail, Home and tab selections
]) {
  const result=spawnSync(process.execPath,[path.join(directory,file)],{stdio:'inherit',timeout:120_000});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
console.log('Current desktop workspace acceptance checks passed.');
