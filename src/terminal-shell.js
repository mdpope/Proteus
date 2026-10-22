import path from 'node:path';

export function defaultTerminalShell(platform = process.platform, env = process.env) {
  if (platform === 'win32') return path.win32.join(env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  return platform === 'darwin' ? '/bin/zsh' : env.SHELL || '/bin/bash';
}

// A saved startup command is explicit user intent; restoration always omits it.
export function terminalShellArgs(shell, command = '', resume = false, platform = process.platform) {
  if (platform !== 'win32') return !resume && command ? ['-lc', command] : ['-l'];
  const name = path.win32.basename(shell).toLowerCase().replace(/\.exe$/, '');
  if (name === 'powershell' || name === 'pwsh') return !resume && command
    ? ['-NoLogo', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')]
    : ['-NoLogo'];
  if (name === 'cmd') return !resume && command ? ['/d', '/s', '/c', command] : ['/d'];
  if (['bash', 'sh', 'zsh', 'fish'].includes(name)) return !resume && command ? ['-lc', command] : ['-l'];
  throw new Error('Choose PowerShell, Command Prompt, or a supported Unix shell for this terminal.');
}
