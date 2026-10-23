import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {defaultPalette,resolvedPalette,validatePalette} from '../public/shared/ui/palette.js';
import {SettingsStore} from '../src/services/settings/settings.js';
import {createRequire} from 'node:module';
const {DownloadSpeed}=createRequire(import.meta.url)('../desktop/browser/download-speed.cjs');
test('palette saves atomically with settings revision and preserves other preferences',t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-palette-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const settings=new SettingsStore(home,home),before=settings.get(),palette=defaultPalette();palette.colors.background='#234567';palette.name='My green';palette.future={retained:true};const saved=settings.save({...before,future:{keep:true},appearance:{...before.appearance,palette}},before.revision);
 assert.deepEqual(new SettingsStore(home,home).get().appearance.palette,palette);assert.deepEqual(saved.future,{keep:true});assert.throws(()=>settings.save(before,before.revision),/changed/);
 for(const invalid of [{...palette,brightness:Infinity},{...palette,colors:{background:'url(secret)'}},{...palette,version:2}])assert.throws(()=>validatePalette(invalid),/palette|colors|sliders/i);
});
test('surface sliders preserve chosen highlight and text colors',()=>{
 const value=defaultPalette(),original=resolvedPalette(value);value.brightness=12;value.saturation=-20;const adjusted=resolvedPalette(value);assert.notEqual(adjusted.background,original.background);assert.equal(adjusted.accent,original.accent);assert.equal(adjusted.text,original.text);assert.equal(adjusted.assistantEdge,original.assistantEdge);
});
test('download speed measures recent bytes, drops stalls and resets on resume or restart',()=>{
 let now=0;const speed=new DownloadSpeed(()=>now);speed.reset();now=1000;speed.update(200000);assert.equal(speed.value(),200000);now=1500;speed.update(300000);assert.equal(speed.value(),200000);now=4001;assert.equal(speed.value(),0);speed.reset(300000);now=5001;speed.update(350000);assert.equal(speed.value(),50000);now=6001;speed.update(1000);assert.equal(speed.value(),0);
});
