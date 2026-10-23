// Apple owns pairing, credential selection and approval. Proteus only hosts its official extension.
export const applePasswordsExtensionId='pejdijmoenmkgeppbflobdenhhabjlaj';
export async function mountApplePasswords(container,{profileId,refresh,notify}){
 if(window.desktop?.platform!=='darwin')return;
 container.innerHTML='<h3>Bitwarden biometrics</h3><p class="note">Install Bitwarden’s official desktop app on this Mac. In its settings, enable biometric unlock and browser integration. Then open the extension’s Account security settings, choose Unlock with biometrics, and approve its native messaging permission and the local desktop prompt. Each profile and Mac needs its own setup. Unlock and Touch ID approval stay on this Mac.</p><h3>Apple Passwords</h3><p class="note">Use your iCloud passwords with Apple’s official extension. Complete the verification code and unlock prompts yourself. Install separately in each browser profile you use.</p><button data-apple-passwords disabled>Checking Apple Passwords…</button><p class="note" data-apple-passwords-status role="status"></p>';
 if(window.desktop.windowPreview){const note=document.createElement('p');note.className='note';note.textContent='Experimental: extension setup is available, but Apple’s helper compatibility on this Mac is unresolved. Pairing and actual fill/save remain unverified.';container.append(note);}
 const button=container.querySelector('button'),status=container.querySelector('[role="status"]');
 let installed;
 const update=async()=>{const rows=await window.desktop.browser({action:'extensions-list',profileId});if(!container.isConnected)return;installed=rows.find(row=>row.id===applePasswordsExtensionId);button.textContent=installed?(installed.enabled?'Open Apple Passwords':'Enable Apple Passwords'):'Set up Apple Passwords…';button.disabled=false;status.textContent=installed?'Apple’s extension is '+(installed.enabled?'installed. Open it to pair or unlock.':'disabled in this profile.'):'Requires macOS Sonoma or later and iCloud Passwords & Keychain. You will review the extension permissions before installation.';};
 button.onclick=async()=>{
  button.disabled=true;status.textContent=installed?'Opening Apple Passwords…':'Downloading Apple’s extension for permission review…';
  try{
   if(!installed){const rows=await window.desktop.browser({action:'extensions-store-install',profileId,extensionId:applePasswordsExtensionId});installed=rows.find(row=>row.id===applePasswordsExtensionId);}
   if(installed){if(!installed.enabled)await window.desktop.browser({action:'extensions-enable',profileId,extensionId:applePasswordsExtensionId,enabled:true});await window.desktop.browser({action:'extensions-open',profileId,extensionId:applePasswordsExtensionId});}
   await refresh();await update();
  }catch(error){status.textContent=error.message;button.disabled=false;notify(error.message);}
 };
 try{await update();}catch(error){status.textContent=error.message;button.textContent='Apple Passwords unavailable';notify(error.message);}
}
