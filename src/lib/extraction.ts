// Deterministic mock extraction: keyword rules turn free text into
// *draft* observations. Nothing is saved until a person reviews and confirms.
import type { ObservationCategory, ObservationDraft, ObservationFlag } from '@/types';
import { addMinutes, parse, toIso } from './time';

interface Rule {
  category: ObservationCategory;
  change?: RegExp;
  normal?: RegExp;
  changeValue: (m: RegExpMatchArray, clause: string) => { value: string; numeric?: number; flag?: ObservationFlag };
  normalValue: string;
  negatedValue: string;
}

const MEAL = /\b(breakfast|lunch|dinner|supper)\b/i;

const RULES: Rule[] = [
  {
    category: 'cognition',
    change: /confus|disorient|muddled|(didn['’]?t|did not) recogni[sz]e|forgetful|mixed up|not making sense/i,
    changeValue: (_m, clause) => ({
      value: /recogni/i.test(clause) ? 'Confusion reported; did not recognise familiar surroundings' : 'New confusion / disorientation reported',
    }),
    normalValue: 'Oriented, at baseline',
    negatedValue: 'No confusion reported',
  },
  {
    category: 'appetite',
    change: /(only|barely) ate|few bites|refused (her |his )?(breakfast|lunch|dinner|meal|food)|poor appetite|(wasn['’]?t|not) hungry|not eating|reduced appetite|pushing food away|ate (very )?little|ate (about |around |~)?(\d{1,3})\s?%/i,
    normal: /ate well|good appetite|finished (her|his) (meal|plate|breakfast|lunch|dinner)|ate (all|everything)/i,
    changeValue: (m, clause) => {
      const meal = clause.match(MEAL)?.[1]?.toLowerCase() ?? 'meal';
      const pctMatch = clause.match(/(\d{1,3})\s?%/);
      let pct = 30;
      if (pctMatch) pct = Number(pctMatch[1]);
      else if (/few bites|barely/i.test(clause)) pct = 20;
      else if (/refused/i.test(m[0])) pct = 0;
      else if (/half/i.test(clause)) pct = 50;
      return { value: pct < 50 ? `Reduced intake (~${pct}% of ${meal})` : `Ate ~${pct}% of ${meal}`, numeric: pct, flag: pct < 50 ? 'change' : 'normal' };
    },
    normalValue: 'Ate well (~90%)',
    negatedValue: 'No appetite concerns reported',
  },
  {
    category: 'mobility',
    change: /\bfell\b|\bfall\b|found on (the )?floor|unsteady|needed (two|2|extra|more) (staff|people|assist\w*|help)|shuffling|near[- ]fall/i,
    normal: /walked[^.]*as usual|steady on (her|his) feet|mobility at baseline/i,
    changeValue: (m) => ({ value: /fell|fall|floor/i.test(m[0]) ? 'Fall reported' : 'Mobility decline reported' }),
    normalValue: 'Mobility at baseline',
    negatedValue: 'No mobility concerns reported',
  },
  {
    category: 'sleep',
    change: /up (all|most of the) night|(didn['’]?t|did not) sleep|poor sleep|slept poorly|restless (overnight|at night|all night)|awake (at|from|most)/i,
    normal: /slept well|slept through/i,
    changeValue: () => ({ value: 'Disrupted sleep reported' }),
    normalValue: 'Slept at baseline',
    negatedValue: 'No sleep concerns reported',
  },
  {
    category: 'mood',
    change: /tearful|crying|withdrawn|anxious|irritable|low mood|upset/i,
    changeValue: (m) => ({ value: `Mood / behaviour change: ${m[0].toLowerCase()}` }),
    normalValue: 'Mood at baseline',
    negatedValue: 'No mood concerns reported',
  },
  {
    category: 'gi',
    change: /vomit\w*|diarrh\w*|loose stools?|nause\w*|stomach (pain|ache|cramp\w*)|abdominal pain/i,
    changeValue: (m) => ({ value: `GI symptom reported: ${m[0].toLowerCase()}` }),
    normalValue: 'No GI symptoms',
    negatedValue: 'No GI symptoms reported',
  },
  {
    category: 'respiratory',
    change: /cough\w*|short(ness)? of breath|wheez\w*|congest\w*|sore throat|runny nose/i,
    changeValue: (m) => ({ value: `Respiratory symptom reported: ${m[0].toLowerCase()}` }),
    normalValue: 'No respiratory symptoms',
    negatedValue: 'No respiratory symptoms reported',
  },
  {
    category: 'fever',
    change: /fever|temp(erature)?\.?\s*(of\s*)?(\d{2}(\.\d)?)/i,
    changeValue: (m) => {
      const t = m[3] ? Number(m[3]) : null;
      if (t === null) return { value: 'Fever reported (no reading)' };
      return { value: `Temperature ${t.toFixed(1)} °C`, numeric: t, flag: t >= 37.8 ? 'change' : 'normal' };
    },
    normalValue: 'No fever',
    negatedValue: 'No fever reported',
  },
];

const NEGATION = /\b(no|not|denies|denied|without|nil|never)\b[\w\s'-]{0,24}$/i;

function at(ref: string, dayDelta: number, hh: number, mm = 0): string {
  const d = new Date(ref);
  d.setDate(d.getDate() + dayDelta);
  d.setHours(hh, mm, 0, 0);
  return toIso(d.getTime());
}

/** Resolve simple relative-time phrases against the reference (note event) time. */
export function resolveTime(text: string, ref: string): string | null {
  const t = text.toLowerCase();
  const notAfter = (iso: string) => (parse(iso) > parse(ref) ? at(iso, -1, new Date(iso).getHours(), new Date(iso).getMinutes()) : iso);
  const clock = t.match(/\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (clock) {
    let h = Number(clock[1]) % 12;
    if (clock[3] === 'pm') h += 12;
    return notAfter(at(ref, 0, h, Number(clock[2] ?? 0)));
  }
  if (/yesterday (afternoon)/.test(t)) return at(ref, -1, 15);
  if (/yesterday (evening)|last evening/.test(t)) return at(ref, -1, 19);
  if (/yesterday (morning)/.test(t)) return at(ref, -1, 9);
  if (/yesterday/.test(t)) return at(ref, -1, 14);
  if (/overnight|last night|during the night|through the night/.test(t)) return notAfter(at(ref, 0, 2));
  if (/this morning|breakfast/.test(t)) return notAfter(at(ref, 0, 7, 30));
  if (/lunch/.test(t)) return notAfter(at(ref, 0, 12, 30));
  if (/this afternoon/.test(t)) return notAfter(at(ref, 0, 14));
  if (/dinner|supper|this evening|tonight|bedtime/.test(t)) return notAfter(at(ref, 0, 18));
  return null;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function extractObservations(text: string, referenceTime: string, sourceType: ObservationDraft['sourceType'] = 'care_note'): ObservationDraft[] {
  const sentences = text.split(/(?<=[.!?;])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const found = new Map<ObservationCategory, ObservationDraft>();
  let n = 0;
  for (const sentence of sentences) {
    const clauses = sentence.split(/,\s*/);
    for (const clause of clauses) {
      for (const rule of RULES) {
        let draft: ObservationDraft | null = null;
        const when = resolveTime(clause, referenceTime) ?? resolveTime(sentence, referenceTime) ?? referenceTime;
        const m = rule.change ? clause.match(rule.change) : null;
        if (m && m.index !== undefined) {
          const negated = NEGATION.test(clause.slice(0, m.index));
          if (negated) {
            draft = { tempId: '', category: rule.category, value: rule.negatedValue, flag: 'normal', observedAt: when, sourceType, evidence: cap(clause.replace(/[.;]$/, '')), include: true };
          } else {
            const v = rule.changeValue(m, clause);
            draft = { tempId: '', category: rule.category, value: v.value, flag: v.flag ?? 'change', numeric: v.numeric, observedAt: when, sourceType, evidence: cap(clause.replace(/[.;]$/, '')), include: true };
          }
        } else if (rule.normal && rule.normal.test(clause)) {
          draft = {
            tempId: '', category: rule.category, value: rule.normalValue, flag: 'normal', numeric: rule.category === 'appetite' ? 90 : undefined,
            observedAt: when, sourceType, evidence: cap(clause.replace(/[.;]$/, '')), include: true,
          };
        }
        if (!draft) continue;
        const existing = found.get(rule.category);
        // A documented change outranks a "normal" mention of the same domain.
        if (!existing || (existing.flag !== 'change' && draft.flag === 'change')) {
          draft.tempId = `draft-${++n}`;
          found.set(rule.category, draft);
        }
      }
    }
  }
  return [...found.values()].sort((a, b) => a.tempId.localeCompare(b.tempId, undefined, { numeric: true }));
}

export function nowPlus(ref: string, minutes: number) {
  return addMinutes(ref, minutes);
}
