// Budget clipboard input before constructing a provider request. Keep the exact
// plain representation when creating an attachment, including line endings.
export function textAttachmentReason(text,{maxLines=200,maxBytes=256*1024}={}){
 const value=String(text);let lines=1;
 for(let i=0;i<value.length;i++){if(value[i]==='\r'){lines++;if(value[i+1]==='\n')i++;}else if(value[i]==='\n')lines++;if(lines>maxLines)return 'lines';}
 return new TextEncoder().encode(value).byteLength>maxBytes?'bytes':null;
}
const blocked='script,style,link,meta,base,noscript,template,iframe,frame,object,embed,applet,svg,math,form,input,button,select,textarea,[hidden],[aria-hidden="true"]';
const escape=value=>value.replace(/([\\`*_[\]<>])/g,'\\$1');
function safeLink(value){try{const url=new URL(value);return ['http:','https:','mailto:'].includes(url.protocol)&&!url.username&&!url.password?url.href.replace(/[()\\\s]/g,c=>encodeURIComponent(c).replace(/[()]/g,x=>'%'+x.charCodeAt(0).toString(16))):null;}catch{return null;}}
function fence(value,block){let length=block?3:1;for(const match of value.matchAll(/`+/g))length=Math.max(length,match[0].length+1);const mark='`'.repeat(length);return block?`${mark}\n${value}\n${mark}`:`${mark} ${value} ${mark}`;}
// Parse into an inert document. Never insert clipboard markup into the live page.
export function htmlToMarkdown(html,plainText=''){
 if(!html||typeof DOMParser==='undefined')return plainText;
 const doc=new DOMParser().parseFromString(html,'text/html');
 if(doc.querySelector('style,link,[class]'))return plainText;
 doc.querySelectorAll(blocked).forEach(node=>node.remove());
 for(const node of doc.querySelectorAll('[style]'))if(/(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\D|$))/i.test(node.getAttribute('style')))node.remove();
 const read=(node,pre=false)=>{
  if(node.nodeType===3)return pre?node.nodeValue:escape(node.nodeValue.replace(/\s+/g,' '));
  if(node.nodeType!==1)return '';
  const tag=node.tagName;if(tag==='BR')return '\n';
  if(tag==='PRE')return '\n\n'+fence(node.textContent,true)+'\n\n';
  if(tag==='CODE')return pre?node.textContent:fence(node.textContent,false);
  const content=[...node.childNodes].map(child=>read(child,pre)).join(''),trimmed=content.trim();
  if(!trimmed)return '';
  if(/^H[1-6]$/.test(tag))return `\n\n${'#'.repeat(Number(tag[1]))} ${trimmed}\n\n`;
  if(tag==='B'||tag==='STRONG')return '**'+trimmed+'**';if(tag==='I'||tag==='EM')return '*'+trimmed+'*';
  if(tag==='A'){const link=safeLink(node.getAttribute('href'));return link?`[${trimmed}](${link})`:trimmed;}
  if(tag==='LI'){const parent=node.parentElement,index=[...parent.children].filter(n=>n.tagName==='LI').indexOf(node),start=Number(parent.getAttribute('start'))||1;return '\n'+(parent.tagName==='OL'?`${start+index}.`:'-')+' '+trimmed.replace(/\n/g,'\n  ');}
  if(tag==='BLOCKQUOTE')return '\n\n'+trimmed.split('\n').map(line=>'> '+line).join('\n')+'\n\n';
  if(tag==='TABLE'){
   const rows=[...node.querySelectorAll('tr')].filter(row=>row.closest('table')===node).map(row=>[...row.children].filter(c=>['TH','TD'].includes(c.tagName)).map(c=>[...c.childNodes].map(n=>read(n)).join('').trim().replace(/\s*\n\s*/g,' ').replace(/\|/g,'\\|')));
   if(!rows.length||!rows[0].length)return '';const width=Math.max(...rows.map(r=>r.length)),line=row=>'| '+Array.from({length:width},(_,i)=>row[i]||'').join(' | ')+' |';return '\n\n'+[line(rows[0]),line(Array(width).fill('---')),...rows.slice(1).map(line)].join('\n')+'\n\n';
  }
  return ['P','DIV','SECTION','ARTICLE','UL','OL'].includes(tag)?'\n\n'+trimmed+'\n\n':content;
 };
 return [...doc.body.childNodes].map(n=>read(n)).join('').replace(/\n{3,}/g,'\n\n').trim()||plainText;
}
export function insertTextAtSelection(textarea,text){textarea.setRangeText(text,textarea.selectionStart,textarea.selectionEnd,'end');textarea.dispatchEvent(new Event('input',{bubbles:true}));}
