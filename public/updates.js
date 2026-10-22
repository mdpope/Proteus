export async function renderUpdates(container,ui,active){
 const esc=ui.escape;let releases=[];
 container.innerHTML=`<section class="card"><h2>Updates</h2><div data-update-status role="status">Checking this installation…</div><div data-update-controls hidden>
 <div class="actions"><button data-update-check>Check for updates</button><button data-update-import>Choose offline release</button></div>
 <label>Available releases<select data-update-release><option value="">Check for updates first</option></select></label><button data-update-stage disabled>Download and prepare</button>
 <p class="note">Releases must carry a trusted publisher signature. Downloading does not restart Proteus.</p>
 <label>Continue a chat after restart or recovery<select data-update-chat><option value="">Update without continuing a chat</option>${(ui.state.data.runs||[]).filter(run=>run.trigger==='chat'&&!run.archivedAt&&run.schedule.provider!=='local-process').map(run=>`<option value="${esc(run.id)}">${esc(run.title||run.id)}</option>`).join('')}</select></label>
 <label>Completed work and remaining verification<textarea data-update-checkpoint rows="4" placeholder="Required when continuing a chat after the update."></textarea></label>
 <div class="actions"><button data-update-handoff>Restart when active work finishes</button><button data-update-cancel>Cancel pending update</button></div></div></section>`;
 const find=selector=>container.querySelector(selector);
 const refresh=async()=>{
  const status=await ui.api('/api/updates');if(!active())return status;const {identity,job,error,download}=status;
  find('[data-update-status]').innerHTML=`<p>${identity.packaged?'Installed '+esc(identity.buildRevision):'Running from source. Install a desktop release to use Updates.'}</p>${download?`<p>${esc(download.phase)} · ${esc(download.version)} · ${esc(download.buildRevision)}</p>`:''}${job?`<p><strong>${esc(job.phase)}</strong>${job.outcome?' · '+esc(job.outcome):''} · ${esc(job.buildRevision||'')}</p>${job.blocker?`<p>${esc(job.blocker)}</p>`:''}${job.error?`<p class="banner">${esc(job.error)}</p>`:''}${job.phase==='attention'&&identity.barrier?'<p>The update needs inspection. You can resume ordinary work in the verified app.</p><button data-update-resume-work>Resume ordinary work</button>':''}${job.continuation?'<p>The original chat continuation was accepted automatically.</p>':''}${Number.isFinite(job.freeSpaceChange)?`<p class="note">Free space change: ${(job.freeSpaceChange/1024**3).toFixed(2)} GiB.</p>`:''}`:''}${error?`<p class="banner">${esc(error)}</p>`:''}`;
  const resume=find('[data-update-resume-work]');if(resume)resume.onclick=action(()=>ui.api('/api/updates',{action:'resume-work',id:job.id,expectedRevision:job.revision}));
  find('[data-update-controls]').hidden=!identity.capabilities?.prepare;if(job?.runId)find('[data-update-chat]').value=job.runId;
  find('[data-update-handoff]').disabled=job?.phase!=='prepared';find('[data-update-cancel]').disabled=!['prepared','waiting-for-idle'].includes(job?.phase);
  return status;
 };
 const action=callback=>async event=>{event.target.disabled=true;try{await callback();}catch(error){ui.toast(error.message);}finally{if(active()){event.target.disabled=false;try{await refresh();}catch(error){ui.toast(error.message);}}}};
 find('[data-update-check]').onclick=action(async()=>{
  releases=(await ui.api('/api/updates',{action:'releases',channel:'stable'})).releases;
  find('[data-update-release]').innerHTML=releases.length?releases.map(release=>`<option value="${esc(release.id)}">${esc(release.version)} · ${esc(release.buildRevision)}</option>`).join(''):'<option value="">No published releases available</option>';
  find('[data-update-stage]').disabled=!releases.length;
 });
 find('[data-update-stage]').onclick=action(async()=>{const release=releases.find(item=>item.id===find('[data-update-release]').value);if(!release)throw Error('Choose an available release.');await ui.api('/api/updates',{action:'stage-release',channel:'stable',releaseId:release.id,manifestDigest:release.manifestDigest});});
 find('[data-update-import]').onclick=action(async()=>{const [manifest]=await window.desktop.choosePaths({kind:'update-release'});if(manifest)await ui.api('/api/updates',{action:'import-release',manifest,channel:'stable'});});
 find('[data-update-handoff]').onclick=action(async()=>{const {job}=await refresh();await ui.api('/api/updates',{action:'handoff',id:job.id,expectedRevision:job.revision,runId:find('[data-update-chat]').value,checkpoint:find('[data-update-checkpoint]').value});});
 find('[data-update-cancel]').onclick=action(async()=>{const {job}=await refresh();await ui.api('/api/updates',{action:'cancel',id:job.id,expectedRevision:job.revision});});
 await refresh();const poll=()=>setTimeout(async()=>{if(!active())return;try{await refresh();}catch{}poll();},2000);poll();
}
export function renderUpdateCard(root,status,runId,escape,open){
 const previous=root.querySelector('.update-chat-card'),job=status?.job;
 if(job?.runId!==runId){previous?.remove();return;}
 const card=previous||document.createElement('section');card.className='card update-chat-card';card.setAttribute('role','status');card.innerHTML=`<strong>Proteus update · ${escape(job.phase)}</strong>${job.outcome?`<p>${escape(job.outcome==='rollback'?'Recovered the compatible previous app.':'Updated app verified.')}</p>`:''}${job.blocker?`<p>${escape(job.blocker)}</p>`:''}${job.error?`<p>${escape(job.error)}</p>`:''}<p class="note">${job.continuation?'This same chat resumed automatically.':'The helper retains this chat’s checkpoint through restart or compatible rollback.'}</p><button data-open-update-status>Update status</button>`;
 card.querySelector('button').onclick=open;if(!previous)(root.querySelector('#conversation-host')||root.lastElementChild)?.before(card);
}
