/** Both terminal focus targets must use bracketed paste and the same newline rules. */
export function pasteTerminalText(term,text){
 if(typeof text!=='string'||!text)return;
 term.paste(text.replace(/\r\n|\n/g,'\r'));
}
export function installTerminalPaste(element,term){
 const paste=event=>{const text=event.clipboardData?.getData('text/plain');if(typeof text!=='string')return;event.preventDefault();event.stopImmediatePropagation();pasteTerminalText(term,text);};
 element.addEventListener('paste',paste,true);
 return {dispose:()=>element.removeEventListener('paste',paste,true)};
}
