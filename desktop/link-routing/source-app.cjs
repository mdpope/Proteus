const { execFile } = require('node:child_process');
const path = require('node:path');

// Best-effort identity of the app that handed Proteus a link, captured when the link
// arrives (before Proteus may become frontmost). macOS only; no permissions needed.
// Unknown or self-originated links simply show no source line.
const run = (args, timeout = 800) => new Promise(resolve => {
  execFile('/usr/bin/lsappinfo', args, { timeout, encoding: 'utf8' }, (error, stdout) => resolve(error ? '' : stdout));
});
function parse(output) {
  const name = output.match(/^"([^"]{1,120})"\s+ASN:/m)?.[1] || '';
  const bundleId = output.match(/bundleID="([^"]{1,200})"/)?.[1] || '';
  const bundlePath = output.match(/bundle path="([^"]{1,1024})"/)?.[1] || '';
  return name ? { name, bundleId, bundlePath: path.isAbsolute(bundlePath) && bundlePath.endsWith('.app') ? bundlePath : '' } : null;
}
async function frontmostApplication({ platform = process.platform, self = 'org.proteusapp.proteus.desktop', icon } = {}) {
  if (platform !== 'darwin') return null;
  const asn = (await run(['front'])).trim();
  if (!/^ASN:0x[0-9a-f]+-0x[0-9a-f]+:$/i.test(asn)) return null;
  const app = parse(await run(['info', '-only', 'name', '-only', 'bundlepath', '-only', 'bundleid', asn]));
  if (!app || app.bundleId === self || /^org\.proteusapp\.proteus/.test(app.bundleId)) return null;
  let iconURL = '';
  if (icon && app.bundlePath) try { const image = await icon(app.bundlePath); iconURL = image && !image.isEmpty() ? image.toDataURL() : ''; } catch {}
  return { name: app.name, bundleId: app.bundleId, icon: iconURL.length <= 200000 ? iconURL : '' };
}
module.exports = { frontmostApplication, parseApplicationInfo: parse };
