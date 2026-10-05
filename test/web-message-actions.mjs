// Browser-only fakes keep synthetic conversation text out of OS clipboard/audio services.
import assert from 'node:assert/strict';
async function selectHost(page,id){await page.locator('#remote-host').evaluate((select,id)=>{select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));},id);}

export async function installMessageActionFakes(page) {
  await page.addInitScript(() => {
    const state = window.messageActionTest = {copied:[], spoken:[], cancellations:0, pauses:0, resumes:0, rejectCopy:false};
    class Utterance extends EventTarget { constructor(text) { super(); this.text=text; } }
    class Synthesis extends EventTarget {
      voices=[{name:'Synthetic local voice',voiceURI:'synthetic-local',lang:'en-US',localService:true,default:true}];
      speaking=false; paused=false; pending=false;
      getVoices(){return this.voices;}
      speak(utterance){state.active=utterance;state.spoken.push({text:utterance.text,local:utterance.voice?.localService});this.speaking=true;this.paused=false;queueMicrotask(()=>state.signal('start'));}
      cancel(){state.cancellations++;sessionStorage.setItem('synthetic-speech-cancellations',String(state.cancellations));state.active=null;this.speaking=false;}
      pause(){state.pauses++;this.paused=true;}
      resume(){state.resumes++;this.paused=false;}
    }
    const synth=new Synthesis();
    state.signal=(type,properties={})=>{const utterance=state.active;if(!utterance)return;const event=Object.assign(new Event(type),properties);if(type==='end'||type==='error'){state.active=null;synth.speaking=false;synth.paused=false;}utterance['on'+type]?.(event);utterance.dispatchEvent(event);};
    state.setLocalVoices=enabled=>{synth.voices=[{name:enabled?'Synthetic local voice':'Synthetic remote voice',voiceURI:enabled?'synthetic-local':'synthetic-remote',lang:'en-US',localService:enabled,default:true}];synth.onvoiceschanged?.(new Event('voiceschanged'));synth.dispatchEvent(new Event('voiceschanged'));};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(state.rejectCopy)throw new Error('Synthetic clipboard denial');state.copied.push(text);}}});
  });
}

export async function exerciseMessageActions(page, app, run) {
  const markdown='## Local summary\n\nThe **completed** reply stays private. Read every word locally.\n\n```js\nconst ready = true;\n```';
  app.engine.event(run,'assistant',markdown);
  app.engine.event(run,'assistant','Another **completed** reply.');
  app.engine.event(run,'assistant','   ');
  app.engine.event(run,'assistant','Synthetic reasoning detail',{reasoning:true});
  run.events.push({role:'assistant',text:'Synthetic streaming event',streaming:true,at:new Date().toISOString()});
  run.events.push({role:'assistant',type:'thinking',text:'Synthetic thinking detail',at:new Date().toISOString()});
  app.engine.event(run,'tool','Synthetic tool output');
  app.engine.stream(run,'synthetic-live','Synthetic streaming text');
  const first=page.locator('.remote-message.assistant').filter({has:page.getByRole('heading',{name:'Local summary',exact:true})});
  await first.locator('[data-message-action=copy]').waitFor();
  assert.equal(await page.locator('.remote-message.tool .message-actions').count(),0);
  assert.equal(await page.locator('.remote-message').filter({hasText:'Synthetic streaming text'}).locator('.message-actions').count(),0);
  for(const text of ['Synthetic reasoning detail','Synthetic streaming event','Synthetic thinking detail']) assert.equal(await page.locator('.remote-message').filter({hasText:text}).locator('.message-actions').count(),0);
  assert.equal(await page.locator('.remote-message.assistant .message-actions').count(),3);
  await first.locator('[data-message-action=copy]').click();
  assert.equal(await page.evaluate(()=>messageActionTest.copied.at(-1)),markdown);
  await page.evaluate(()=>messageActionTest.rejectCopy=true);await first.locator('[data-message-action=copy]').click();await page.getByText('Copy failed. Try again.',{exact:true}).first().waitFor();await page.evaluate(()=>messageActionTest.rejectCopy=false);
  await first.locator('[data-message-action=copy]').click();
  await first.locator('[data-message-action=speak]').click();
  await page.waitForFunction(()=>messageActionTest.spoken.length>0);
  const spoken=await page.evaluate(()=>messageActionTest.spoken.at(-1));
  assert.equal(spoken.local,true);assert.match(spoken.text,/Local summary/);assert.match(spoken.text,/completed reply/);assert.doesNotMatch(spoken.text,/\*\*|```|Copy code/);
  await first.locator('.message-playback').scrollIntoViewIfNeeded();
  await page.evaluate(()=>document.activeElement?.blur());
  await page.screenshot({path:'/private/tmp/proteus-web-message-actions-desktop.png',fullPage:true});
  const viewport=page.viewportSize();await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await first.locator('.message-playback').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/private/tmp/proteus-web-message-actions-mobile.png',fullPage:true});
  await first.locator('.message-actions').screenshot({path:'/private/tmp/proteus-web-message-playback-mobile.png'});
  await page.setViewportSize(viewport);
  const cancellations=await page.evaluate(()=>messageActionTest.cancellations);
  await first.evaluate(element=>element.dataset.beforeRefresh='yes');app.engine.persist(run);
  await page.waitForFunction(()=>!document.querySelector('.remote-message[data-before-refresh]'));
  assert.equal(await page.evaluate(()=>messageActionTest.cancellations),cancellations);
  assert.equal(await first.locator('[data-message-action=speak]').getAttribute('aria-label'),'Stop reading aloud');

  await first.locator('[data-message-action=pause]').click();
  assert.equal(await page.evaluate(()=>speechSynthesis.paused),true);
  const speechCount=await page.evaluate(()=>messageActionTest.spoken.length);
  await first.locator('[data-message-seek]').evaluate(element=>{element.value='600';element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.evaluate(()=>messageActionTest.spoken.length),speechCount);
  await first.locator('[data-message-action=pause]').focus();
  await first.evaluate(element=>element.dataset.beforeRefresh='yes');app.engine.persist(run);
  await page.waitForFunction(()=>!document.querySelector('.remote-message[data-before-refresh]'));
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.messageAction),'pause');
  assert.equal(await first.locator('[data-message-action=pause]').getAttribute('aria-label'),'Resume reading');
  await first.locator('[data-message-action=pause]').click();
  await page.waitForFunction(previous=>messageActionTest.spoken.length>previous,speechCount);
  assert.ok(!(await page.evaluate(()=>messageActionTest.spoken.at(-1).text)).startsWith('Local summary'));
  await first.locator('[data-message-seek]').focus();
  await first.locator('[data-message-seek]').evaluate(element=>{element.value='700';element.dispatchEvent(new Event('input',{bubbles:true}));});
  await first.evaluate(element=>element.dataset.beforeRefresh='yes');app.engine.persist(run);
  await page.waitForFunction(()=>!document.querySelector('.remote-message[data-before-refresh]'));
  assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-message-seek')),true);
  assert.equal(await first.locator('[data-message-seek]').inputValue(),'700');
  await first.locator('[data-message-seek]').evaluate(element=>element.dispatchEvent(new Event('change',{bubbles:true})));
  await page.evaluate(()=>messageActionTest.signal('boundary',{charIndex:3,name:'word'}));
  assert.ok(Number(await first.locator('[data-message-seek]').inputValue())>0);
  await first.locator('[data-message-action=stop]').click();assert.equal(await page.evaluate(()=>speechSynthesis.speaking),false);
  await first.locator('[data-message-action=speak]').click();

  const second=page.locator('.remote-message.assistant').filter({hasText:'Another completed reply.'});
  await second.locator('[data-message-action=speak]').click();
  assert.ok(await page.evaluate(previous=>messageActionTest.cancellations>previous,cancellations));
  assert.equal(await first.locator('[data-message-action=speak]').getAttribute('aria-label'),'Read aloud');
  await page.evaluate(()=>messageActionTest.signal('end'));
  assert.equal(await second.locator('[data-message-action=speak]').getAttribute('aria-label'),'Read aloud');
  await first.locator('[data-message-action=speak]').click();await page.evaluate(()=>messageActionTest.signal('error',{error:'synthesis-failed'}));
  assert.equal(await first.locator('[data-message-action=speak]').getAttribute('aria-label'),'Read aloud');
  await page.evaluate(()=>messageActionTest.setLocalVoices(false));
  assert.equal(await first.locator('[data-message-action=speak]').isDisabled(),true);
  assert.match(await first.locator('[data-message-action=speak]').getAttribute('title'),/local|unavailable/i);
  await page.evaluate(()=>messageActionTest.setLocalVoices(true));
  await first.locator('[data-message-action=speak]').click();
  await page.locator('[data-shell-nav=schedules]').click();assert.equal(await page.evaluate(()=>speechSynthesis.speaking),false);
  await page.locator('[data-shell-nav=chats]').click();await page.locator(`[data-run="${run.id}"]`).click();
  await first.locator('[data-message-action=speak]').click();
  await first.locator('.message-actions').evaluate(element=>element.remove());
  await page.waitForFunction(()=>!speechSynthesis.speaking);
  delete run.liveMessages;app.engine.persist(run);
  await first.locator('[data-message-action=speak]').waitFor();
  const hostId=await page.locator('#remote-host').inputValue();
  const otherHost=await page.locator('#remote-host option').evaluateAll((options,selected)=>options.find(option=>option.value&&option.value!==selected)?.value,hostId);
  await first.locator('[data-message-action=speak]').click();
  await selectHost(page,otherHost);
  assert.equal(await page.evaluate(()=>speechSynthesis.speaking),false);
  await selectHost(page,hostId);
  await first.locator('[data-message-action=speak]').waitFor();
  await first.locator('[data-message-action=speak]').click();
  await page.locator('[data-shell-nav=chats]').click();
  const otherChat=page.locator(`[data-run-host="${hostId}"]:not([data-run="${run.id}"])`).first();
  await otherChat.click();assert.equal(await page.evaluate(()=>speechSynthesis.speaking),false);
  await page.locator(`[data-shell-chat="${run.id}"] a`).first().click();
  await first.locator('[data-message-action=speak]').click();
  await page.locator('#remote-disconnect').evaluate(button=>button.click());assert.equal(await page.evaluate(()=>speechSynthesis.speaking),false);
  await page.locator('#remote-connect').evaluate(button=>button.click());await page.locator(`[data-shell-chat="${run.id}"] a`).first().click();
  await first.locator('[data-message-action=speak]').click();
  const beforeNavigation=await page.evaluate(()=>messageActionTest.cancellations);
  await page.goto(page.url());await page.locator('#chat-index-rows').waitFor();
  assert.ok(Number(await page.evaluate(()=>sessionStorage.getItem('synthetic-speech-cancellations')))>beforeNavigation);
  await page.locator(`[data-shell-chat="${run.id}"] a`).first().click();await first.locator('[data-message-action=speak]').click();
  await page.evaluate(()=>{const channel=new BroadcastChannel('proteus-remote-account');channel.postMessage({type:'logout',account:document.querySelector('#remote-workspace').dataset.account});channel.close();});
  await page.getByText(/Signed out. Sign in again to restore/).waitFor();assert.equal(await page.evaluate(()=>speechSynthesis.speaking),false);
  await page.reload();await page.locator('#chat-index-rows').waitFor();

}
