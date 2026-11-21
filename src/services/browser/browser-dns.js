export function browserResolverOptions(preference) {
  if (preference === undefined) return { enableBuiltInResolver: false, secureDnsMode: 'off' };
  if (!preference || typeof preference !== 'object' || Array.isArray(preference)) {
    throw new Error('Choose a browser DNS mode.');
  }
  const { mode, endpoint } = preference;
  if (mode === 'system' && endpoint === undefined) {
    return { enableBuiltInResolver: false, secureDnsMode: 'off' };
  }
  if (mode !== 'secure') throw new Error('Choose a browser DNS mode.');

  let url;
  try {
    if (typeof endpoint === 'string' && endpoint.length <= 2048 && !/[{}]/u.test(endpoint)) {
      url = new URL(endpoint);
    }
  } catch {}
  if (url?.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('Enter an HTTPS DNS-over-HTTPS endpoint without credentials or a fragment.');
  }
  return { enableBuiltInResolver: true, secureDnsMode: 'secure', secureDnsServers: [url.href] };
}
