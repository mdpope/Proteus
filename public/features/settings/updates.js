import {mountUpdateCoordinatorDefaults} from './update-coordinator-preferences.js';
const attemptsKey='proteus.update-start-attempts';
function attempts(){try{return JSON.parse(localStorage.getItem(attemptsKey)||'{}');}catch{return {};}}
export async function renderUpdates(container,ui,active){
 const esc=ui.escape;let releases=[];
 container.innerHTML=`<section class="card"><h2>Updates</h2><div data-update-status role="status">Checking this installation…</div><div data-update-error role="status"></div><div data-update-controls hidden>
 <div class="actions"><button data-update-check>Check for updates</button><button data-update-import>Choose offline release</button></div>
 <p data-update-publication role="status"></p><label>Available releases<select data-update-release><option value="">Check for updates first</option></select></label><button data-update-stage disabled>Start update in a new chat</button>
 <p class="note">Each upgrade creates its own chat named for the release, using the provider defaults below. That chat prepares, tests and verifies the update through restart. Existing chats keep their work.</p>
 <div class="actions"><button data-update-open-chat hidden>Open update chat</button><button data-update-cancel disabled>Defer update</button></div></div></section>`;
 const find=selector=>container.querySelector(selector);
 const showError=error=>{if(active())find('[data-update-error]').textContent=error.message;};
 const refresh=async()=>{
  const status=await ui.api('/api/updates');if(!active())return status;const {identity,job,error,download}=status;
  find('[data-update-status]').innerHTML=`<p>${identity.packaged?'Installed '+esc(identity.buildRevision):'Running from source. Install a desktop release to use Updates.'}</p>${download?`<p>${esc(download.phase)} · ${esc(download.version)} · ${esc(download.buildRevision)}</p>`:''}${job?`<p><strong>${esc(job.phase)}</strong>${job.outcome?' · '+esc(job.outcome):''} · ${esc(job.buildRevision||'')}</p>${renderUpdateIdle(job,esc)}${job.error?`<p class="banner">${esc(job.error)}</p>`:''}${job.phase==='attention'&&identity.barrier?'<p>The update needs inspection. You can resume ordinary work in the verified app.</p><button data-update-resume-work>Resume ordinary work</button>':''}${job.continuation?'<p>The update chat resumed automatically.</p>':''}${Number.isFinite(job.freeSpaceChange)?`<p class="note">Free space change: ${(job.freeSpaceChange/1024**3).toFixed(2)} GiB.</p>`:''}`:''}${error?`<p class="banner">${esc(error)}</p>`:''}`;
  for(const button of container.querySelectorAll('[data-update-blocking-chat]'))button.onclick=()=>ui.openUpdateChat?.({id:button.dataset.updateBlockingChat});
  for(const button of container.querySelectorAll('[data-update-stop-chat]'))button.onclick=action(async()=>{
   const current=await ui.api('/api/updates'),item=current.job?.id===job?.id&&['prepared','waiting-for-idle'].includes(current.job.phase)&&current.job?.idle?.blockers.find(item=>item.chatId===button.dataset.updateStopChat&&!item.coordinator);
   if(!item)throw Error('This work is no longer an update blocker. Review the current status.');
   if(!window.confirm('Stop “'+item.title+'” so the update can proceed? Its active turn will be cancelled. Other work will keep running.'))return;
   await ui.api('/api/runs/'+encodeURIComponent(item.chatId)+'/cancel',{});
  });
  const resume=find('[data-update-resume-work]');if(resume)resume.onclick=action(()=>ui.api('/api/updates',{action:'resume-work',id:job.id,expectedRevision:job.revision}));
  if(job?.phase==='attention'&&job.attentionResolution){
   const note=document.createElement('p');note.className='note';note.textContent='Recovery reconciled after verification. The original failure is retained above; no update continuation was replayed. Maintenance can inspect a fresh plan.';find('[data-update-status]').append(note);
  }else if(job?.phase==='attention'&&job.health?.verified&&job.ordinaryWorkResumedAt){
   const button=document.createElement('button');button.textContent='Recheck repaired recovery';button.onclick=action(async()=>{const plan=await ui.api('/api/updates',{action:'reconciliation',id:job.id,expectedRevision:job.revision});await ui.api('/api/updates',{action:'reconcile',id:job.id,expectedRevision:job.revision,planDigest:plan.planDigest});});find('[data-update-status]').append(button);
  }
  find('[data-update-controls]').hidden=!identity.capabilities?.prepare;
  find('[data-update-open-chat]').hidden=!job?.runId;find('[data-update-open-chat]').onclick=()=>ui.openUpdateChat?.({id:job.runId});
  find('[data-update-cancel]').disabled=!['prepared','waiting-for-idle'].includes(job?.phase);
  return status;
 };
 const action=callback=>async event=>{event.target.disabled=true;try{await callback();}catch(error){showError(error);}finally{if(active()){event.target.disabled=false;try{await refresh();}catch(error){showError(error);}}}};
 const start=async selection=>{
  const key=JSON.stringify(selection),saved=attempts(),operationId=saved[key]||crypto.randomUUID();saved[key]=operationId;localStorage.setItem(attemptsKey,JSON.stringify(saved));
  const run=await ui.api('/api/updates/coordinator',{...selection,operationId});
  const latest=attempts();delete latest[key];localStorage.setItem(attemptsKey,JSON.stringify(latest));
  await ui.openUpdateChat?.(run);
 };
 find('[data-update-check]').onclick=action(async()=>{
  find('[data-update-error]').textContent='';const catalog=await ui.api('/api/updates',{action:'releases',channel:'stable'});releases=catalog.releases;
  const pending=catalog.publication?.state==='pending';
  find('[data-update-publication]').textContent=pending?'Version '+catalog.publication.version+' is pending for this computer.'+(releases.length?' The previous verified release remains available; select it explicitly if needed.':''):'';
  find('[data-update-release]').innerHTML=(pending?'<option value="">Waiting for the new version — choose a previous release explicitly</option>':'')+(releases.length?releases.map(release=>`<option value="${esc(release.id)}">${esc(release.version)} · ${esc(release.buildRevision)}${pending?' · previous release':''}</option>`).join(''):'<option value="">No published releases available</option>');
  find('[data-update-stage]').disabled=pending||!releases.length;
 });
 find('[data-update-release]').onchange=()=>{find('[data-update-stage]').disabled=!releases.some(row=>row.id===find('[data-update-release]').value);};
 find('[data-update-stage]').onclick=action(async()=>{const release=releases.find(item=>item.id===find('[data-update-release]').value);if(!release)throw Error('Choose an available release.');await start({channel:'stable',releaseId:release.id,manifestDigest:release.manifestDigest});});
 find('[data-update-import]').onclick=action(async()=>{const [manifest]=await window.desktop.choosePaths({kind:'update-release'});if(manifest)await start({manifest,channel:'stable'});});
 find('[data-update-cancel]').onclick=action(async()=>{const {job}=await refresh();await ui.api('/api/updates',{action:'cancel',id:job.id,expectedRevision:job.revision});});
 // Provider configuration remains mounted even when the update journal/catalog
 // needs repair. A Windows JSON error must not hide its provider selector.
 await mountUpdateCoordinatorDefaults(container,ui,active);
 await mountDesktopControlReadiness(container,ui,active);
 try{await refresh();}catch(error){showError(error);}
 const poll=()=>setTimeout(async()=>{if(!active())return;try{await refresh();}catch(error){showError(error);}poll();},2000);poll();
}

// Dismissal hides only a terminal notice; the supervisor receipt remains intact.
const dismissalKey='proteus.dismissed-update-notices',dismissedUpdateNotices=new Set();
export const dismissibleUpdateJob=job=>!!job?.id&&['complete','cancelled'].includes(job.phase);
function isDismissed(job){try{return dismissedUpdateNotices.has(job.id)||JSON.parse(localStorage.getItem(dismissalKey)||'[]').includes(job.id);}catch{return dismissedUpdateNotices.has(job.id);}}
function dismiss(job){dismissedUpdateNotices.add(job.id);try{const ids=new Set(JSON.parse(localStorage.getItem(dismissalKey)||'[]'));ids.add(job.id);localStorage.setItem(dismissalKey,JSON.stringify([...ids].slice(-64)));}catch{}}
export function renderUpdateCard(root,status,runId,escape,open,openChat){
 const previous=root.querySelector('.update-chat-card'),job=status?.job;
 if(job?.runId!==runId||dismissibleUpdateJob(job)&&isDismissed(job)){previous?.remove();return;}
 const card=previous||document.createElement('section');card.className='card update-chat-card';card.setAttribute('role','status');card.innerHTML=`<strong>Proteus update · ${escape(job.phase)}</strong>${job.outcome?`<p>${escape(job.outcome==='rollback'?'Recovered the compatible previous app.':'Updated app verified.')}</p>`:''}${renderUpdateIdle(job,escape)}${job.error?`<p>${escape(job.error)}</p>`:''}<p class="note">${job.continuation?'This same chat resumed automatically.':'The helper retains this chat’s checkpoint through restart or compatible rollback.'}</p><button data-open-update-status>Update status</button>`;
 card.querySelector('[data-open-update-status]').onclick=open;
 for(const button of card.querySelectorAll('[data-update-blocking-chat]'))button.onclick=()=>openChat?.({id:button.dataset.updateBlockingChat});
 for(const button of card.querySelectorAll('[data-update-stop-chat]'))button.remove();
 if(dismissibleUpdateJob(job)){const close=document.createElement('button');close.textContent='Dismiss';close.setAttribute('aria-label','Dismiss completed update notice');close.dataset.dismissUpdateNotice='';close.onclick=()=>{dismiss(job);card.remove();};card.append(close);}
 if(!previous)(root.querySelector('#conversation-host')||root.lastElementChild)?.before(card);
}

/** Desktop-control readiness beside updates: drivers are checked after every update,
 * and a guided chat (using the update-chat defaults) walks through any missing setup. */
export async function mountDesktopControlReadiness(container,ui,active){
 if(!window.desktop)return;
 const section=document.createElement('section');section.className='card desktop-control-readiness';section.setAttribute('aria-label','Desktop control readiness');container.append(section);
 const draw=async()=>{
  let status;try{status=await ui.api('/api/desktop-control');}catch(error){if(active())section.innerHTML=`<h2>Desktop control</h2><p class="note">${ui.escape(error.message)}</p>`;return;}
  if(!active())return;
  const rows=status.backends.map(item=>`<li><strong>${item.id==='cua'?'Cua Driver':'Peekaboo'}</strong> · ${item.installed?'Installed':'Not installed'}${item.id===status.primary?' · primary':' · backup'}</li>`).join('');
  const installed=status.backends.find(item=>item.id===status.primary)?.installed&&!status.permissionIssue,verified=installed&&status.verification?.verified===true,ready=installed;
  section.innerHTML=`<h2>Desktop control</h2><p>${verified?'Verified on this computer. Agents can observe native apps when you allow it; input is proven only by a real task.':installed?'Installed, not yet verified on this computer. Open Desktop Control and choose Verify.':'Needs setup. Agents cannot control native apps until the driver is installed and allowed.'}</p><ul>${rows}</ul>${status.permissionIssue?`<p class="banner">Permission issue: ${ui.escape(typeof status.permissionIssue==='string'?status.permissionIssue:JSON.stringify(status.permissionIssue))}</p>`:''}<div class="actions">${ready?'':'<button class="primary" data-desktop-setup>Set up desktop control</button>'}<button data-desktop-recheck>Check again</button></div><p class="note">Setup opens a chat using the update-chat defaults. It explains each step and asks before installing anything; macOS permissions are granted by you in System Settings, and Windows needs no administrator access.</p>`;
  section.querySelector('[data-desktop-recheck]').onclick=()=>void draw();
  const setup=section.querySelector('[data-desktop-setup]');if(setup)setup.onclick=async()=>{setup.disabled=true;try{const run=await ui.api('/api/desktop-control/setup',{});await ui.openUpdateChat?.(run);}catch(error){ui.toast(error.message);}finally{setup.disabled=false;}};
 };
 await draw();
}

// Shared by the settings screen and the updating chat; owner status is live and
// remains the only authority for what must finish before replacement.
export function renderUpdateIdle(job,escape){
 const idle=job?.idle,progress=job?.verificationProgress;
 const detail=progress?`<p class="note">Recovery verification: ${escape(progress.stage)} · attempt ${progress.attempt} · last progress ${escape(new Date(progress.lastProgressAt).toLocaleString())}${progress.lastFailure?' · '+escape(progress.lastFailure):''}</p>`:'';
 if(!idle)return detail+(job?.blocker?`<p>${escape(job.blocker)}</p>`:'');
 return detail+`<div data-update-idle>${idle.checkpointReviewRequired?'<p><strong>Checkpoint review required</strong></p>':''}<ul>${idle.blockers.map(item=>`<li><strong>${escape(item.title)}</strong>${item.chatId?` · <code style="overflow-wrap:anywhere">${escape(item.chatId)}</code> · ${escape(item.status)}${item.coordinator?' · update coordinator':''}<div class="actions"><button data-update-blocking-chat="${escape(item.chatId)}">${item.status==='awaiting_input'?'Resolve pending item':'Open chat'}</button>${!item.coordinator&&['running','queued','awaiting_input'].includes(item.status)?`<button data-update-stop-chat="${escape(item.chatId)}">Stop this chat…</button>`:''}</div>`:''}<ul>${item.reasons.map(reason=>`<li>${escape(reason.text)}${reason.nextAttemptAt?' Next attempt: '+escape(reason.nextAttemptAt):''}</li>`).join('')}</ul><p class="note">${escape(item.nextStep)}</p></li>`).join('')}</ul><p>${escape(idle.nextStep)}</p></div>`;
}
