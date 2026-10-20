const path = require('node:path');

// Desktop launchers may not inherit an interactive shell's PATH.
function launchPath(platform, home, current = '') {
  if (platform === 'darwin') return [...new Set(['/opt/homebrew/bin', '/usr/local/bin', ...(current || '/usr/bin:/bin:/usr/sbin:/sbin').split(':')])].join(':');
  if (platform === 'linux') return [...new Set([path.join(home, '.local', 'bin'), ...current.split(':').filter(Boolean), '/usr/local/bin', '/usr/bin', '/bin', '/snap/bin'])].join(':');
  return current;
}
const closeToTray = (platform, env = process.env) => platform !== 'linux' || env.PROTEUS_CLOSE_TO_TRAY === '1';
module.exports = { launchPath, closeToTray };
