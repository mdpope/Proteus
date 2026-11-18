let editor;
window.configureScratch=(value,source,colors)=>{
 for(const [key,color]of Object.entries(colors))document.documentElement.style.setProperty(key,color);
 if(!editor||value!==null&&editor.value()!==value){const text=value??editor?.value()??'';editor?.destroy();document.querySelector('#editor').replaceChildren();editor=ProteusScratchEditor.mount(document.querySelector('#editor'),{value:text,onChange:text=>window.webkit.messageHandlers.scratchEdit.postMessage(text),render:(target,text)=>ProteusMarkdown.mount(target,text,{allowExternalImages:false})});}
 editor.source(source);
};
// Formatting uses the editor selection and its undo history, never an append to
// a stale SwiftUI copy of the document.
window.insertScratch=(before,after)=>editor?.insert(before,after);
