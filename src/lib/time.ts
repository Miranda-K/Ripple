// Fixed demo clock so the synthetic story never drifts. All timestamps are
// local, timezone-naive ISO strings (YYYY-MM-DDTHH:MM:SS).

export const DEMO_NOW = '2026-11-07T08:00:00';
const HOUR = 3_600_000;

export function parse(iso: string): number {
  return new Date(iso).getTime();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toIso(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** Day offset relative to the demo date (0 = today, -1 = yesterday) at HH:MM. */
export function at(dayOffset: number, hhmm: string): string {
  const base = new Date(DEMO_NOW);
  base.setDate(base.getDate() + dayOffset);
  const [h, m] = hhmm.split(':').map(Number);
  base.setHours(h, m, 0, 0);
  return toIso(base.getTime());
}

export function addMinutes(iso: string, minutes: number): string {
  return toIso(parse(iso) + minutes * 60_000);
}

export function hoursBetween(a: string, b: string): number {
  return (parse(b) - parse(a)) / HOUR;
}

export function withinHours(iso: string, hours: number, now: string = DEMO_NOW): boolean {
  const diff = parse(now) - parse(iso);
  return diff >= 0 && diff <= hours * HOUR;
}

const dateFmt = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' });

export function fmtDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}
export function fmtTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}
export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)}, ${fmtTime(iso)}`;
}
export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function relative(iso: string, now: string = DEMO_NOW): string {
  const mins = Math.round((parse(now) - parse(iso)) / 60_000);
  if (mins < 0) return fmtDateTime(iso);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** For <input type="datetime-local"> */
export function toInputValue(iso: string): string {
  return iso.slice(0, 16);
}
export function fromInputValue(v: string): string {
  return v.length === 16 ? `${v}:00` : v;
}
