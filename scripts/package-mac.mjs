// Local development bundle. Optional existing Apple signing identity keeps OS grants stable.
// Distribution notarization is separate.
import { packager } from '@electron/packager';
import { rebuild } from '@electron/rebuild';
import { preparePty } from './prepare-pty.mjs';
import { prepareExtensions } from './prepare-extensions.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createDesktopSnapshot, createProvenance, verifyDesktopMetadata, fileDigest as digest, desktopPackageIgnore } from './desktop-build.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gitHead=execFileSync('git',['rev-parse','--short=12','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const unsigned=process.env.PROTEUS_MAC_UNSIGNED==='1';
const desktopPreview=process.env.PROTEUS_DESKTOP_PREVIEW==='1';
// A separate candidate identity; installed releases retain their update/Keychain identity until migration is approved.
const appleReview=process.env.PROTEUS_APPLE_REVIEW==='1';
if(appleReview&&desktopPreview)throw new Error('Choose Apple review or design preview, not both.');
const appBundleId=desktopPreview?'org.proteusapp.proteus.design-preview':appleReview?'org.proteusapp.review.proteus.desktop':'org.proteusapp.proteus.desktop';
const appName=desktopPreview?'Proteus Design Preview':'Proteus';
const signingIdentity = process.env.PROTEUS_MAC_SIGN_IDENTITY || '-';
if (process.platform !== 'darwin') throw new Error('Build the Mac application on macOS.');
// These helpers access provider-owned Keychain items. Keep GitHub's designated
// requirements intact: ad-hoc re-signing breaks their existing Keychain trust.
const vendorFiles = ['copilot-runtime', 'runtime.node'].map(name =>
  `node_modules/@github/copilot-sdk-darwin-${process.arch}/prebuilds/darwin-${process.arch}/${name}`);
const vendorRequirement = '=anchor apple generic and certificate leaf[subject.OU] = "VEKTX9H2N7"';
if(!unsigned)for (const relative of vendorFiles) execFileSync('codesign', ['--verify', '--strict', '-R', vendorRequirement, path.join(root, relative)], { stdio: 'pipe' });
const source = path.join(root, 'ios/Proteus/Assets.xcassets/AppIcon.appiconset/AppIcon.png');
const iconset = path.join(root, 'dist/Proteus.iconset'); fs.mkdirSync(iconset, { recursive: true });
fs.copyFileSync(source, path.join(root, 'desktop/icon.png'));
for (const size of [16, 32, 128, 256, 512]) for (const scale of [1, 2]) {
  execFileSync('sips', ['-z', String(size * scale), String(size * scale), source, '--out', path.join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`)], { stdio: 'ignore' });
}
const icon = path.join(root, 'dist/Proteus.icns');
execFileSync('iconutil', ['-c', 'icns', iconset, '-o', icon]);
await import('./build-terminal.mjs');
const buildInputPaths=['package.json','package-lock.json','scripts/package-mac.mjs','scripts/desktop-build.mjs','scripts/build-terminal.mjs','scripts/prepare-pty.mjs','scripts/prepare-extensions.mjs','ios/Proteus/Assets.xcassets/AppIcon.appiconset/AppIcon.png'];
const {runtimeFiles,buildInputs,verifySource,verifyCopied}=createDesktopSnapshot(root,buildInputPaths);
const dirty=Boolean(execFileSync('git',['status','--porcelain','--',...Object.keys(runtimeFiles),...buildInputPaths],{cwd:root,encoding:'utf8'}).trim());
const sourceIdentity=createProvenance({runtimeFiles,buildInputs,gitHead,dirty,appBundleId});
const {sourceFingerprint}=sourceIdentity;
const buildRevision=`${gitHead}+${dirty?'dirty.':'src.'}${sourceFingerprint.slice(0,12)}`;
const provenance={...sourceIdentity,buildRevision};
verifySource();
const bundles = await packager({ dir: root, out: process.env.PROTEUS_PACKAGE_OUTPUT || path.join(root, 'dist',...(desktopPreview?['design-preview']:[])), overwrite: true,
  name: appName, executableName: appName, appBundleId,
  platform: 'darwin', arch: process.arch, icon, asar: false,
  protocols: desktopPreview?[]:[{ name: 'Websites', schemes: ['http','https'] },{ name: 'Proteus Life sign-in', schemes: ['proteus','proteus-desktop'] }],
  // Rebuild only our PTY in the copied app. Preserve source Node ABI and vendor signatures.
  afterCopy: [async ({buildPath, electronVersion, arch}) => {
    verifySource();verifyCopied(buildPath);
    const metadataFile=path.join(buildPath,'package.json');
    if(digest(metadataFile)!==buildInputs['package.json'])throw new Error('Copied package metadata differs from source snapshot.');
    const metadata=JSON.parse(fs.readFileSync(metadataFile,'utf8'));
    metadata.buildRevision=buildRevision;
    if(desktopPreview)metadata.desktopPreview=true;
    fs.writeFileSync(metadataFile,JSON.stringify(metadata,null,2)+'\n');
    fs.writeFileSync(path.join(buildPath,'build-source.json'),JSON.stringify(provenance,null,2)+'\n');
    await rebuild({buildPath, electronVersion, arch, onlyModules:['node-pty'], force:true});
    preparePty(buildPath);
    prepareExtensions(buildPath);
  }],
  // Keep runtime files and dependencies; never ship tests, worktrees or local configuration.
  ignore: desktopPackageIgnore,
  osxSign: unsigned?undefined:{ ignore: file => vendorFiles.some(relative => file.endsWith('/' + relative)), identity: signingIdentity, identityValidation: false, preAutoEntitlements: false, gatekeeperAssess: false, optionsForFile: () => ({ hardenedRuntime: false, signatureFlags: '0', timestamp: 'none' }) },
});
for (const directory of bundles) {
  const bundle = path.join(directory, appName+'.app');
  verifySource();verifyCopied(path.join(bundle,'Contents/Resources/app'));
  const sourceMetadata=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  verifyDesktopMetadata(path.join(bundle,'Contents/Resources/app'),{...sourceMetadata,...(desktopPreview?{desktopPreview:true}:{})},provenance);
  const storePackage=path.join(bundle,'Contents/Resources/app/node_modules/electron-chrome-web-store');
  const {createRequire}=await import('node:module');
  const storeRequire=createRequire(path.join(storePackage,'package.json'));
  if(storeRequire('adm-zip/package.json').version!=='0.6.1')throw new Error('Packaged extension ZIP reader differs from pinned override.');
  for (const relative of vendorFiles) {
    const vendorPath = path.join(bundle, 'Contents/Resources/app', relative);
    if (!fs.readFileSync(vendorPath).equals(fs.readFileSync(path.join(root, relative)))) throw new Error('Packaging modified a vendor-signed Copilot binary: ' + relative);
    if(!unsigned)execFileSync('codesign', ['--verify', '--strict', '-R', vendorRequirement, vendorPath], { stdio: 'pipe' });
  }
  console.log(JSON.stringify({signingStatus:unsigned?'unsigned staging; vendor bytes preserved, signatures unchecked':'signed',bundle,buildRevision,sourceFingerprint,dirty,runtimeFiles:Object.keys(runtimeFiles).length}));
}
