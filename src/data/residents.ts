import type { BaselineEntry, Resident, UnitId } from '@/types';
import { rand } from '@/lib/random';
import { UNIT_AIDE, UNIT_NURSE } from './staff';

// 48 fictional residents. Names are invented; any resemblance to real people is coincidental.
const NAMES: [string, string, 'F' | 'M', number][] = [
  // Unit A (rooms 101–112)
  ['Agnes', 'Whitaker', 'F', 88], ['Eleanor', 'Brooks', 'F', 91], ['Clarence', 'Dunn', 'M', 79], ['Margaret', 'Chen', 'F', 84],
  ['Vivian', 'Hale', 'F', 86], ['Leonard', 'Sato', 'M', 82], ['Harold', 'Bennett', 'M', 87], ['Ida', 'Romano', 'F', 93],
  ['Peter', 'Lindqvist', 'M', 80], ['Joseph', 'Rossi', 'M', 85], ['Marion', 'Fitzgerald', 'F', 89], ['Stanley', 'Abara', 'M', 78],
  // Unit B (rooms 201–212)
  ['Beatrice', 'Lam', 'F', 90], ['Howard', 'Greene', 'M', 83], ['Frank', 'Morales', 'M', 86], ['Gloria', 'Novak', 'F', 81],
  ['Edwin', 'Park', 'M', 92], ['Irene', 'Walsh', 'F', 88], ['Louis', 'Mbeki', 'M', 77], ['Rosa', 'Delgado', 'F', 84],
  ['George', 'Patel', 'M', 89], ['Norma', 'Ellison', 'F', 95], ['Albert', 'Kowal', 'M', 80], ['Hazel', 'Turner', 'F', 87],
  // Unit C (rooms 301–312)
  ['Wilfred', 'Osei', 'M', 84], ['Dorothy', 'Price', 'F', 90], ['Mabel', 'Jensen', 'F', 82], ['Samuel', 'Ortiz', 'M', 79],
  ['Florence', 'Ng', 'F', 94], ['Walter', 'Fischer', 'M', 88], ['Evelyn', 'Moore', 'F', 85], ['Bernard', 'Laurent', 'M', 81],
  ['June', 'Takahashi', 'F', 86], ['Lillian', 'Hughes', 'F', 91], ['Ernest', 'Vega', 'M', 83], ['Pauline', 'Murray', 'F', 80],
  // Unit D (rooms 401–412)
  ['Cecil', 'Grant', 'M', 87], ['Ruth', 'Thompson', 'F', 89], ['Gordon', 'Byrne', 'M', 76], ['Doris', 'Achebe', 'F', 92],
  ['Milton', 'Svensson', 'M', 84], ['Opal', 'Reyes-Hart', 'F', 83], ['Arthur', 'Kim', 'M', 90], ['Lorraine', 'Baptiste', 'F', 86],
  ['Victor', 'Haddad', 'M', 81], ['Raymond', 'Clarke', 'M', 88], ['Esther', 'Goldberg', 'F', 93], ['Theodore', 'Quinn', 'M', 79],
];

const UNITS: UnitId[] = ['A', 'B', 'C', 'D'];

const COGNITION = [
  'Oriented to person, place and time; follows conversation well',
  'Oriented ×3 with occasional word-finding pauses',
  'Mild baseline forgetfulness; oriented to person and place, uses calendar cues',
  'Oriented; enjoys reading and conversation',
];
const MOBILITY = [
  'Walks independently with rollator',
  'Walks with cane; standby assist on stairs',
  'Wheelchair for distance, transfers with one assist',
  'Independent ambulation, steady gait',
];
const SLEEP = [
  'Sleeps ~7 h, up once for toileting',
  'Light sleeper, settles after warm drink',
  'Sleeps through most nights',
  'Naps after lunch; sleeps 6–7 h overnight',
];
const MOOD = [
  'Cheerful, social at group activities',
  'Quiet, enjoys one-to-one visits',
  'Even mood; likes music programmes',
  'Friendly, occasionally anxious before appointments',
];

function pick<T>(arr: T[], key: string): T {
  return arr[Math.floor(rand(key) * arr.length)];
}

function baselineFor(id: string): Resident['baseline'] {
  const appetite = 75 + Math.floor(rand(`${id}:appetite`) * 4) * 5; // 75–90 %
  const entry = (summary: string, numeric?: number): BaselineEntry => (numeric === undefined ? { summary } : { summary, numeric });
  return {
    cognition: entry(pick(COGNITION, `${id}:cog`)),
    appetite: entry(`Typically eats ~${appetite}% of meals`, appetite),
    mobility: entry(pick(MOBILITY, `${id}:mob`)),
    sleep: entry(pick(SLEEP, `${id}:sleep`)),
    mood: entry(pick(MOOD, `${id}:mood`)),
  };
}

function build(): Resident[] {
  return NAMES.map(([firstName, lastName, sex, age], i) => {
    const unit = UNITS[Math.floor(i / 12)];
    const room = String((Math.floor(i / 12) + 1) * 100 + (i % 12) + 1);
    const id = `R-${1001 + i}`;
    const admittedYear = 2019 + Math.floor(rand(`${id}:adm`) * 6);
    const admittedMonth = 1 + Math.floor(rand(`${id}:admm`) * 12);
    return {
      id,
      firstName,
      lastName,
      age,
      sex,
      unit,
      room,
      assignedNurseId: UNIT_NURSE[unit],
      careTeam: [UNIT_NURSE[unit], UNIT_AIDE[unit], 's-grace'],
      admittedOn: `${admittedYear}-${String(admittedMonth).padStart(2, '0')}-15`,
      baseline: baselineFor(id),
    };
  });
}

export const RESIDENTS: Resident[] = (() => {
  const list = build();
  const byId = (id: string) => list.find((r) => r.id === id)!;
  // Hand-authored baselines for story residents.
  const m = byId('R-1004');
  m.preferredName = 'Maggie';
  m.baseline = {
    cognition: { summary: 'Oriented ×3; completes the daily crossword; independent with routine' },
    appetite: { summary: 'Typically eats ~85% of meals; enjoys breakfast most', numeric: 85 },
    mobility: { summary: 'Walks independently with rollator' },
    sleep: { summary: 'Sleeps ~7 h, up once for toileting' },
    mood: { summary: 'Cheerful, social at music and crafts' },
  };
  return list;
})();

export const RESIDENT_BY_ID: Record<string, Resident> = Object.fromEntries(RESIDENTS.map((r) => [r.id, r]));

export function residentName(id: string): string {
  const r = RESIDENT_BY_ID[id];
  return r ? `${r.firstName} ${r.lastName}` : id;
}

export const STORY = {
  margaret: 'R-1004',
  gi: ['R-1007', 'R-1026', 'R-1030', 'R-1038', 'R-1043'],
  giAttendees: ['R-1007', 'R-1026', 'R-1030', 'R-1038'],
  giNonAttendee: 'R-1043',
  resp: ['R-1015', 'R-1018', 'R-1021'],
  individual: ['R-1002', 'R-1010', 'R-1013', 'R-1028', 'R-1034', 'R-1046'],
  unknownAttendance: ['R-1009', 'R-1040'],
} as const;
