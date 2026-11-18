// Browser-only fixture: all requests are fulfilled locally, including HA frames.
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());let body,type='text/javascript';
  if(url.pathname==='/life/home') {type='text/html';body='<nav aria-label="Smart Home tabs"><button data-home-tab="smart">Smart Home</button><button data-home-tab="assistant">Home Assistant</button></nav><section id="life-home"></section><section id="life-home-dashboard" hidden></section><script type="module" src="/resources/js/life-home.js"></script>';}
  else if(url.pathname==='/resources/js/life-home.js')body=fs.readFileSync(new URL('../web/resources/js/life-home.js',import.meta.url),'utf8');
  else if(url.pathname==='/public/features/tools/life-home.js')body=fs.readFileSync(new URL('../public/features/tools/life-home.js',import.meta.url),'utf8');
  else if(url.pathname==='/resources/js/shared-app.js')body='export const defaultMacStatus=()=>({status:"online"}); export const appRequest=async()=>({accountId:"fixture"});export const defaultMacRequest=async()=>({accountId:"fixture",configured:true,origin:"http://automation.example.test.test:8123",entities:[],services:[]});';
  else return route.abort();
  await route.fulfill({contentType:type,body});
 });
 await page.goto('https://proteus.test/life/home');await page.getByRole('button',{name:'Refresh devices'}).waitFor();
 await page.getByRole('button',{name:'Home Assistant',exact:true}).click();
 const dashboard=page.locator('#life-home-dashboard');await dashboard.getByRole('link').waitFor();
 assert.equal(await dashboard.locator('iframe').count(),0,'HTTPS page never tries to embed the HTTP LAN dashboard');
 assert.equal(await dashboard.getByRole('link').getAttribute('href'),'http://automation.example.test.test:8123/');
 assert.match(await dashboard.innerText(),/cannot embed/);
 await page.getByRole('button',{name:'Smart Home',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Refresh devices'}).isVisible(),true);
 await page.getByRole('button',{name:'Home Assistant',exact:true}).click();assert.equal(await dashboard.getByRole('link').count(),1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,summary:'Persistent web Home tabs retain controls and honor HTTPS/HTTP embedding restrictions'}));
} finally {await browser.close();}
