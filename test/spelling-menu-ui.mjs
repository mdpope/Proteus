import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-spelling-')));let app;
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();await app.evaluate(({BrowserWindow,app})=>{const w=BrowserWindow.getAllWindows()[0];w.show();w.focus();w.webContents.focus();app.focus({steal:true});});await page.locator('#tab-add-menu summary').waitFor();await page.locator('#tab-add-menu summary').click();await page.locator('[data-new-tab-action]').filter({hasText:'New chat'}).click();const prompt=page.locator('[data-chat-setup-prompt]');await prompt.evaluate(el=>{el.spellcheck=true;el.lang='en-US';});await prompt.click();await prompt.pressSequentially('speling ',{delay:80});await page.waitForTimeout(1500);
 assert.equal(await prompt.evaluate(el=>el.spellcheck),true);
 assert.equal(await prompt.evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),true,'Application menus must leave editable DOM events to the native spelling menu');
 await app.evaluate(({Menu,app})=>{globalThis.__spellingMenus=[];const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getWindows().current().window.webContents;wc.on('context-menu',(_e,p)=>{globalThis.__spellingParams={word:p.misspelledWord,suggestions:p.dictionarySuggestions,enabled:p.spellcheckEnabled,x:p.x,y:p.y};});const original=Menu.prototype.popup;globalThis.__restoreSpellingPopup=()=>{Menu.prototype.popup=original;};Menu.prototype.popup=function(){globalThis.__spellingMenus.push(this);};});
 const point=await prompt.evaluate(el=>{const s=getComputedStyle(el);return {x:parseFloat(s.paddingLeft)+20,y:parseFloat(s.paddingTop)+parseFloat(s.fontSize)};});await prompt.dblclick({position:point});await prompt.click({button:'right',position:point});
 await page.waitForTimeout(300);
 let menus=await app.evaluate(()=>globalThis.__spellingMenus.map(menu=>menu.items.map(item=>({label:item.label,role:item.role}))));
 console.log(JSON.stringify({params:await app.evaluate(()=>globalThis.__spellingParams),selection:await prompt.evaluate(el=>({start:el.selectionStart,end:el.selectionEnd})),menus,checker:await app.evaluate(({app})=>{const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getWindows().current().window.webContents;return {enabled:wc.session.spellCheckerEnabled,languages:wc.session.getSpellCheckerLanguages(),preferences:wc.getLastWebPreferences().spellcheck,appPath:app.getAppPath(),focused:wc.isFocused()};})}));assert.ok(menus.length>0,'Actual shell right-click reaches native menu');assert.ok(menus.at(-1).some(item=>item.role==='paste'));
 // OS dictionaries are independent of the app menu. Exercise real replacement
 // when the native service supplies a misspelled range; always retain that fact.
 const nativeSpelling=await app.evaluate(()=>globalThis.__spellingParams);
 if(nativeSpelling.word && nativeSpelling.suggestions.length){
   const replacement=nativeSpelling.suggestions[0];
   await app.evaluate(({app},replacement)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getWindows().current().window.webContents.replaceMisspelling(replacement),replacement);
   await page.waitForTimeout(100);assert.ok((await prompt.inputValue()).includes(replacement));
 }
 // Contenteditable descendants inherit editability even when the child has no attribute.
 const inherited=await page.evaluate(()=>{const el=document.createElement('div');el.contentEditable='true';el.innerHTML='<span>speling</span>';document.body.append(el);const child=el.firstElementChild,result=child.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));el.remove();return result;});assert.equal(inherited,true);
 const items=await app.evaluate(({app})=>{const {editContextItems}=process.mainModule.require(app.getAppPath()+'/desktop/services/edit-context-menu.cjs'),main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),wc=main.getWindows().current().window.webContents;return editContextItems(wc,{isEditable:true,misspelledWord:'speling',dictionarySuggestions:['spelling']}).map(item=>item.label||item.role||item.type);});assert.equal(items[0],'spelling');assert.ok(items.includes('Add to dictionary'));
 await page.screenshot({path:path.join(process.env.PROTEUS_UI_EVIDENCE||os.tmpdir(),'nov8-spelling-editor.png')});
 await app.evaluate(()=>globalThis.__restoreSpellingPopup());console.log(JSON.stringify({passed:true,nativeShellRightClick:true,nativeDictionaryReplacement:!!(nativeSpelling.word&&nativeSpelling.suggestions.length),spellingAndDictionaryTemplate:true,inheritedContentEditable:true}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
