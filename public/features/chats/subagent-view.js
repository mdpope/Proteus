const selections=new Map(),mounts=new WeakMap();
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
// This view owns presentation only. The owner proves parent/child membership for
// every page; no child action or composer is exposed here.
export function mountSubagentViewer(target,run,{agentPage,notify=()=>{}}={}){
 const root=target.closest('#main,.remote-chat-main')||target.parentElement;
 const title=root?.querySelector('.chat-title-line')||root?.querySelector('#peer-run-title')?.parentElement;
 if(!title)return;
 let view=mounts.get(target);
 if(view?.id!==run.id){view?.button.remove();view?.panel.remove();view=null;}
 if(!view){
  const button=node('button','Agents');button.type='button';button.className='subagent-toggle';button.setAttribute('aria-expanded','false');title.append(button);
  const panel=node('section',undefined,'subagent-panel');panel.hidden=true;panel.setAttribute('aria-label','Read-only agent conversations');target.before(panel);
  view={id:run.id,button,panel,selected:selections.get(run.id)||null,generation:0,cache:new Map()};mounts.set(target,view);
 }
 view.run=run;view.agentPage=agentPage;view.notify=notify;
 const rows=run.subagents||[];view.button.hidden=!rows.length;view.button.textContent=`Agents ${rows.length}`;
 const composer=root.querySelector('.composer'),pending=root.querySelector('.chat-pane > .pending,.remote-chat-main > .pending');
 const show=selected=>{
  if(!view.selected&&selected)view.parentTop=target.querySelector('.conversation')?.scrollTop;
  view.selected=selected;selections.delete(run.id);if(selected)selections.set(run.id,selected);while(selections.size>16)selections.delete(selections.keys().next().value);
  target.hidden=!!selected;view.panel.hidden=!selected;if(composer)composer.hidden=!!selected;if(pending)pending.hidden=!!selected;
  view.button.setAttribute('aria-expanded',String(!!selected));
  if(!selected){view.generation++;if(Number.isFinite(view.parentTop)){const scroll=target.querySelector('.conversation');if(scroll)scroll.scrollTop=view.parentTop;}return;}
  render();
 };
 const drawPage=(body,row,page)=>{body.replaceChildren();const note=node('p',row.transcriptAvailable?'Read-only · reply and approvals remain in the parent conversation.':'This provider has not exposed a transcript for this agent.','note');body.append(note);if(page?.earlier!==null&&page?.earlier!==undefined){const more=node('button','Earlier agent messages');more.type='button';more.onclick=()=>void load(row,body,page.earlier);body.append(more);}if(page?.truncated)body.append(node('p','Some agent detail is outside the retained journal limits.','note'));for(const event of page?.events||[]){const article=node('article',undefined,'message '+event.role);article.append(node('small',`${event.role} · ${event.at||''}`),node('pre',event.text));body.append(article);}for(const text of Object.values(page?.liveMessages||{})){const article=node('article',undefined,'message assistant');article.append(node('small','Assistant · streaming'),node('pre',text));body.append(article);}};
 const load=async(row,body,before)=>{
  const generation=++view.generation;body.textContent='Loading agent conversation…';
  try{const page=await view.agentPage(row.id,before);if(!target.isConnected||generation!==view.generation||view.selected!==row.id||view.run.id!==run.id)return;if(before===undefined)view.cache.set(row.id,{revision:JSON.stringify([row.eventCount,row.eventRevision,row.status]),page});drawPage(body,row,page);}
  catch(error){if(generation===view.generation&&view.selected===row.id){body.textContent=error.message;const retry=node('button','Retry reading agent');retry.type='button';retry.onclick=()=>void load(row,body,before);body.append(retry);}}
 };
 const render=()=>{
  view.panel.replaceChildren();const tabs=node('div',undefined,'subagent-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Agent conversations');
  const back=node('button','Parent conversation');back.type='button';back.onclick=()=>show(null);tabs.append(back);
  for(const row of rows){const tab=node('button',`${row.name||'Agent'} · ${row.status||'unknown'}`);tab.type='button';tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(row.id===view.selected));tab.onclick=()=>show(row.id);tabs.append(tab);}
  const row=rows.find(r=>r.id===view.selected);if(!row){show(null);return;}
  const body=node('div',undefined,'subagent-transcript');body.setAttribute('role','tabpanel');view.panel.append(tabs,node('p',row.task||row.provider,'note'),body);
  if(!view.agentPage){body.textContent='Agent transcript access is unavailable from this client or owner version.';return;}
  const cached=view.cache.get(row.id);if(cached?.revision===JSON.stringify([row.eventCount,row.eventRevision,row.status]))drawPage(body,row,cached.page);else void load(row,body);
 };
 view.button.onclick=()=>show(view.selected?null:rows[0]?.id);if(view.selected)show(view.selected);
}
