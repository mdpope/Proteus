import {validatePalette} from '../../../public/shared/ui/palette.js';
import {resourceDefaults} from '../../../public/models/view-residency.js';
import { validateModelOptionShape } from '../../models/model-catalog.js';
import fs from 'node:fs';
import path from 'node:path';
import { atomicJSON, readJSON } from '../../shared/files.js';
import { revision } from '../scheduling/schedules.js';

export function validateSettings(value) {
  if (value?.schemaVersion !== 1) throw new Error('Settings schemaVersion must be 1.');
  validateModelOptionShape(value);
  if(value.updateCoordinator!==undefined){
    const options=value.updateCoordinator;
    if(!options||!['codex','claude','copilot'].includes(options.provider)||typeof options.model!=='string'||!options.model.trim()||options.model==='auto'||Object.keys(options).some(key=>!['provider','model','reasoningEffort','serviceTier','contextTier'].includes(key)))throw Error('Choose explicit update-coordinator provider and model defaults.');
    validateModelOptionShape(options);
  }
  if(value.internetSearches!==undefined){
    if(!value.internetSearches||typeof value.internetSearches!=='object'||Array.isArray(value.internetSearches))throw new Error('Internet Search defaults must be a provider map.');
    for(const [provider,options] of Object.entries(value.internetSearches)){
      if(!['copilot','codex','claude'].includes(provider)||!options||typeof options!=='object'||Array.isArray(options)||typeof options.model!=='string'||!options.model.trim()||options.model==='auto')throw new Error('Choose a provider and explicit Internet Search model.');
      if(Object.keys(options).some(key=>!['model','reasoningEffort','contextTier','serviceTier'].includes(key)))throw new Error('Internet Search defaults only contain model options.');
      validateModelOptionShape(options);
    }
  }
  if(value.preferences!==undefined&&(!value.preferences||typeof value.preferences!=='object'||Array.isArray(value.preferences)||value.preferences.clickedLinks!==undefined&&!['in-app','system'].includes(value.preferences.clickedLinks)))throw new Error('Choose in-app or system browser for clicked links.');
  if(value.preferences?.keepScreenAwake!==undefined&&typeof value.preferences.keepScreenAwake!=='boolean')throw new Error('Keep Screen Awake must be a boolean.');
  if(value.browser!==undefined&&(!value.browser||typeof value.browser!=='object'||Array.isArray(value.browser)))throw new Error('Browser preferences must be an object.');
  if(value.browser?.loadedTabLimit!==undefined&&(!Number.isInteger(value.browser.loadedTabLimit)||value.browser.loadedTabLimit<1||value.browser.loadedTabLimit>256))throw new Error('Loaded tab limit must be an integer from 1 to 256.');
  if(value.resources!==undefined){
    if(!value.resources||typeof value.resources!=='object'||Array.isArray(value.resources)||Object.keys(value.resources).some(key=>!Object.hasOwn(resourceDefaults,key)))throw Error('Choose valid resource preferences.');
    for(const key of Object.keys(resourceDefaults)){const limit=value.resources[key],max=key==='inactiveMinutes'?120:32;if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>max))throw Error(`${key} must be an integer from 1 to ${max}.`);}
  }
  if(value.appearance!==undefined&&(!value.appearance||typeof value.appearance!=='object'||Array.isArray(value.appearance)||(['showProviderUsage','providerUsageCollapsed','sidebarCollapsed'].some(key=>value.appearance[key]!==undefined&&typeof value.appearance[key]!=='boolean'))))throw new Error('Appearance settings must contain boolean usage preferences.');
  if(value.appearance?.palette!==undefined)validatePalette(value.appearance.palette);
  if(value.appearance?.sidebarWidth!==undefined&&(!Number.isInteger(value.appearance.sidebarWidth)||value.appearance.sidebarWidth<220||value.appearance.sidebarWidth>520))throw new Error('Sidebar width must be an integer between 220 and 520 pixels.');
  if (!['copilot','codex','claude','rehearsal'].includes(value.provider)) throw new Error('Choose a supported default provider.');
  if (value.provider !== 'rehearsal' && (!value.model?.trim() || value.model === 'auto')) throw new Error('Choose an explicit default model.');
  if (value.copilotDataDirectory && (!path.isAbsolute(value.copilotDataDirectory) || !fs.statSync(value.copilotDataDirectory).isDirectory())) throw new Error('Choose an existing Copilot data folder.');
  new Intl.DateTimeFormat('en', { timeZone: value.timezone }).format();
  for (const directory of [value.workspace?.cwd, ...(value.workspace?.additionalDirectories || []), ...(value.skillDirectories || [])]) {
    if (typeof directory !== 'string' || !path.isAbsolute(directory) || !fs.statSync(directory).isDirectory()) throw new Error(`Directory unavailable: ${directory}`);
  }
  if (!Array.isArray(value.workspace?.additionalDirectories) || !Array.isArray(value.skillDirectories)) throw new Error('Directory lists must be arrays.');
  if (!value.mcpServers || typeof value.mcpServers !== 'object' || Array.isArray(value.mcpServers)) throw new Error('MCP servers must be a JSON object.');
  return value;
}
export class SettingsStore {
  constructor(home, cwd) {
    this.file = path.join(home, 'settings.json');
    this.defaults = { schemaVersion: 1, workspace: { cwd, additionalDirectories: [] }, provider: 'copilot', model: 'gpt-6-sol', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, skillDirectories: [], mcpServers: {}, appearance: {showProviderUsage:true,providerUsageCollapsed:false} };
    if (!fs.existsSync(this.file)) atomicJSON(this.file, this.defaults);
  }
  get() { const value = readJSON(this.file, this.defaults); return { ...value, file: this.file, revision: revision(value) }; }
  save(value, expectedRevision) {
    if (expectedRevision !== this.get().revision) throw new Error('Settings changed outside the app. Reload before saving.');
    const clean = structuredClone(value); delete clean.file; delete clean.revision;
    validateSettings(clean); atomicJSON(this.file, clean); return this.get();
  }
}
