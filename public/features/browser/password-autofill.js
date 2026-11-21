// Apple owns pairing, credential selection and approval. Proteus only hosts its official extension.
export const applePasswordsExtensionId='pejdijmoenmkgeppbflobdenhhabjlaj';
const bitwardenExtensionId='nngceckbapebfimnlniiiahkandclblb';

export async function mountBitwardenBiometrics(container,{profileId,refresh,notify}){
 if(window.desktop?.platform!=='darwin')return;
 container.innerHTML=`<h3>Bitwarden biometrics</h3>
 <p class="note">On this Mac, open the official Bitwarden desktop app, unlock it and enable Touch ID and browser integration in Settings. In the extension for this profile, open Account security, choose Unlock with biometrics and answer the native messaging and desktop approval prompts.</p>
 <p class="note">If the extension cannot connect, confirm that the desktop app is open and unlocked, then check browser integration and retry from this profile. You can use the extension’s ordinary unlock methods while setting up Touch ID.</p>
 <button type="button" disabled>Checking Bitwarden…</button><p class="note" role="status"></p>`;
 const button=container.querySelector('button'),status=container.querySelector('[role=status]');
 const command=args=>window.desktop.browser({profileId,extensionId:bitwardenExtensionId,...args});
 let installed;
 const update=async()=>{
  installed=(await command({action:'extensions-list'})).find(row=>row.id===bitwardenExtensionId);
  if(!container.isConnected)return;
  button.textContent=installed?(installed.enabled?'Open Bitwarden':'Enable Bitwarden'):'Install official Bitwarden extension…';
  button.disabled=false;
  status.textContent=installed?.error||'Check biometric unlock in the extension. The package status does not verify desktop-helper access or Touch ID.';
 };
 button.onclick=async()=>{
  button.disabled=true;
  try{
   if(!installed)await command({action:'extensions-store-install'});
   else if(!installed.enabled)await command({action:'extensions-enable',enabled:true});
   else await command({action:'extensions-open'});
   await refresh();await update();
  }catch(error){status.textContent=error.message;button.disabled=false;notify(error.message);}
 };
 try{await update();}catch(error){status.textContent=error.message;button.textContent='Bitwarden unavailable';}
}

export async function mountApplePasswords(container,{profileId,refresh,notify}){
 if(window.desktop?.platform!=='darwin')return;
 container.innerHTML='<h3>Apple Passwords</h3><p class="note">Use your iCloud passwords with Apple’s official extension. Complete the verification code and unlock prompts yourself. Install separately in each browser profile you use.</p><button data-apple-passwords disabled>Checking Apple Passwords…</button><p class="note" data-apple-passwords-status role="status"></p>';
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
