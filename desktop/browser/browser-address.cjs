function normalizeURL(input) {
  const value = String(input || '').trim();
  if (!value || value.length>4096) throw new Error('Enter a website address or search term.');
  const explicit=/^https?:\/\//i.test(value);
  // A single-label intranet host needs an explicit numeric port to distinguish
  // it from a search. Other URI schemes and local paths keep their existing gate.
  const host=/^(?:localhost|(?:[a-z0-9\p{L}-]+\.)+[a-z0-9\p{L}-]+|\[[a-f0-9:]+\]|[a-z0-9\p{L}](?:[a-z0-9\p{L}-]*[a-z0-9\p{L}])?(?=:[0-9]))(?::[0-9]{1,5})?(?:[/?#][^\s]*)?$/iu.test(value);
  if(!explicit&&!host){
    if(/^[a-z][a-z0-9+.-]*:/i.test(value)||/^(?:[~/\\]|[a-z]:\\)/i.test(value)||/(?:token|password|secret|api[_-]?key|authorization|code)=/i.test(value))throw new Error('Use a web address or a search term without credentials or local paths.');
    return 'https://www.google.com/search?q='+encodeURIComponent(value);
  }
  const url = new URL(explicit ? value : `https://${value}`);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP or HTTPS address without credentials.');
  return url.href;
}
module.exports={normalizeURL};
