// Read-only reporting. Stored meal versions remain authoritative; no current-food substitutions.
export const nutritionMacros = ['calories', 'protein', 'carbs', 'fat'];
const dayMillis = 86_400_000;
export function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value) throw new Error('Choose a valid calendar date.');
  return value;
}
export function reportCalendar(timezone = 'UTC', instant = new Date()) {
  let formatter;
  try { formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { throw new Error('The workspace reporting timezone is invalid.'); }
  return { reportDate: calendarDate(formatter.format(new Date(instant))), reportTimezone: formatter.resolvedOptions().timeZone };
}
const shift = (date, days) => new Date(Date.parse(date + 'T00:00:00Z') + days * dayMillis).toISOString().slice(0, 10);
function summarize(days, from = null, through = null) {
  const selected = days.filter(d => (!from || d.date >= from) && (!through || d.date <= through)), complete = selected.filter(d => d.complete);
  const calendarDays = from && through ? Math.round((Date.parse(through) - Date.parse(from)) / dayMillis) + 1 : null;
  return { from, through, completeDays: complete.length, entryCount: complete.reduce((n, d) => n + d.entryCount, 0), firstDate: complete.at(-1)?.date || null, lastDate: complete[0]?.date || null, calendarDays, loggedDays: selected.length, partialDays: selected.length - complete.length, unloggedDays: calendarDays === null ? null : calendarDays - selected.length, ...Object.fromEntries(nutritionMacros.map(k => [k, complete.length ? complete.reduce((n, d) => n + d[k], 0) / complete.length : null])) };
}
export function nutritionReport(entries, { from, through, timezone = 'UTC', instant = new Date() } = {}) {
  from = from ? calendarDate(from) : null; through = through ? calendarDate(through) : null;
  if (from && through && from > through) throw new Error('The start date must not be after the end date.');
  const calendar = reportCalendar(timezone, instant), daily = new Map();
  for (const entry of entries) {
    if (entry.deleted_at) continue;
    const date = calendarDate(String(entry.date).slice(0, 10));
    const day = daily.get(date) || { date, entryCount: 0, foodNames: [], meals: new Set(), calories: 0, protein: 0, carbs: 0, fat: 0 };
    day.entryCount++; if (entry.food_name && day.foodNames.length < 4) day.foodNames.push(entry.food_name);
    day.meals.add(String(entry.meal).toLowerCase());
    for (const macro of nutritionMacros) day[macro] += (Number(entry.qty) || 0) * (Number(entry[macro]) || 0);
    daily.set(date, day);
  }
  const allDays = [...daily.values()].map(({ meals, ...day }) => ({ ...day, complete: ['breakfast', 'lunch', 'dinner'].every(meal => meals.has(meal)) })).sort((a, b) => b.date.localeCompare(a.date));
  const summary = summarize(allDays, from, through), days = allDays.filter(d => (!from || d.date >= from) && (!through || d.date <= through));
  const months = [...new Set(days.filter(d => d.complete).map(d => d.date.slice(0, 7)))];
  const monthly = months.map(month => { const included = days.filter(d => d.date.startsWith(month)); const s = summarize(included); return { month, days: s.completeDays, ...s, caloriesTotal: included.filter(d => d.complete).reduce((n, d) => n + d.calories, 0) }; });
  const periods = [['all_complete_days', 'All complete days', null, null], ['this_month', 'This month', calendar.reportDate.slice(0, 7) + '-01', calendar.reportDate], ['last_30_calendar_days', 'Last 30 calendar days', shift(calendar.reportDate, -29), calendar.reportDate]];
  return { ...calendar, days, averages: { days: summary.completeDays, ...summary }, monthly, periodSummaries: periods.map(([id, label, start, end]) => ({ id, label, ...summarize(allDays, start, end) })) };
}
export function latestObservation(fills, readings, services) {
  const rows = [...fills.map(r => ({ date: String(r.filled_at).slice(0, 10), miles: Number(r.odometer) })), ...readings.map(r => ({ date: String(r.observed_on).slice(0, 10), miles: Number(r.miles) })), ...services.filter(r => r.odometer != null && r.date_precision === 'day' && !r.odometer_approximate).map(r => ({ date: String(r.occurred_on).slice(0, 10), miles: Number(r.odometer) }))].filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.miles));
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.miles - b.miles); return rows.at(-1) || null;
}
