const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function errorColors(palette={}){
 const defaults={background:'#19231d',text:'#edf2ec',muted:'#8e9e95',accent:'#c2e8a0',border:'#3d4b40'};
 const colors=Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,/^#[a-f0-9]{6}$/i.test(palette?.[key]||'')?palette[key]:value]));
 const light=hex=>{const rgb=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.6;};
 return {...colors,scheme:light(colors.background)?'light':'dark',accentText:light(colors.accent)?'#182414':'#ffffff'};
}
function browserErrorDocument(address,error,{certificateToken=null,certificateInformation=null,palette}={}){
 const url=new URL(address);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid failed website address.');
 const observed=String(error||'Unknown browser error').slice(0,500);
 const unreachable=/ERR_ADDRESS_UNREACHABLE|ERR_NETWORK_ACCESS_DENIED/i.test(observed);
 const category=/ERR_NAME_NOT_RESOLVED|ERR_DNS_/i.test(observed)?'DNS lookup failed':unreachable?'Network access unavailable':/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED/i.test(observed)?'Network unavailable':/ERR_CERT_|ERR_SSL_/i.test(observed)?'Secure connection failed':'Page could not load';
 const help=unreachable?'<p>Check that this computer is connected to the site’s network or VPN. If other apps can reach it, check Proteus in macOS System Settings → Privacy &amp; Security → Local Network, then restart Proteus if the permission recently changed.</p>':'';
 const accept=/^[a-f0-9-]{36}$/.test(certificateToken||'')?`<p>This site uses a certificate Proteus could not verify.</p><p><button type="button" data-proteus-certificate-accept="${escape(certificateToken)}">Accept certificate and continue</button></p><p>This browser profile will accept this site’s current certificate until Proteus restarts.</p>`:'';
 const fields={subject:'Subject',issuer:'Issuer',validFrom:'Valid from',validTo:'Valid until',subjectAltName:'Alternative names',serialNumber:'Serial number',fingerprint:'SHA-256 fingerprint'};
 const information=certificateInformation&&typeof certificateInformation==='object'?Object.entries(fields).filter(([key])=>typeof certificateInformation[key]==='string'&&certificateInformation[key]).map(([key,label])=>`<dt>${label}</dt><dd>${escape(certificateInformation[key].slice(0,8192))}</dd>`).join(''):'';
 const details=information?`<details><summary role="button">View certificate information</summary><dl>${information}</dl></details>`:'';
 const c=errorColors(palette);
 const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="${c.scheme}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Could not open ${escape(url.host)}</title><style>:root{color-scheme:${c.scheme};font:17px system-ui;background:${c.background};color:${c.text}}body{max-width:640px;margin:12vh auto;padding:32px}h1{font-size:30px}p{line-height:1.6}code{overflow-wrap:anywhere;color:${c.muted}}a,button,summary{display:inline-block;font:inherit;background:${c.accent};color:${c.accentText};border:1px solid ${c.border};padding:12px 24px;border-radius:10px;text-decoration:none;cursor:pointer}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid ${c.accent};outline-offset:4px}details{margin:24px 0}summary{list-style:none}dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px 20px;line-height:1.5}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere;white-space:pre-wrap}@media(max-width:540px){dl{grid-template-columns:1fr;gap:6px}dd{margin-bottom:12px}}</style></head><body><p>Proteus browser</p><h1>${escape(category)}</h1><p>Unable to open <strong>${escape(url.host)}</strong>.</p><p><code>${escape(observed)}</code></p>${help}${accept}${details}<p><a href="${escape(url.href)}">Retry</a></p></body></html>`;
 return 'data:text/html;charset=utf-8,'+encodeURIComponent(html);
}
module.exports={browserErrorDocument,errorColors};
