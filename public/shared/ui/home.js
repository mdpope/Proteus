import {computerDescription} from '../../services/remote/computer-identity.js';
// One Home structure for the desktop, website, and review demo.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function releaseSections(markdown = '') {
  markdown=typeof markdown==='string'?markdown:'';
  const headings = [...markdown.matchAll(/^## (?!Unreleased\b).+$/gm)];
  if (!headings.length) return { latest: markdown, older: '' };
  return { latest: markdown.slice(headings[0].index, headings[1]?.index), older: headings[1] ? markdown.slice(headings[1].index) : '' };
}
export function mountHome(target, value, { desktop = false, markdown, navigate, host = value } = {}) {
  const releases = releaseSections(value.changelog);
  const bullets=[...releases.latest.matchAll(/^- /gm)];
  const more=bullets.length>4?releases.latest.slice(bullets[4].index):'';
  const highlights=more?releases.latest.slice(0,bullets[4].index):releases.latest;
  const destinations = [['chats','Chats','Work with Copilot, Codex or Claude; keep messages, tool activity, browser pages and documents together.'],['schedules','Schedules','Run recurring work on your computer, review its history, and respond when a task needs your input.'],['team','Team Tools','Keep shared lists, standup rosters, agendas and browser tools close at hand.'],['life','Life','Track nutrition, vehicles, fuel, maintenance and supporting records across your devices.']];
  target.innerHTML = `<section id="home-screen" class="unified-home"><header class="home-heading"><h1>Proteus</h1><p class="home-tagline">Your work, together in one place.</p><p>Conversations, schedules, browsing and tools—connected across your devices.</p></header><section class="home-panel home-build" aria-label="Version information"><div><span class="home-eyebrow">Version</span><strong>${escape(value.version || 'Unavailable')}</strong></div><div><span class="home-eyebrow">Build</span><code>${escape(value.buildRevision || value.buildId || 'Source build')}</code></div></section><section class="home-panel home-capabilities"><h2>What Proteus can do</h2><div class="home-destinations">${destinations.map(([key,title,description])=>`<button type="button" data-home-go="${key}"><strong>${title}<span aria-hidden="true">↗</span></strong><span>${description}</span></button>`).join('')}</div><p class="home-note">Your computers run AI work. Open a chat to keep its browser pages and documents beside the conversation.</p><details class="home-guide"><summary>Explore all tools · full project guide</summary><article class="home-prose" data-home-guide></article></details></section><section class="home-panel home-changes"><div class="home-section-heading"><h2>Latest changes</h2><span class="home-version">Version ${escape(value.version || 'Unavailable')}</span></div><article class="home-prose" data-home-latest></article>${more?'<details class="home-more"><summary>More changes in this version</summary><article class="home-prose" data-home-more></article></details>':''}${releases.older?'<details class="home-older"><summary>Previous versions</summary><article class="home-prose" data-home-older></article></details>':''}</section>${desktop?`<section class="home-panel home-desktop"><h2>On ${escape(computerDescription(host))}</h2><p>Proteus keeps running in the background when you close its window. Keep this computer awake and online for scheduled work and connected devices.</p><div class="home-update-row"><p class="home-note">${escape(value.update?.message || 'Update status unavailable.')}</p><button type="button" data-home-updates>Check for updates</button></div></section>`:''}</section>`;
  for (const [selector, source] of [['[data-home-guide]',value.readme || 'The project guide was not included with this build.'], ['[data-home-latest]', highlights], ['[data-home-more]', more], ['[data-home-older]', releases.older]]) {
    const element = target.querySelector(selector);
    if (element) { if (source && markdown) markdown(element, source); else element.textContent = source || 'Release notes were not included with this installation.'; }
  }
  target.querySelectorAll('[data-home-go]').forEach(button=>button.onclick=()=>navigate?.(button.dataset.homeGo));
  const update=target.querySelector('[data-home-updates]');
  if(update)update.onclick=()=>{update.textContent=value.update?.message || 'Update status unavailable.';};
}
