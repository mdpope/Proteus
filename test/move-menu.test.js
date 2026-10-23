import test from 'node:test';import assert from 'node:assert/strict';
import {moveMenuMarkup,projectMoveGroups} from '../public/shared/navigation/move-menu.js';
test('shared destination menu groups unopened projects under their workspace and selects the current location',()=>{
 const groups=projectMoveGroups([{id:'a',name:'First'},{id:'b',name:'Second'}],[{id:'p',workspaceId:'a',name:'Current project'},{id:'q',workspaceId:'a',name:'Nearby project'},{id:'r',workspaceId:'b',name:'Other project'}]);
 const markup=moveMenuMarkup({groups,current:'p',escape:String,application:false});assert.match(markup,/<optgroup label="First">/);assert.match(markup,/<option value="p" selected/);assert.ok(markup.indexOf('Nearby project')<markup.indexOf('Second'));assert.ok(markup.includes('Other project'));assert.equal(markup.includes('Team Tools'),false);
 const legacy=projectMoveGroups([{id:'a',name:'First'}],[],{workspaceOnly:true});assert.equal(legacy[0].tabs[0].id,'a');
});
