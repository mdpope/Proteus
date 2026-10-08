import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
export const appInstructions='Proteus is the chat client. To show a saved Markdown document as a tab inside this chat, call proteus_open_document with its absolute path (or the Proteus MCP tool with that name). Do not pass local files to proteus_browser; it opens websites only. Reuse existing browser tabs by listing them first. Only claim a document was opened after the tool succeeds. If the document tool is unavailable, provide a clickable Markdown file link and explain that the user can open it in the chat. App tools do not replace selected workspace instructions or authorize external actions.';
export function documentTools(browser,runId){return browser?.openDocument?[{name:'proteus_open_document',defer:'never',description:'Open an existing Markdown file as a document tab linked to this chat in Proteus. Pass an absolute path within the chat workspace. Reuses the same document tab; does not open another application or grant remote file access.',parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false},handler:async args=>JSON.stringify(await browser.openDocument(args,runId))}]:[];}
const within=(file,root)=>{const relative=path.relative(root,file);return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
export function openChatDocument(service,args,runId){
  const run=service.engine.getRun(runId);
  if(typeof args?.path!=='string'||!path.isAbsolute(args.path)||! /\.(md|markdown)$/i.test(args.path))throw new Error('Choose an absolute Markdown path in this chat workspace.');
  const file=fs.realpathSync(args.path),roots=[run.schedule.workspace.cwd,...run.schedule.workspace.additionalDirectories].map(root=>{try{return fs.realpathSync(root);}catch{return null;}}).filter(Boolean);
  if(!roots.some(root=>within(file,root)))throw new Error('Document is outside this chat workspace.');
  const root=service.workspaceFiles.roots().roots.find(root=>root.available&&within(file,fs.realpathSync(root.path)));
  if(!root)throw new Error('Document is outside a currently authorized workspace.');
  const document=service.workspaceFiles.read({rootId:root.id,file:path.relative(fs.realpathSync(root.path),file)});
  const documentId=createHash('sha256').update(runId+'\0'+file).digest('hex');
  service.contentTabs.rememberSources({tabs:[{id:runId,type:'run'},{type:'markdown',parentId:runId,file}]});
  const current=service.contentTabs.get('chat',runId),existing=current.tabs.find(t=>t.documentId===documentId);
  service.contentTabs.mutate({scope:'chat',id:runId,expectedRevision:current.revision,operations:[{action:'open',tab:existing||{id:'document:'+documentId,type:'document',documentId,title:path.basename(file)}}]});
  service.onDocumentOpened?.({runId,documentId,document});
  return {opened:true,documentId,title:existing?.title||path.basename(file),location:'chat document tab'};
}
// The Claude stdio adapter receives a per-turn, run-bound capability, never the app API token.
export async function documentBridge(browser,runId){
 const tool=documentTools(browser,runId)[0];if(!tool)return null;
 const token=randomBytes(32).toString('hex');
 const server=createServer(async(req,res)=>{
  const supplied=String(req.headers.authorization||'');
  if(req.method!=='POST'||req.url!=='/'||supplied.length!==token.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token))){res.writeHead(403);res.end();return;}
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw new Error('Document request is too large.');}const value=JSON.parse(body);if(value.action==='list'){res.end(JSON.stringify([{name:tool.name,description:tool.description,inputSchema:tool.parameters}]));return;}if(value.action!=='open')throw new Error('Unknown document action.');res.end(await tool.handler(value.arguments));}catch(error){res.writeHead(400);res.end(JSON.stringify({error:error.message}));}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {config:{command:process.execPath,args:[fileURLToPath(new URL('./document-mcp.cjs',import.meta.url))],env:{ELECTRON_RUN_AS_NODE:'1',PROTEUS_DOCUMENT_ENDPOINT:'http://127.0.0.1:'+server.address().port,PROTEUS_DOCUMENT_CAPABILITY:token}},close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
