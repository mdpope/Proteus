// Real PTY and clipboard; all data belongs to a disposable preview.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app,page;const errors=[];
const until=async check=>{for(let i=0;i<200;i++){const result=await check();if(result)return result;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Terminal sharing condition timed out.');};
try{
 const helper=path.join(fixture.studio.cwd,'terminal-input.py');fs.writeFileSync(helper,'import os,sys,tty\ntty.setraw(0)\nos.write(1,b"\\x1b[?2004hPASTE_READY\\r\\n")\nwhile True:\n data=os.read(0,65536)\n os.write(1,("INPUT_HEX:"+data.hex()+"\\r\\n").encode())\n');
 app=await electron.launch({args:['.','--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.locator('[data-preview-workspace="'+fixture.studio.id+'"]').waitFor();
 await page.evaluate(async({helper,cwd})=>{const state=await window.desktop.terminal({action:'state'}),profiles=state.profiles.profiles;profiles[0]={...profiles[0],shell:'/bin/sh',workingDirectory:cwd,command:"exec /usr/bin/python3 -u '"+helper+"'"};await window.desktop.terminal({action:'save-profiles',profiles,expectedRevision:state.profiles.revision});const terminal=await import('/features/tools/terminals.js');await terminal.openTerminalDialog();},{helper,cwd:fixture.studio.cwd});
 await page.locator('#terminal-session').selectOption('process');await page.locator('#dialog-submit').click();await page.locator('.terminal-canvas canvas').waitFor();
 const session=await until(async()=>(await page.evaluate(()=>window.desktop.terminal({action:'state'}))).sessions.find(item=>item.status==='running'));
 const snapshot=()=>page.evaluate(id=>window.desktop.terminal({action:'snapshot',id}),session.id);
 await until(async()=>(await snapshot()).data.includes('PASTE_READY'));
 const agent=args=>app.evaluate(({app},args)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().terminalAgent(args,'operator'),args);
 assert.equal((await agent({action:'list'})).terminals.find(item=>item.id===session.id).shared,false);
 await assert.rejects(agent({action:'snapshot',terminalId:session.id}),/not shared/);
 await page.getByRole('button',{name:'Share terminal with agents',exact:true}).click();assert.equal(await page.locator('[data-terminal-share]').getAttribute('aria-pressed'),'true');
 const observed=await agent({action:'snapshot',terminalId:session.id});assert.match(observed.output,/PASTE_READY/);
 const input={action:'write',terminalId:session.id,data:'AGENT_INPUT\r',observationId:observed.observationId,operationId:randomUUID()};await agent(input);await agent(input);
 await until(async()=>(await snapshot()).data.includes('INPUT_HEX:'+Buffer.from(input.data).toString('hex')));
 assert.equal((await snapshot()).data.split(Buffer.from(input.data).toString('hex')).length-1,1);
 // Exercise the actual message-copy control before a native Cmd+V paste.
 const copied='printf first\r\nprintf second\n';
 await page.evaluate(async text=>{const {mountMessageActions}=await import('/features/chats/message-actions.js'),box=document.createElement('div');box.id='synthetic-chat-copy';document.querySelector('#main').append(box);mountMessageActions(box,{key:'synthetic-message',text,copy:value=>window.desktop.copyText(value)});},copied);
 await page.locator('#synthetic-chat-copy [data-message-action="copy"]').click();
 await page.locator('.terminal-canvas textarea').focus();await page.keyboard.press('Meta+V');
 const pasted='\x1b[200~printf first\rprintf second\r\x1b[201~',hex=Buffer.from(pasted).toString('hex');
 await until(async()=>(await snapshot()).data.includes('INPUT_HEX:'+hex));
 // The outer focus target formerly bypassed bracketed paste. It must behave identically.
 await page.locator('.terminal-canvas').evaluate((node,text)=>{const data=new DataTransfer();data.setData('text/plain',text);node.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},copied);
 await until(async()=>(await snapshot()).data.split(hex).length-1===2);
 await page.getByRole('button',{name:'Stop sharing terminal with agents',exact:true}).click();await assert.rejects(agent({action:'snapshot',terminalId:session.id}),/not shared/);await assert.rejects(agent({...input,operationId:randomUUID()}),/not shared/);
 assert.equal((await snapshot()).session.status,'running');await page.screenshot({path:process.cwd()+'/.runtime-tests/terminal-sharing-ui.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,realPTY:true,chatCopyNativePaste:true,bracketedPasteBothFocusTargets:true,normalizedNewlines:true,agentReadAndWrite:true,idempotentInput:true,humanRevocation:true}));
}catch(error){await page?.screenshot({path:process.cwd()+'/.runtime-tests/terminal-sharing-failure.png'}).catch(()=>{});throw error;}finally{await app?.close();await fixture.cleanup();}
