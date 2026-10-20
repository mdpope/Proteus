const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PREVIEW_NAME = 'Proteus Design Preview';
const MARKER = '.proteus-design-preview.json';
const markerValue = { schemaVersion: 1, purpose: 'proteus-isolated-desktop-design-preview' };

function previewPaths(root) {
  return { root, home: path.join(root, 'app-data'), userData: path.join(root, 'electron'),
    codexHome: path.join(root, 'codex'), workRoot: path.join(root, 'workspaces'),
    sourceRoot: path.join(root, 'source-library') };
}

function initializePreviewRoot(root, { userHome = os.homedir(), sourceRoot = path.resolve(__dirname, '..') } = {}) {
  if (!path.isAbsolute(root)) throw new Error('The design preview needs an absolute, separate data location.');
  root = path.resolve(root);
  const marker = path.join(root, MARKER);
  let markerExists = false;
  const forbidden = [userHome, sourceRoot, path.join(userHome, '.codex'),
    path.join(userHome, 'Library/Application Support/Proteus')];
  if (forbidden.some(base => root === base || root.startsWith(base + path.sep))) {
    // A private sibling in Application Support is allowed; never a child of production data or this checkout.
    if (root !== path.join(userHome, 'Library/Application Support', PREVIEW_NAME) &&
        !root.startsWith(path.join(userHome, 'Library/Application Support', PREVIEW_NAME) + path.sep)) {
      throw new Error('Choose a separate preview directory outside production data, Codex data and the checkout.');
    }
  }
  if (fs.existsSync(root)) {
    if (fs.lstatSync(root).isSymbolicLink() || !fs.statSync(root).isDirectory()) throw new Error('Preview data must be a real directory, not a link.');
    // lstat also catches dangling links; never follow or rewrite an existing marker.
    try { const stat=fs.lstatSync(marker);markerExists=true;if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Preview marker must be a regular file, not a link.'); } catch(error) { if(error.code!=='ENOENT')throw error; }
    if (!markerExists && fs.readdirSync(root).length) throw new Error('This directory is not an initialized design preview. Existing files were left untouched.');
    if (markerExists) {
      const value = JSON.parse(fs.readFileSync(marker, 'utf8'));
      if (value.schemaVersion !== markerValue.schemaVersion || value.purpose !== markerValue.purpose) throw new Error('Unrecognized preview directory marker.');
    }
  }
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const actual = fs.realpathSync(root);
  for (const base of [sourceRoot, path.join(userHome, '.codex'), path.join(userHome, 'Library/Application Support/Proteus')]) {
    const resolved = fs.existsSync(base) ? fs.realpathSync(base) : path.resolve(base);
    if (actual === resolved || actual.startsWith(resolved + path.sep)) throw new Error('Preview directory resolves inside protected data.');
  }
  if(!markerExists)fs.writeFileSync(marker, JSON.stringify(markerValue) + '\n', { mode: 0o600,flag:'wx' });
  const locations = previewPaths(root);
  for (const directory of [locations.home, locations.userData, locations.codexHome, locations.workRoot, locations.sourceRoot]) {
    if (fs.existsSync(directory) && fs.lstatSync(directory).isSymbolicLink()) throw new Error('Preview directories cannot be symbolic links.');
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  return locations;
}

function configureDesktopPreview(app, { env = process.env, metadata = require('../package.json'), userHome = os.homedir() } = {}) {
  if (env.PROTEUS_DESKTOP_PREVIEW !== '1' && metadata.desktopPreview !== true) return null;
  const locations = initializePreviewRoot(env.PROTEUS_PREVIEW_HOME || path.join(userHome, 'Library/Application Support', PREVIEW_NAME), { userHome });
  app.setName(PREVIEW_NAME);
  app.setPath('userData', locations.userData);
  app.setPath('sessionData', locations.userData);
  // This synthetic-data preview never accesses the installed app's Safe Storage item.
  app.commandLine.appendSwitch('use-mock-keychain');
  return { ...locations, name: PREVIEW_NAME };
}

function stageCodexAuthentication(locations, { env = process.env, userHome = os.homedir() } = {}) {
  const source = path.join(env.CODEX_HOME || path.join(userHome, '.codex'), 'auth.json');
  const target = path.join(locations.codexHome, 'auth.json');
  if (fs.existsSync(target)) {
    if(fs.lstatSync(target).isSymbolicLink()||!fs.statSync(target).isFile())throw new Error('Preview authentication must be a private regular file.');
    return { available: true, reused: true };
  }
  if (!fs.existsSync(source)) return { available: false, reused: false };
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(target, 0o600);
  return { available: true, reused: false };
}

function preparePreviewFixtures(locations) {
  const write=(file,content)=>{try{fs.writeFileSync(file,content,{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST'||fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile())throw error;}};
  const workFolders=['Studio','Personal','Inbox'].map(name=>({name,path:path.join(locations.workRoot,name.toLowerCase())}));
  for(const folder of workFolders){
    fs.mkdirSync(path.join(folder.path,'docs'),{recursive:true,mode:0o700});
    write(path.join(folder.path,'README.md'),`# ${folder.name} — synthetic workspace\n\nDisposable design-preview files. Changes here do not affect production projects.\n`);
    write(path.join(folder.path,'docs/design-notes.md'),'# Design review\n\nExplore projects, chats, sources and approvals in this separate preview.\n');
  }
  const studio=workFolders[0].path;
  write(path.join(studio,'package.json'),JSON.stringify({name:'proteus-synthetic-studio',private:true,type:'module',scripts:{test:'node --test example.test.js'}},null,2)+'\n');
  write(path.join(studio,'example.js'),'export const greeting = name => `Hello, ${name}!`;\n');
  write(path.join(studio,'example.test.js'),"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {greeting} from './example.js';\ntest('sample greeting',()=>assert.equal(greeting('Studio'),'Hello, Studio!'));\n");
  write(path.join(locations.sourceRoot,'review.instructions.md'),'# Synthetic review guidance\n\nKeep design feedback concise. Separate observations from suggested changes. This source grants no tool access.\n');
  const skillRoot=path.join(locations.sourceRoot,'skills','design-review');
  const agentRoot=path.join(locations.sourceRoot,'.github','agents');
  fs.mkdirSync(skillRoot,{recursive:true,mode:0o700});fs.mkdirSync(agentRoot,{recursive:true,mode:0o700});
  write(path.join(skillRoot,'SKILL.md'),'---\nname: design-review\ndescription: Review the synthetic desktop design.\n---\n\nReview navigation consistency and readable permission scope. Ask before changing files.\n');
  write(path.join(agentRoot,'design-reviewer.agent.md'),'---\nname: Synthetic design reviewer\ndescription: Review the sample interface and explain observations.\n---\n\nUse the synthetic workspace for design experiments. Describe requested changes before applying them.\n');
  return workFolders;
}

module.exports = { PREVIEW_NAME, previewPaths, initializePreviewRoot, configureDesktopPreview, stageCodexAuthentication, preparePreviewFixtures };
