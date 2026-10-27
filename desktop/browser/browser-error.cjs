const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function browserErrorDocument(address,error){
 const url=new URL(address);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid failed website address.');
 const observed=String(error||'Unknown browser error').slice(0,500);
 const category=/ERR_NAME_NOT_RESOLVED|ERR_DNS_/i.test(observed)?'DNS lookup failed':/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED/i.test(observed)?'Network unavailable':/ERR_CERT_|ERR_SSL_/i.test(observed)?'Secure connection failed':'Page could not load';
 const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="dark light"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Could not open ${escape(url.hostname)}</title><style>:root{color-scheme:dark light;font:17px system-ui;background:#17291f;color:#e6eee7}body{max-width:640px;margin:12vh auto;padding:32px}h1{font-size:30px}p{line-height:1.6}code{overflow-wrap:anywhere;color:#b7cbbb}a{display:inline-block;background:#8ccf91;color:#12251a;padding:12px 24px;border-radius:10px;text-decoration:none}a:focus-visible{outline:3px solid white;outline-offset:4px}@media(prefers-color-scheme:light){:root{background:#eef5ee;color:#193822}code{color:#375e42}}</style></head><body><p>Proteus browser</p><h1>${escape(category)}</h1><p>Unable to open <strong>${escape(url.hostname)}</strong>.</p><p><code>${escape(observed)}</code></p><p><a href="${escape(url.href)}">Retry</a></p></body></html>`;
 return 'data:text/html;charset=utf-8,'+encodeURIComponent(html);
}
module.exports={browserErrorDocument};
