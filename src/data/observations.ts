// Deterministic routine observations for all 48 residents over the last 7 days,
// merged with the hand-authored story observations.
import type { Observation, ObservationCategory, ObservationFlag, SourceType } from '@/types';
import { at, addMinutes, dayKey } from '@/lib/time';
import { rand } from '@/lib/random';
import { RESIDENTS, STORY } from './residents';
import { UNIT_AIDE, UNIT_NURSE } from './staff';
import { MEAL_OVERRIDES, STORY_OBSERVATIONS } from './storyRecords';

const MEALS: { slot: 'breakfast' | 'lunch' | 'dinner'; time: string }[] = [
  { slot: 'breakfast', time: '08:00' },
  { slot: 'lunch', time: '12:30' },
  { slot: 'dinner', time: '17:30' },
];

interface RoutineSpec {
  category: ObservationCategory;
  time: string;
  days: number[];
  missingRate: number;
  notAssessedRate?: number;
  value: string;
  sourceType: SourceType;
  byAide?: boolean;
}

const ROUTINE: RoutineSpec[] = [
  { category: 'cognition', time: '10:00', days: [-6, -5, -4, -3, -2, -1], missingRate: 0.08, value: 'Oriented, at baseline during morning care', sourceType: 'shift_handover' },
  { category: 'mobility', time: '14:00', days: [-6, -5, -4, -3, -2, -1], missingRate: 0.08, value: 'Ambulation / transfers at baseline', sourceType: 'shift_handover' },
  { category: 'sleep', time: '05:00', days: [-6, -5, -4, -3, -2, -1, 0], missingRate: 0.12, notAssessedRate: 0.05, value: 'Slept at baseline overnight', sourceType: 'shift_handover', byAide: true },
  { category: 'mood', time: '16:00', days: [-6, -5, -4, -3, -2, -1], missingRate: 0.15, value: 'Mood at baseline', sourceType: 'shift_handover' },
  { category: 'gi', time: '09:00', days: [-6, -5, -4, -3, -2, -1], missingRate: 0.1, value: 'Daily screen: no GI symptoms', sourceType: 'shift_handover' },
  { category: 'respiratory', time: '09:00', days: [-6, -5, -4, -3, -2, -1], missingRate: 0.1, value: 'Daily screen: no respiratory symptoms', sourceType: 'shift_handover' },
];

/** Story residents' symptom screens stop being "normal" from their onset day onward. */
function suppressedScreen(residentId: string, category: ObservationCategory, day: number, time: string): boolean {
  const story = STORY_OBSERVATIONS.filter((o) => o.residentId === residentId && o.category === category && o.flag === 'change');
  if (!story.length) return false;
  const thisDay = dayKey(at(day, '00:00'));
  if (category === 'sleep') return story.some((o) => dayKey(o.observedAt) === thisDay);
  if (category === 'gi' || category === 'respiratory') {
    const firstOnset = story.map((o) => o.observedAt).sort()[0];
    return at(day, time) >= firstOnset;
  }
  return false;
}

function build(): Observation[] {
  const out: Observation[] = [];
  for (const r of RESIDENTS) {
    const nurse = UNIT_NURSE[r.unit];
    const aide = UNIT_AIDE[r.unit];
    // Meal records (last 3 full days)
    for (const day of [-3, -2, -1]) {
      for (const meal of MEALS) {
        const key = `${day}|${meal.slot}`;
        const override = MEAL_OVERRIDES[r.id]?.[key];
        if (override === undefined && rand(`${r.id}:meal:${key}:missing`) < 0.06) continue;
        const base = r.baseline.appetite.numeric ?? 80;
        const jitter = Math.round((rand(`${r.id}:meal:${key}`) * 20 - 12) / 5) * 5;
        const pct = override ?? Math.max(60, Math.min(100, base + jitter));
        const observedAt = at(day, meal.time);
        const flag: ObservationFlag = pct < 50 ? 'change' : 'normal';
        out.push({
          id: `o-meal-${r.id}-${day}-${meal.slot}`,
          residentId: r.id,
          category: 'appetite',
          value: `Ate ~${pct}% of ${meal.slot}`,
          flag,
          numeric: pct,
          observedAt,
          recordedAt: addMinutes(observedAt, 75),
          recordedBy: 's-dietary',
          sourceType: 'meal_record',
          sourceId: `meal-log-${dayKey(observedAt)}-${meal.slot}`,
          status: 'observed',
          reviewedBy: null,
        });
      }
    }
    // Routine shift observations
    for (const spec of ROUTINE) {
      for (const day of spec.days) {
        if (suppressedScreen(r.id, spec.category, day, spec.time)) continue;
        const k = `${r.id}:${spec.category}:${day}`;
        if (rand(`${k}:missing`) < spec.missingRate) continue; // no record: missing, not negative
        const notAssessed = spec.notAssessedRate !== undefined && rand(`${k}:na`) < spec.notAssessedRate;
        const observedAt = at(day, spec.time);
        out.push({
          id: `o-rt-${r.id}-${spec.category}-${day}`,
          residentId: r.id,
          category: spec.category,
          value: notAssessed ? 'Not checked overnight (staffing)' : spec.value,
          flag: notAssessed ? 'not_assessed' : 'normal',
          observedAt,
          recordedAt: addMinutes(observedAt, 30 + Math.floor(rand(`${k}:lag`) * 90)),
          recordedBy: spec.byAide ? aide : nurse,
          sourceType: spec.sourceType,
          sourceId: `handover-${r.unit}-${dayKey(observedAt)}`,
          status: 'observed',
          reviewedBy: null,
        });
      }
    }
  }
  return [...out, ...STORY_OBSERVATIONS].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

export const BASE_OBSERVATIONS: Observation[] = build();

// Sanity reference for tests.
export const STORY_GI = STORY.gi;
