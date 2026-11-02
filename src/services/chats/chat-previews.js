import {createHash} from 'node:crypto';
import os from 'node:os';
import {build} from 'esbuild';

const sha=value=>createHash('sha256').update(value).digest('hex');
const MAX_FILE=1024*1024,MAX_TOTAL=4*1024*1024,MAX_ASSETS=64;
const unsafe=/(?:^|\/)(?:api|oauth|authorize|login|signin|logout|\.git|\.env)(?:[/.]|$)/i;
export function localPreviewURL(value,{excludedOrigins=[]}={}){
 try{const url=new URL(value);const local=new Set(['localhost','127.0.0.1','[::1]',...Object.values(os.networkInterfaces()).flat().filter(Boolean).map(item=>item.address)]);
  if(!['http:','https:'].includes(url.protocol)||!local.has(url.hostname)||url.username||url.password||unsafe.test(decodeURIComponent(url.pathname))||excludedOrigins.includes(url.origin))return null;
  if([...url.searchParams.keys()].some(key=>/token|password|secret|session|auth|code/i.test(key)))return null;
  url.hash='';return url.href;
 }catch{return null;}
}
export async function bundlePreview(source,{excludedOrigins=[]}={}){
 const selected=localPreviewURL(source,{excludedOrigins});if(!selected)throw Error('Choose a chat-linked local design preview.');
 const origin=new URL(selected).origin,cache=new Map();let total=0;
 async function read(value){
  const url=new URL(value,selected);url.hash='';
  if(url.origin!==origin||url.username||url.password||unsafe.test(decodeURIComponent(url.pathname)))throw Error('Preview dependencies must stay on the selected design origin.');
  if(cache.has(url.href))return cache.get(url.href);
  if(cache.size>=MAX_ASSETS)throw Error('Preview exceeds 64 dependencies.');
  const pending=(async()=>{const response=await fetch(url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Design dependency returned '+response.status);
   const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;total+=chunk.length;if(size>MAX_FILE||total>MAX_TOTAL)throw Error('Preview exceeds its asset or transfer limit.');chunks.push(chunk);}
   return {bytes:Buffer.concat(chunks),type:response.headers.get('content-type')?.split(';')[0]||'application/octet-stream'};})();cache.set(url.href,pending);return pending;
 }
 const plugin={name:'selected-design-origin',setup(builder){
  builder.onResolve({filter:/.*/},args=>{if(args.path.startsWith('data:'))return {path:args.path,external:true};if(!args.path.startsWith('.')&&!args.path.startsWith('/')&&!/^https?:/.test(args.path))throw Error('Unresolved bare import in static design: '+args.path);return {path:new URL(args.path,args.importer||selected).href,namespace:'design'};});
  builder.onLoad({filter:/.*/,namespace:'design'},async args=>{const item=await read(args.path),name=new URL(args.path).pathname;const loader=/\.css$/i.test(name)||item.type==='text/css'?'css':/\.tsx?$/.test(name)?name.endsWith('tsx')?'tsx':'ts':/\.jsx$/.test(name)?'jsx':/\.(?:m?js)$/i.test(name)||/javascript/.test(item.type)?'js':/\.json$/i.test(name)?'json':'dataurl';return {contents:item.bytes,loader};});
 }};
 async function compiled(url,kind,inline){const output=await build({...(inline===undefined?{entryPoints:[url]}:{stdin:{contents:inline,loader:kind==='css'?'css':'js',sourcefile:url}}),bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',plugins:[plugin],outdir:'preview',logLevel:'silent'});return output.outputFiles.filter(file=>file.path.endsWith(kind==='css'?'.css':'.js')).map(file=>file.text).join('\n');}
 const first=await read(selected);if(!/text\/html|application\/xhtml\+xml/.test(first.type))throw Error('The selected design did not return HTML.');
 let html=first.bytes.toString('utf8');
 const patches=[];const attribute=(tag,name)=>tag.match(new RegExp('\\b'+name+'\\s*=\\s*(["\\\'])(.*?)\\1','is'))?.[2];
 for(const match of html.matchAll(/<link\b[^>]*>|<script\b[^>]*>[\s\S]*?<\/script\s*>|<(?:img|source)\b[^>]*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/gi)){
  const tag=match[0];let replacement=tag;
  if(/^<link/i.test(tag)&&/stylesheet/i.test(attribute(tag,'rel')||'')){const href=attribute(tag,'href');if(href)replacement='<style>'+await compiled(new URL(href,selected).href,'css')+'</style>';}
  else if(/^<link/i.test(tag)){replacement='';}
  else if(/^<script/i.test(tag)){const src=attribute(tag,'src');if(src||attribute(tag,'type')==='module'){const url=src?new URL(src,selected).href:selected;const code=attribute(tag,'type')==='module'?await compiled(url,'js',src?undefined:tag.replace(/^<script\b[^>]*>|<\/script\s*>$/gi,'')):(await read(url)).bytes.toString('utf8');replacement='<script>'+code.replace(/<\/script/gi,'<\\/script')+'</script>';}}
  else if(/^<style/i.test(tag)){replacement='<style>'+await compiled(selected,'css',tag.replace(/^<style\b[^>]*>|<\/style\s*>$/gi,''))+'</style>';}
  else if(/^<(?:img|source)/i.test(tag)){for(const name of ['src','srcset']){const value=attribute(tag,name);if(!value||value.startsWith('data:'))continue;const entries=name==='srcset'?value.split(',').map(part=>part.trim().split(/\s+/)): [[value]];const bundled=[];for(const [url,...descriptor] of entries){const item=await read(new URL(url,selected));if(!/^image\//.test(item.type))throw Error('Preview image returned an unsupported type.');bundled.push('data:'+item.type+';base64,'+item.bytes.toString('base64')+(descriptor.length?' '+descriptor.join(' '):''));}replacement=replacement.replace(value,bundled.join(', '));}}
  patches.push({start:match.index,end:match.index+tag.length,value:replacement});
 }
 for(const patch of patches.reverse())html=html.slice(0,patch.start)+patch.value+html.slice(patch.end);
 // Native/web isolated viewers supply the CSP and retain their per-version script consent.
 html=html.replace(/<base\b[^>]*>/gi,'');
 if(Buffer.byteLength(html)>MAX_TOTAL)throw Error('Bundled preview exceeds 4 MiB.');
 return {content:html,version:sha(html),size:Buffer.byteLength(html),mediaType:'text/html',title:html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.slice(0,120)||new URL(selected).pathname.split('/').pop()||'Design preview',assetCount:cache.size,staticSnapshot:true};
}
export class ChatPreviews {
 constructor(service){this.service=service;this.cache=new Map();this.pending=new Map();}
 remember(key,value){this.cache.delete(key);this.cache.set(key,value);let bytes=[...this.cache.values()].reduce((sum,item)=>sum+(item.size||0),0);while(this.cache.size>64||bytes>64*1024*1024){const first=this.cache.keys().next().value;if(first===key)break;bytes-=this.cache.get(first)?.size||0;this.cache.delete(first);}return value;}
 sources(run){const member=this.service.workspaceProjects?.membership(run),canonical=member?.projectId?this.service.contentTabs.get('project',member.projectId).tabs:member?.workspaceId?this.service.contentTabs.get('workspace',member.workspaceId).tabs:[];const tabs=[...canonical.filter(tab=>tab.associationChatId===run.id),...this.service.contentTabs.get('chat',run.id).tabs].filter(tab=>tab.type==='browser');const protectedSources=new Set(tabs.filter(tab=>this.service.previewAllowed&&!this.service.previewAllowed(tab)).map(tab=>tab.url));const values=tabs.filter(tab=>!protectedSources.has(tab.url)).map(tab=>({source:tab.url,tabId:tab.id}));
  for(const event of run.events||[])if(event.role==='assistant')for(const match of String(event.text||'').matchAll(/https?:\/\/[^\s<>"'`)\]]+/g))values.push({source:match[0]});
  const excludedOrigins=[this.service.origin];const seen=new Set();return values.flatMap(item=>{const source=localPreviewURL(item.source,{excludedOrigins});if(!source||protectedSources.has(source)||seen.has(source))return [];seen.add(source);return [{...item,source,documentId:sha(run.id+'\0'+source)}];}).slice(0,8);
 }
 async list(run){const result=[];for(const item of this.sources(run)){const key=run.id+':'+item.documentId;let prior=this.cache.get(key);if(!prior||Date.now()-prior.checkedAt>2000){if(!this.pending.has(key))this.pending.set(key,(async()=>{try{const bundle=await bundlePreview(item.source,{excludedOrigins:[new URL(this.service.url).origin]});const value={...item,...bundle,checkedAt:Date.now(),readAt:new Date().toISOString(),stale:false};this.remember(key,value);return value;}catch(error){const value={...prior,...item,checkedAt:Date.now(),stale:true,error:error.message};this.remember(key,value);return value;}finally{this.pending.delete(key);}})());prior=await this.pending.get(key);}result.push({...prior,...item,content:undefined});}return {previews:result};}
 async read(run,documentId){if(!this.sources(run).some(item=>item.documentId===documentId))throw Error('This preview is no longer linked to this chat.');await this.list(run);const value=this.cache.get(run.id+':'+documentId);if(!value?.content)throw Error(value?.error||'Design preview is unavailable.');return {...value,assets:[],links:[]};}
}
