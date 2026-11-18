// N11-19: dates shown to people are human readable in the user's time zone. Exact ISO values stay
// in data and tooltips; this module only formats presentation text.
let resolveTimeZone = () => undefined;
/** Server: supply the user's configured time zone (Settings → time zone). Clients use the device zone. */
export function configureHumanTimeZone(resolver) { resolveTimeZone = typeof resolver === 'function' ? resolver : () => resolver; }
function validZone(zone) { if (!zone) return undefined; try { new Intl.DateTimeFormat('en-US', { timeZone: zone }); return zone; } catch { return undefined; } }
/** "Nov 11, 12:10 PM MST" (year added when it differs from now); invalid input is returned unchanged. */
export function humanTime(value, { timeZone, now = Date.now(), seconds = false } = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value ?? '');
  const zone = validZone(timeZone) ?? validZone(resolveTimeZone());
  const year = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: zone });
  const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), timeZoneName: 'short', timeZone: zone };
  if (year.format(date) !== year.format(new Date(now))) options.year = 'numeric';
  return new Intl.DateTimeFormat('en-US', options).format(date);
}
/** ISO-8601 instants with a time and explicit zone, as written by Proteus and providers. */
export const isoInstantPattern = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})\b/g;
