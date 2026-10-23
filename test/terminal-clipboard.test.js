import test from 'node:test';
import assert from 'node:assert/strict';
import {installTerminalPaste,pasteTerminalText} from '../public/features/tools/terminal-clipboard.js';
test('terminal clipboard routes both focus targets through one bracket-aware paste with normalized newlines',()=>{
 const calls=[],term={paste:text=>calls.push(text)},element=new EventTarget(),listener=installTerminalPaste(element,term);
 for(const target of ['textarea','canvas']){const event=new Event('paste',{cancelable:true});let stopped=false;event.clipboardData={getData:type=>{assert.equal(type,'text/plain');return 'printf first\r\nprintf second\n';}};event.targetName=target;event.stopImmediatePropagation=()=>stopped=true;element.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(stopped,true);}
 assert.deepEqual(calls,['printf first\rprintf second\r','printf first\rprintf second\r']);
 pasteTerminalText(term,'single line');assert.equal(calls.at(-1),'single line');listener.dispose();element.dispatchEvent(new Event('paste'));assert.equal(calls.length,3);
});
