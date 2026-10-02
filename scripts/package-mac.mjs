// Local, ad-hoc-signed development bundle. Distribution notarization is separate.
import { packager } from '@electron/packager';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.platform !== 'darwin') throw new Error('Build the Mac application on macOS.');
const source = path.join(root, 'ios/Proteus/Assets.xcassets/AppIcon.appiconset/AppIcon.png');
const iconset = path.join(root, 'dist/Proteus.iconset'); fs.mkdirSync(iconset, { recursive: true });
fs.copyFileSync(source, path.join(root, 'desktop/icon.png'));
for (const size of [16, 32, 128, 256, 512]) for (const scale of [1, 2]) {
  execFileSync('sips', ['-z', String(size * scale), String(size * scale), source, '--out', path.join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`)], { stdio: 'ignore' });
}
const icon = path.join(root, 'dist/Proteus.icns');
execFileSync('iconutil', ['-c', 'icns', iconset, '-o', icon]);
const bundles = await packager({ dir: root, out: path.join(root, 'dist'), overwrite: true,
  name: 'Proteus', executableName: 'Proteus', appBundleId: 'org.proteusapp.proteus.desktop',
  platform: 'darwin', arch: process.arch, icon, asar: false,
  // Keep runtime files and dependencies; never ship tests, worktrees or local configuration.
  ignore: [/^\/(?:ios|test|docs|scripts|extensions|dist|coverage|\.runtime|\.git|\.github)(?:\/|$)/, /^\/\.env/, /\.(?:log|xcresult)$/],
  osxSign: { identity: '-', identityValidation: false, preAutoEntitlements: false, gatekeeperAssess: false, optionsForFile: () => ({ hardenedRuntime: false, signatureFlags: '0', timestamp: 'none' }) },
});
for (const bundle of bundles) console.log(path.join(bundle, 'Proteus.app'));
