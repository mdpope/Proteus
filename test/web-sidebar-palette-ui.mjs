// Render the real desktop and web styles independently: palette parity must hold
// for defaults and edits, rather than matching a second list of sampled colors.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {defaultPalette} from '../public/shared/ui/palette.js';

const root=path.resolve(import.meta.dirname,'..');
const desktop=`<body class="desktop-preview"><aside id="sidebar"><a class="navitem active">Chats <span class="count">2</span></a><section class="preview-workspace-tree">Workspace</section><section class="preview-workspace-tree active">Active workspace</section></aside>`;
const web=`<body class="web-desktop-shell" data-browser-account="synthetic"><div class="shell"><aside class="sidebar"><nav class="shell-navigation"><a class="active" data-shell-nav="chats">Chats <span class="count">2</span></a><section class="web-workspace-group">Workspace</section><section class="web-workspace-group active">Active workspace</section></nav></aside></div>`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<iframe name="desktop" src="/desktop.html"></iframe><iframe name="web" src="/web.html"></iframe><style>iframe{width:46vw;height:80vh;border:0}</style>');}
 if(url.pathname==='/desktop.html'||url.pathname==='/web.html'){
  const isDesktop=url.pathname==='/desktop.html';res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta charset="utf-8">'+(isDesktop?'<link rel="stylesheet" href="/public/style.css"><link rel="stylesheet" href="/public/desktop-preview.css"><link rel="stylesheet" href="/public/palette.css">':'<link rel="stylesheet" href="/web/resources/css/app.css">')+(isDesktop?desktop:web));
 }
 const allowed=url.pathname.startsWith('/public/')||url.pathname.startsWith('/web/resources/css/');
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!allowed||!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');
 if(url.pathname==='/web/resources/css/desktop-parity.css'&&process.env.PROTEUS_NAV_CSS_BASELINE)return res.end(fs.readFileSync(process.env.PROTEUS_NAV_CSS_BASELINE));
 res.end(fs.readFileSync(file));
});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1100,height:800}});await page.goto('http://127.0.0.1:'+server.address().port);
 const frames=['desktop','web'].map(name=>page.frame({name}));
 for(const frame of frames)await frame.locator('aside').waitFor();
 const colors=frame=>frame.evaluate(()=>{
  const desktop=document.body.classList.contains('desktop-preview'),sidebar=document.querySelector('aside'),nav=sidebar.querySelector('a'),count=sidebar.querySelector('.count'),group=sidebar.querySelector(desktop?'.preview-workspace-tree':'.web-workspace-group'),active=sidebar.querySelector(desktop?'.preview-workspace-tree.active':'.web-workspace-group.active');
  const style=node=>getComputedStyle(node);return {canvas:style(document.body).backgroundColor,bodyText:style(document.body).color,sidebar:style(sidebar).backgroundColor,text:style(sidebar).color,nav:style(nav).backgroundColor,navText:style(nav).color,navBorder:style(nav).borderTopColor,count:style(count).color,group:style(group).backgroundColor,groupBorder:style(group).borderTopColor,activeGroup:style(active).backgroundColor,activeBorder:style(active).borderTopColor};
 });
 const initial=defaultPalette(),custom={...initial,brightness:5,saturation:-4,colors:{...initial.colors,background:'#213547',text:'#e9f4ff',accent:'#c6d8f0',sidebar:'#263b4a',sidebarGroup:'#31495b',sidebarButton:'#3c5063',sidebarSelected:'#506d75',sidebarText:'#d1dedb',sidebarStrong:'#ffffff',sidebarMuted:'#98b4c1',sidebarBorder:'#65838b'}};
 for(const [name,palette]of [['defaults',initial],['edited palette',custom],['reset defaults',initial]]){
  for(const frame of frames)await frame.evaluate(async palette=>(await import('/public/shared/ui/palette.js')).applyPalette(palette),palette);
  const [desktopColors,webColors]=await Promise.all(frames.map(colors));assert.deepEqual(webColors,desktopColors,name+' uses the same rendered sidebar palette');
 }
 await page.screenshot({path:process.env.PROTEUS_SIDEBAR_SCREENSHOT||'/private/tmp/proteus-web-sidebar-palette.png'});console.log('PASS desktop/web sidebar colors: defaults, edited palette and reset');
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
