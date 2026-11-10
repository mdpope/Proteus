import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {editContextItems}=createRequire(import.meta.url)('../desktop/services/edit-context-menu.cjs');
test('native spelling edits only its originating live contents and retains edit commands',()=>{
 const calls=[];let destroyed=false;
 const contents={isDestroyed:()=>destroyed,replaceMisspelling:word=>calls.push(['replace',word]),session:{addWordToSpellCheckerDictionary:word=>calls.push(['dictionary',word])}};
 const items=editContextItems(contents,{isEditable:true,misspelledWord:'teh',dictionarySuggestions:['the','tea & coffee']});
 assert.equal(items[1].label,'tea && coffee');items[0].click();items.find(item=>item.label==='Add to dictionary').click();
 assert.deepEqual(calls,[['replace','the'],['dictionary','teh']]);
 assert.deepEqual(items.filter(item=>item.role).map(item=>item.role),['undo','redo','cut','copy','paste','selectAll']);
 destroyed=true;items[0].click();assert.equal(calls.length,2);
 assert.deepEqual(editContextItems(contents,{isEditable:false,misspelledWord:'teh'}),[]);
 assert.equal(editContextItems(contents,{isEditable:true,misspelledWord:'zzzz',dictionarySuggestions:[]})[0].enabled,false);
});
