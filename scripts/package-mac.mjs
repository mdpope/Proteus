// Local development bundle. Optional existing Apple signing identity keeps OS grants stable.
// Distribution notarization is separate.
import { packager } from '@electron/packager';
import { rebuild } from '@electron/rebuild';
import { preparePty } from './prepare-pty.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const signingIdentity = process.env.PROTEUS_MAC_SIGN_IDENTITY || '-';
if (process.platform !== 'darwin') throw new Error('Build the Mac application on macOS.');
// These helpers access provider-owned Keychain items. Keep GitHub's designated
// requirements intact: ad-hoc re-signing breaks their existing Keychain trust.
const vendorFiles = ['copilot-runtime', 'runtime.node'].map(name =>
  `node_modules/@github/copilot-sdk-darwin-${process.arch}/prebuilds/darwin-${process.arch}/${name}`);
const vendorRequirement = '=anchor apple generic and certificate leaf[subject.OU] = "VEKTX9H2N7"';
for (const relative of vendorFiles) execFileSync('codesign', ['--verify', '--strict', '-R', vendorRequirement, path.join(root, relative)], { stdio: 'pipe' });
const source = path.join(root, 'ios/Proteus/Assets.xcassets/AppIcon.appiconset/AppIcon.png');
const iconset = path.join(root, 'dist/Proteus.iconset'); fs.mkdirSync(iconset, { recursive: true });
fs.copyFileSync(source, path.join(root, 'desktop/icon.png'));
for (const size of [16, 32, 128, 256, 512]) for (const scale of [1, 2]) {
  execFileSync('sips', ['-z', String(size * scale), String(size * scale), source, '--out', path.join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`)], { stdio: 'ignore' });
}
const icon = path.join(root, 'dist/Proteus.icns');
execFileSync('iconutil', ['-c', 'icns', iconset, '-o', icon]);
await import('./build-terminal.mjs');
const bundles = await packager({ dir: root, out: path.join(root, 'dist'), overwrite: true,
  name: 'Proteus', executableName: 'Proteus', appBundleId: 'org.proteusapp.proteus.desktop',
  platform: 'darwin', arch: process.arch, icon, asar: false,
  // Rebuild only our PTY in the copied app. Preserve source Node ABI and vendor signatures.
  afterCopy: [async ({buildPath, electronVersion, arch}) => {
    await rebuild({buildPath, electronVersion, arch, onlyModules:['node-pty'], force:true});
    preparePty(buildPath);
  }],
  // Keep runtime files and dependencies; never ship tests, worktrees or local configuration.
  ignore: [/^\/(?:web|ios|test|docs|scripts|extensions|dist|coverage|\.runtime|\.git|\.github)(?:\/|$)/, /^\/\.env/, /\.(?:log|xcresult)$/],
  osxSign: { ignore: file => vendorFiles.some(relative => file.endsWith('/' + relative)), identity: signingIdentity, identityValidation: false, preAutoEntitlements: false, gatekeeperAssess: false, optionsForFile: () => ({ hardenedRuntime: false, signatureFlags: '0', timestamp: 'none' }) },
});
for (const directory of bundles) {
  const bundle = path.join(directory, 'Proteus.app');
  for (const relative of vendorFiles) {
    const embedded = path.join(bundle, 'Contents/Resources/app', relative);
    if (!fs.readFileSync(embedded).equals(fs.readFileSync(path.join(root, relative)))) throw new Error('Packaging modified a vendor-signed Copilot binary: ' + relative);
    execFileSync('codesign', ['--verify', '--strict', '-R', vendorRequirement, embedded], { stdio: 'pipe' });
  }
  console.log(bundle);
}
