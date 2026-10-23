const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function bindBrowserAddressMenu(input, browserId, {showDialog, toast}) {
  if (!input || !browserId) return;
  input.oncontextmenu = async event => {
    event.preventDefault();
    const start=input.selectionStart, end=input.selectionEnd, selected=input.value.slice(start,end);
    const rect=input.getBoundingClientRect();
    const items=[
      {id:'undo',label:'Undo'}, {id:'redo',label:'Redo'},
      {id:'cut',label:'Cut',enabled:!!selected}, {id:'copy',label:'Copy selection',enabled:!!selected},
      {id:'paste',label:'Paste'}, {id:'select-all',label:'Select All'},
      {id:'copy-url',label:'Copy URL'}, {id:'certificate',label:'View certificate information'}
    ];
    try {
      const action=await window.desktop.browser({action:'popup-menu',items,x:event.clientX||rect.left,y:event.clientY||rect.bottom});
      if(!action)return;
      if(action==='copy-url'){await window.desktop.browser({action:'copy-url',id:browserId});toast('Current page URL copied.');return;}
      if(action==='certificate'){
        await showBrowserCertificate(browserId,{showDialog});return;
      }
      input.focus({preventScroll:true});input.setSelectionRange(start,end);
      if(action==='copy'){await window.desktop.copyText(selected);return;}
      if(action==='cut'){await window.desktop.copyText(selected);input.setRangeText('',start,end,'start');input.dispatchEvent(new Event('input',{bubbles:true}));return;}
      if(action==='paste'){
        const pasted=await navigator.clipboard.readText();input.setRangeText(pasted,start,end,'end');input.dispatchEvent(new Event('input',{bubbles:true}));return;
      }
      if(action==='select-all'){input.select();return;}
      if(action==='undo'||action==='redo')document.execCommand(action);
    } catch(error){toast(error.message);}
  };
}

export async function showBrowserCertificate(browserId,{showDialog}){
        const info=await window.desktop.browser({action:'certificate',id:browserId});
        const title=info.host?`HTTPS details for ${info.host}`:'HTTPS details';
        const fact=(label,value)=>value?`<dt>${label}</dt><dd>${escape(value)}</dd>`:'';
        const body=info.available?info.chain.map((cert,index)=>`<section class="certificate-entry"><h3>${index===0?'Current connection':`Chain certificate ${index+1}`}</h3><dl class="detail-facts">${fact('Subject',cert.subject)}${fact('Names',cert.subjectAltName)}${fact('Issuer',cert.issuer)}${fact('Valid from',cert.validFrom)}${fact('Valid until',cert.validTo)}${fact('Protocol',cert.protocol)}${fact('Cipher',cert.cipher)}${fact('SHA-256',cert.fingerprint256)}</dl></section>`).join(''):`<p>${escape(info.reason||'Certificate information is unavailable.')}</p>`;
        showDialog(`<h2>${escape(title)}</h2><p class="note">Read-only details from the current HTTPS connection. Viewing does not change trust settings.</p>${body}<button id="close-dialog">Close</button>`,()=>{});
}
