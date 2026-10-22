import test from 'node:test';
import assert from 'node:assert/strict';
import {webPaletteConfig} from '../web/resources/js/palette-config.js';
test('web installation restores its JSON palette config and isolates other browsers and accounts',()=>{
 const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};};
 const first=memory(),other=memory(),config=webPaletteConfig('account',first),initial=config.read();
 const palette={...initial.palette,name:'My installed colors',colors:{...initial.palette.colors,background:'#345678'},brightness:4};
 const saved=config.save(palette,initial.revision);assert.deepEqual(webPaletteConfig('account',first).read().palette,palette);
 assert.equal(JSON.parse(first.getItem(config.key)).version,1);assert.notEqual(saved.revision,initial.revision);
 assert.notDeepEqual(webPaletteConfig('account',other).read().palette,palette);assert.notDeepEqual(webPaletteConfig('other-account',first).read().palette,palette);
 assert.throws(()=>config.save(initial.palette,initial.revision),/another tab/);assert.deepEqual(config.read().palette,palette);
 first.setItem(config.key,'corrupt');assert.equal(config.read().revision,'initial');
 assert.throws(()=>config.save({...palette,colors:{background:'invalid'}},'initial'),/colors/);
});
