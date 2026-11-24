// Daily Moodle check: reads the Moodle calendar export (iCal) and puts new deadlines
// into the owner's Lyra inbox in Supabase. Lyra then shows them under DDL as
// "新消息" with 加入 DDL / 忽略. Nothing is added to the DDL list without you.
//
// Needs three GitHub secrets: MOODLE_ICS_URL, SUPABASE_SERVICE_KEY, LYRA_USER_ID.
const {MOODLE_ICS_URL, SUPABASE_SERVICE_KEY, LYRA_USER_ID} = process.env;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://naedsprhisphrqmduaap.supabase.co';
if (!MOODLE_ICS_URL || !SUPABASE_SERVICE_KEY || !LYRA_USER_ID) {
  console.error('Missing secrets: MOODLE_ICS_URL, SUPABASE_SERVICE_KEY and LYRA_USER_ID are all needed.');
  process.exit(1);
}

const res = await fetch(MOODLE_ICS_URL);
if (!res.ok) { console.error('Moodle answered', res.status); process.exit(1); }
const ics = await res.text();
if (!ics.includes('BEGIN:VCALENDAR')) { console.error('Not a calendar file (the Moodle link may have expired).'); process.exit(1); }

const lines = ics.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
const events = []; let cur = null;
for (const l of lines) {
  if (l === 'BEGIN:VEVENT') cur = {};
  else if (l === 'END:VEVENT') { if (cur) events.push(cur); cur = null; }
  else if (cur) { const i = l.indexOf(':'); if (i < 0) continue; const [k, ...params] = l.slice(0, i).split(';'); cur[k] = {v: l.slice(i + 1), p: params}; }
}
const unesc = s => String(s || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

function londonParts(d) {
  const f = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(d);
  const o = {}; f.forEach(x => o[x.type] = x.value);
  return {date: `${o.year}-${o.month}-${o.day}`, time: `${o.hour}:${o.minute}`};
}
function when(f) {
  if (!f) return null;
  const v = f.v, allDay = f.p.some(p => p === 'VALUE=DATE') || /^\d{8}$/.test(v);
  const m = /^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)(Z?))?/.exec(v); if (!m) return null;
  if (allDay) return {date: `${m[1]}-${m[2]}-${m[3]}`, time: '', at: Date.UTC(+m[1], m[2] - 1, +m[3])};
  // Moodle exports UTC (…Z); a TZID time is treated as London local time.
  const utc = m[7] === 'Z' ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : null;
  if (utc !== null) return {...londonParts(new Date(utc)), at: utc};
  return {date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}`, at: Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5])};
}

const now = Date.now(), horizon = now + 150 * 864e5;
const rows = [];
for (const e of events) {
  let title = unesc(e.SUMMARY && e.SUMMARY.v);
  if (!title || / opens$/i.test(title)) continue;
  const course = unesc(e.CATEGORIES && e.CATEGORIES.v).split(',')[0].replace(/_\d\d-\d\d$/, '').trim();
  if (/^CHEM0006/.test(course) && /milestone/i.test(title)) continue;
  title = title.replace(/\s+(is due|closes|should be completed|due)$/i, '').trim();
  const w = when(e.DTSTART); if (!w || w.at < now - 864e5 || w.at > horizon) continue;
  const id = 'moodle-' + String((e.UID && e.UID.v) || `${course}-${title}-${w.date}`).replace(/[^A-Za-z0-9@._-]+/g, '-').slice(0, 120);
  rows.push({user_id: LYRA_USER_ID, id, data: {source: 'moodle', course, task: title.slice(0, 140), date: w.date, time: w.time, link: unesc(e.URL && e.URL.v) || ''}});
}
console.log(`Calendar has ${events.length} events; ${rows.length} upcoming deadlines.`);
if (!rows.length) process.exit(0);

// Insert only new ones: rows already in the inbox (added, ignored or waiting) are left alone.
const up = await fetch(`${SUPABASE_URL}/rest/v1/inbox?on_conflict=user_id,id`, {
  method: 'POST',
  headers: {apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation'},
  body: JSON.stringify(rows)
});
if (!up.ok) { console.error('Supabase answered', up.status, await up.text()); process.exit(1); }
const added = await up.json();
console.log(`New in inbox: ${added.length}`);
for (const r of added) console.log(' +', r.data.date, r.data.course, r.data.task);
