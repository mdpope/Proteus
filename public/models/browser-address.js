/** Address classification only. Visiting a URL never grants history, sharing or page access. */
export function browserAddress(raw, searchBase='https://www.google.com/search?q=') {
  const value=String(raw||'').trim();
  if(!value||value.length>4096)throw new Error('Enter a website address or search term.');
  const explicit=/^https?:\/\//i.test(value);
  if(/[\\]/.test(value)||/^(?:[~/.]|[a-z]:\\)/i.test(value)||/^(?:file|javascript|data|blob|about|chrome|devtools|proteus):/i.test(value))throw new Error('Only HTTP and HTTPS websites can open here.');
  const address=explicit||! /\s/.test(value)&&(/^[^/?#\s]+[.:][^\s]*$/.test(value)||/^[^\s/:?#]+[/?#]/.test(value)||/^localhost(?:$|[:/?#])/i.test(value)||/^\[[^\]]+\]/.test(value));
  if(!address){if(/^[a-z][a-z0-9+.-]*:/i.test(value)||/(?:token|password|secret|api[_-]?key|authorization|code)=/i.test(value))throw new Error('Use a web address or a search term without credentials.');return searchBase+encodeURIComponent(value);}
  let url;try{url=new URL(explicit?value:'https://'+value);}catch{throw new Error('Enter a valid website address.');}
  if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)throw new Error('Enter an HTTP or HTTPS website without credentials.');
  if(!explicit&&/(?:token|password|secret|api[_-]?key|authorization|code)=/i.test(url.search))throw new Error('Paste the full trusted website URL to open a link with credentials.');
  return url.href;
}
