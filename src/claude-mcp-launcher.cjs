// Claude Code's MCP JSON has no per-server cwd. This launcher runs one selected
// stdio server in the source directory captured by Proteus. Its argv contains
// only the path to a private, short-lived spec, never server arguments or env.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { hasPrivatePermissions } = require('./private-paths.cjs');

const file = process.argv[2];
if (process.argv.length !== 3 || !file || !path.isAbsolute(file)) process.exit(64);
let spec;
try {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || !hasPrivatePermissions(file, stat) || stat.size > 512 * 1024) throw new Error('private spec required');
  spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!path.isAbsolute(spec.workingDirectory) || !fs.statSync(spec.workingDirectory).isDirectory() ||
      typeof spec.command !== 'string' || !spec.command || /[\r\n\0]/.test(spec.command) ||
      !Array.isArray(spec.args) || spec.args.some(arg => typeof arg !== 'string' || arg.includes('\0')) ||
      !spec.env || typeof spec.env !== 'object' || Array.isArray(spec.env) ||
      Object.entries(spec.env).some(([key,value]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || typeof value !== 'string' || value.includes('\0'))) throw new Error('invalid private spec');
} catch { process.exit(65); }

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
Object.assign(env, spec.env);
let child;
try { child = spawn(spec.command, spec.args, { cwd:spec.workingDirectory, env, shell:false, stdio:'inherit' }); }
catch { process.exit(66); }
for (const signal of ['SIGTERM','SIGINT','SIGHUP']) process.on(signal, () => {
  try { child.kill(signal); } catch { /* The child may already have exited. */ }
});
child.once('error', () => { process.exitCode = 66; });
child.once('exit', (code,signal) => { process.exitCode = signal ? 128 + (require('node:os').constants.signals[signal] || 1) : code ?? 1; });
