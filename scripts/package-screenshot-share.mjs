import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync, spawnSync} from 'node:child_process';

const require = createRequire(import.meta.url);
const extensionName = 'ProteusScreenshotShare';
const helperName = 'ProteusShareContainer';
const sourceDirectory = 'native/macos/screenshot-share';
export const screenshotShareInputs = [
  'scripts/package-screenshot-share.mjs',
  ...['ShareContainer.swift', 'ResolveShareContainer.swift', 'ShareViewController.swift', 'ScreenshotItem.swift'].map(file => sourceDirectory + '/' + file),
];
export const isShareSubcode = file => file.includes('/'+extensionName+'.appex/') || file.endsWith('/'+extensionName+'.appex') || file.endsWith('/'+helperName);

const plist = content => '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
  + '<plist version="1.0"><dict>'+content+'</dict></plist>\n';
const value = (key, text) => '<key>'+key+'</key><string>'+text+'</string>';

export function prepareScreenshotShare({bundle, root, arch, identity, appBundleId, version, directory}) {
  if (!/^[a-z0-9.-]+$/i.test(appBundleId) || !/^\d+(\.\d+){1,2}$/.test(version)) throw Error('Invalid Share extension identity or version.');
  const extension = path.join(bundle, 'Contents', 'PlugIns', extensionName+'.appex');
  const helper = path.join(bundle, 'Contents', 'Helpers', helperName);
  const extensionExecutable = path.join(extension, 'Contents', 'MacOS', extensionName);
  fs.mkdirSync(path.dirname(helper), {recursive:true});
  fs.mkdirSync(path.dirname(extensionExecutable), {recursive:true});
  const compile = (output, files, flags) => execFileSync('xcrun', ['swiftc', '-O', '-parse-as-library',
    '-target', (arch==='x64'?'x86_64':arch)+'-apple-macos13.0', ...flags, '-o', output,
    ...['ShareContainer.swift', ...files].map(file=>path.join(root,sourceDirectory,file))], {stdio:'pipe'});
  compile(helper, ['ResolveShareContainer.swift'], []);
  compile(extensionExecutable, ['ShareViewController.swift', 'ScreenshotItem.swift'], ['-application-extension', '-Xlinker', '-e', '-Xlinker', '_NSExtensionMain']);

  const title = appBundleId.endsWith('.design-preview') ? 'Send to Proteus Preview' : 'Send to Proteus';
  fs.writeFileSync(path.join(extension, 'Contents', 'Info.plist'), plist(
    value('CFBundleDisplayName', title) + value('CFBundleName', title)
    + value('CFBundleIdentifier', appBundleId+'.screenshot-share') + value('CFBundleExecutable', extensionName)
    + value('CFBundlePackageType', 'XPC!') + value('CFBundleVersion', version) + value('CFBundleShortVersionString', version)
    + value('LSMinimumSystemVersion', '13.0')
    + '<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>'
    + '<key>NSExtension</key><dict>'
    + value('NSExtensionPointIdentifier', 'com.apple.share-services')
    + value('NSExtensionPrincipalClass', 'ProteusShareViewController')
    + '<key>NSExtensionAttributes</key><dict><key>NSExtensionActivationRule</key><dict>'
    + '<key>NSExtensionActivationSupportsImageWithMaxCount</key><integer>1</integer>'
    + '</dict></dict></dict>'));

  const sign = (file, entitlements) => execFileSync('codesign', ['--force', '--sign', identity, '--timestamp=none',
    ...(entitlements?['--entitlements',entitlements]:[]), file], {stdio:'pipe'});
  sign(helper);
  // codesign writes its display to stderr even on success.
  const signature = spawnSync('codesign', ['-dv','--verbose=4',helper], {encoding:'utf8'});
  const team = signature.status===0 && /^TeamIdentifier=([A-Z0-9]{10})$/m.exec(signature.stderr)?.[1];
  if (!team) throw Error('The Mac Share extension needs an existing Apple team signing identity.');
  const group = team+'.'+appBundleId+'.screenshot-share';
  const groupKey = '<key>com.apple.security.application-groups</key><array><string>'+group+'</string></array>';
  const helperEntitlements = path.join(directory, 'screenshot-share-helper.plist');
  const shareEntitlements = path.join(directory, 'screenshot-share-extension.plist');
  const appEntitlements = path.join(directory, 'screenshot-share-app.plist');
  fs.writeFileSync(helperEntitlements, plist(groupKey));
  fs.writeFileSync(shareEntitlements, plist(groupKey
    + '<key>com.apple.security.app-sandbox</key><true/><key>com.apple.security.network.client</key><true/>'));
  const defaultEntitlements = path.resolve(path.dirname(require.resolve('@electron/osx-sign')), '../entitlements/default.darwin.plist');
  fs.writeFileSync(appEntitlements, fs.readFileSync(defaultEntitlements, 'utf8').replace('</dict>', groupKey+'</dict>'));
  sign(helper, helperEntitlements);
  sign(extension, shareEntitlements);
  for (const signed of [helper, extension]) execFileSync('codesign', ['--verify','--strict',signed], {stdio:'pipe'});
  return {appEntitlements, group};
}
