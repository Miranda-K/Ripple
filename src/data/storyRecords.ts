// Hand-authored synthetic story records: the care notes and the structured
// observations that were documented from them. These drive the demo scenarios.
import type { ClinicalEvent, Note, Observation, ObservationCategory, ObservationFlag, SourceType, ObservationStatus } from '@/types';
import { at, addMinutes } from '@/lib/time';

interface NoteSpec {
  id: string;
  residentId: string;
  text: string;
  eventTime: string;
  recordedAfterMin: number;
  authorId: string;
  sourceType?: SourceType;
  obs?: { category: ObservationCategory; value: string; flag?: ObservationFlag; numeric?: number; observedAt?: string; status?: ObservationStatus }[];
}

const SPECS: NoteSpec[] = [
  // ---------- GI cluster ----------
  {
    id: 'n-101', residentId: 'R-1007', eventTime: at(-2, '21:00'), recordedAfterMin: 70, authorId: 's-tom',
    text: 'Harold vomited once at about 9 pm and said his stomach was cramping. Changed bedding, encouraged sips of water.',
    obs: [{ category: 'gi', value: 'Vomiting ×1 with abdominal cramping' }],
  },
  {
    id: 'n-102', residentId: 'R-1007', eventTime: at(-1, '03:00'), recordedAfterMin: 210, authorId: 's-priya',
    text: 'Two loose stools overnight. Temp 37.6. Taking fluids well. Stool sample requested per facility protocol.',
    obs: [{ category: 'gi', value: 'Loose stools ×2 overnight', status: 'observed' }],
  },
  {
    id: 'n-103', residentId: 'R-1026', eventTime: at(-1, '02:00'), recordedAfterMin: 40, authorId: 's-lena',
    text: 'Dorothy rang the bell feeling nauseous and vomited a small amount. Settled after about 30 minutes.',
    obs: [{ category: 'gi', value: 'Nausea and vomiting (small amount)' }],
  },
  {
    id: 'n-104', residentId: 'R-1038', eventTime: at(-1, '07:30'), recordedAfterMin: 45, authorId: 's-james',
    text: 'Ruth reports loose stools since early morning. Ate a little toast at breakfast. No fever.',
    obs: [
      { category: 'gi', value: 'Loose stools since early morning', status: 'observed' },
      { category: 'fever', value: 'No fever documented', flag: 'normal', status: 'observed' },
    ],
  },
  {
    id: 'n-105', residentId: 'R-1030', eventTime: at(-1, '15:00'), recordedAfterMin: 40, authorId: 's-sofia',
    text: 'Walter had diarrhea twice this afternoon, temp 37.9. Looks a bit pale; encouraging fluids.',
    obs: [
      { category: 'gi', value: 'Diarrhea ×2', status: 'observed' },
      { category: 'fever', value: 'Temperature 37.9 °C', status: 'observed' },
    ],
  },
  {
    id: 'n-106', residentId: 'R-1043', eventTime: at(-1, '22:00'), recordedAfterMin: 140, authorId: 's-lena',
    text: 'Arthur nauseous at bedtime and vomited once. Note: he had Thursday lunch on a tray in his room and did not go to the dining room.',
    obs: [{ category: 'gi', value: 'Nausea, vomiting ×1' }],
  },
  // ---------- Respiratory cluster (Unit B) ----------
  {
    id: 'n-201', residentId: 'R-1015', eventTime: at(-3, '14:00'), recordedAfterMin: 65, authorId: 's-daniel',
    text: 'Frank has a new wet cough this afternoon, temp 38.1. Chest sounds congested on auscultation.',
    obs: [
      { category: 'respiratory', value: 'New wet cough, congested chest', status: 'observed' },
      { category: 'fever', value: 'Temperature 38.1 °C', status: 'observed' },
    ],
  },
  {
    id: 'n-202', residentId: 'R-1015', eventTime: at(-2, '10:30'), recordedAfterMin: 30, authorId: 's-daniel',
    text: 'Seen by attending physician. Advised monitoring, fluids, and repeat vitals every shift. Cough persists, less congested.',
    obs: [{ category: 'respiratory', value: 'Cough persists, less congested', status: 'confirmed' }],
  },
  {
    id: 'n-203', residentId: 'R-1018', eventTime: at(-2, '09:00'), recordedAfterMin: 45, authorId: 's-tom',
    text: 'Irene complaining of a sore throat and runny nose this morning. Her daughter visited on Tuesday and mentioned she had a cold.',
    obs: [{ category: 'respiratory', value: 'Sore throat and runny nose' }],
  },
  {
    id: 'n-204', residentId: 'R-1021', eventTime: at(-1, '18:00'), recordedAfterMin: 70, authorId: 's-daniel',
    text: 'George coughing during dinner and a little short of breath walking back to his room. O2 sat 94% on room air.',
    obs: [{ category: 'respiratory', value: 'Cough and mild shortness of breath on exertion', status: 'observed' }],
  },
  // ---------- Margaret (Scenario B, before the live note) ----------
  {
    id: 'n-301', residentId: 'R-1004', eventTime: at(-1, '18:30'), recordedAfterMin: 50, authorId: 's-tom',
    text: 'Maggie seemed a bit muddled at dinner and asked twice what day it was. Only ate about 40% of her dinner, which is unusual for her.',
    obs: [{ category: 'cognition', value: 'Asked repeatedly what day it was (new for her)' }],
  },
  // ---------- Individual changes ----------
  {
    id: 'n-401', residentId: 'R-1002', eventTime: at(-1, '07:10'), recordedAfterMin: 35, authorId: 's-priya', sourceType: 'incident_report',
    text: 'Found sitting on floor beside bed at 07:10, no visible injury. States she slipped while getting up. Neuro checks started; physician notified.',
    obs: [{ category: 'mobility', value: 'Fall — found on floor beside bed, no visible injury', status: 'observed' }],
  },
  {
    id: 'n-402', residentId: 'R-1002', eventTime: at(0, '06:00'), recordedAfterMin: 40, authorId: 's-tom',
    text: 'Eleanor unsteady on transfer this morning and needed two staff to assist to the chair.',
    obs: [{ category: 'mobility', value: 'Unsteady transfer, two-person assist needed' }],
  },
  {
    id: 'n-411', residentId: 'R-1010', eventTime: at(-2, '03:00'), recordedAfterMin: 180, authorId: 's-tom',
    text: 'Joseph up most of the night walking the hallway; redirected three times.',
    obs: [{ category: 'sleep', value: 'Up most of the night, redirected ×3' }],
  },
  {
    id: 'n-412', residentId: 'R-1010', eventTime: at(-1, '02:30'), recordedAfterMin: 200, authorId: 's-tom',
    text: 'Awake from 1 am, restless and calling out. Settled around 4 am with a warm drink.',
    obs: [{ category: 'sleep', value: 'Awake 01:00–04:00, restless' }],
  },
  {
    id: 'n-421', residentId: 'R-1013', eventTime: at(-1, '12:45'), recordedAfterMin: 30, authorId: 's-tom',
    text: 'Beatrice pushing food away at lunch; says nothing tastes right. Accepted a nutritional shake.',
  },
  {
    id: 'n-431', residentId: 'R-1028', eventTime: at(-2, '16:00'), recordedAfterMin: 60, authorId: 's-lena',
    text: 'Samuel tearful after a phone call and declined afternoon activities.',
    obs: [{ category: 'mood', value: 'Tearful, declined activities' }],
  },
  {
    id: 'n-432', residentId: 'R-1028', eventTime: at(-1, '11:00'), recordedAfterMin: 45, authorId: 's-sofia',
    text: 'Withdrawn, stayed in his room all morning and was unusually short with staff.',
    obs: [{ category: 'mood', value: 'Withdrawn, irritable with staff', status: 'observed' }],
  },
  {
    id: 'n-441', residentId: 'R-1034', eventTime: at(-2, '20:00'), recordedAfterMin: 50, authorId: 's-lena',
    text: 'Lillian disoriented this evening and thought she was at her old home. Reassured and settled.',
    obs: [{ category: 'cognition', value: 'Disoriented to place in the evening' }],
  },
  {
    id: 'n-442', residentId: 'R-1034', eventTime: at(-1, '10:00'), recordedAfterMin: 30, authorId: 's-sofia',
    text: 'Confused about the time of day; needed reorientation twice during morning care.',
    obs: [{ category: 'cognition', value: 'Confused about time of day, reoriented ×2', status: 'observed' }],
  },
  {
    id: 'n-451', residentId: 'R-1046', eventTime: at(-2, '14:00'), recordedAfterMin: 60, authorId: 's-lena',
    text: 'Raymond needed more help than usual standing up from his chair.',
    obs: [{ category: 'mobility', value: 'Needed more help standing from chair' }],
  },
  {
    id: 'n-452', residentId: 'R-1046', eventTime: at(-1, '09:30'), recordedAfterMin: 40, authorId: 's-james',
    text: 'Shuffling gait this morning; needed extra assistance walking to the bathroom.',
    obs: [{ category: 'mobility', value: 'Shuffling gait, extra assistance to bathroom', status: 'observed' }],
  },
  // ---------- Routine notes (no structured changes) ----------
  { id: 'n-501', residentId: 'R-1001', eventTime: at(-3, '15:00'), recordedAfterMin: 30, authorId: 's-tom', text: 'Agnes enjoyed the chair yoga session and chatted with her neighbour afterwards.' },
  { id: 'n-502', residentId: 'R-1016', eventTime: at(-2, '13:30'), recordedAfterMin: 20, authorId: 's-daniel', text: 'Gloria had a visit from her grandson; in good spirits.' },
  { id: 'n-503', residentId: 'R-1031', eventTime: at(-1, '16:00'), recordedAfterMin: 25, authorId: 's-sofia', text: 'Evelyn painted at the craft table, ate well at lunch.' },
  { id: 'n-504', residentId: 'R-1004', eventTime: at(-4, '14:30'), recordedAfterMin: 30, authorId: 's-tom', text: 'Maggie led the sing-along at music circle and finished her crossword before lunch.' },
  { id: 'n-505', residentId: 'R-1041', eventTime: at(-2, '10:00'), recordedAfterMin: 20, authorId: 's-james', text: 'Milton walked to the garden with his cane; steady on his feet.' },
];

function build() {
  const notes: Note[] = [];
  const observations: Observation[] = [];
  for (const s of SPECS) {
    const createdAt = addMinutes(s.eventTime, s.recordedAfterMin);
    const sourceType: SourceType = s.sourceType ?? 'care_note';
    const obsIds: string[] = [];
    (s.obs ?? []).forEach((o, i) => {
      const id = `o-${s.id}-${i}`;
      obsIds.push(id);
      observations.push({
        id,
        residentId: s.residentId,
        category: o.category,
        value: o.value,
        flag: o.flag ?? 'change',
        numeric: o.numeric,
        observedAt: o.observedAt ?? s.eventTime,
        recordedAt: createdAt,
        recordedBy: s.authorId,
        sourceType,
        sourceId: s.id,
        status: o.status ?? 'reported',
        reviewedBy: o.status === 'confirmed' ? 's-grace' : null,
      });
    });
    notes.push({
      id: s.id,
      residentId: s.residentId,
      originalText: s.text,
      editedText: s.text,
      inputMode: 'imported',
      sourceType,
      eventTime: s.eventTime,
      createdAt,
      authorId: s.authorId,
      reviewerId: obsIds.length ? s.authorId : null,
      observationIds: obsIds,
    });
  }
  return { notes, observations };
}

const built = build();
export const SEED_NOTES: Note[] = built.notes;
export const STORY_OBSERVATIONS: Observation[] = built.observations;

/** Meal intake overrides: residentId -> "dayOffset|slot" -> % eaten. */
export const MEAL_OVERRIDES: Record<string, Record<string, number>> = {
  'R-1004': { '-1|dinner': 40, '-1|lunch': 75, '-1|breakfast': 85 },
  'R-1013': { '-1|lunch': 40, '-1|dinner': 35, '-1|breakfast': 70 },
  'R-1038': { '-1|breakfast': 55, '-1|lunch': 60 },
  'R-1007': { '-1|breakfast': 60 },
};

export const SEED_EVENTS: ClinicalEvent[] = [
  { id: 'e-1', residentId: 'R-1007', type: 'vitals', description: 'Temperature 37.6 °C, BP 128/76, HR 88', occurredAt: at(-1, '06:00'), recordedAt: at(-1, '06:20'), recordedBy: 's-priya', sourceType: 'vitals' },
  { id: 'e-2', residentId: 'R-1007', type: 'lab_request', description: 'Stool sample requested per facility protocol (no result yet)', occurredAt: at(-1, '06:30'), recordedAt: at(-1, '06:35'), recordedBy: 's-priya', sourceType: 'care_note' },
  { id: 'e-3', residentId: 'R-1030', type: 'vitals', description: 'Temperature 37.9 °C, HR 92', occurredAt: at(-1, '15:05'), recordedAt: at(-1, '15:40'), recordedBy: 's-sofia', sourceType: 'vitals' },
  { id: 'e-4', residentId: 'R-1015', type: 'vitals', description: 'Temperature 38.1 °C, RR 20, O2 sat 95%', occurredAt: at(-3, '14:10'), recordedAt: at(-3, '15:05'), recordedBy: 's-daniel', sourceType: 'vitals' },
  { id: 'e-5', residentId: 'R-1015', type: 'physician_visit', description: 'Attending physician review — monitor, fluids, vitals each shift', occurredAt: at(-2, '10:30'), recordedAt: at(-2, '11:00'), recordedBy: 's-daniel', sourceType: 'care_note' },
  { id: 'e-6', residentId: 'R-1021', type: 'vitals', description: 'O2 sat 94% on room air, RR 22', occurredAt: at(-1, '18:10'), recordedAt: at(-1, '19:10'), recordedBy: 's-daniel', sourceType: 'vitals' },
  { id: 'e-7', residentId: 'R-1002', type: 'fall', description: 'Unwitnessed fall at bedside; no visible injury; neuro checks started', occurredAt: at(-1, '07:10'), recordedAt: at(-1, '07:45'), recordedBy: 's-priya', sourceType: 'incident_report' },
  { id: 'e-8', residentId: 'R-1004', type: 'family_contact', description: 'Daughter phoned: “Mum sounded tired and a bit mixed up on the phone.”', occurredAt: at(-1, '19:00'), recordedAt: at(-1, '19:25'), recordedBy: 's-tom', sourceType: 'care_note' },
  { id: 'e-9', residentId: 'R-1010', type: 'medication_change', description: 'Evening medication administration time moved from 21:00 to 20:00 (scheduling)', occurredAt: at(-4, '09:00'), recordedAt: at(-4, '09:15'), recordedBy: 's-priya', sourceType: 'mar' },
  { id: 'e-10', residentId: 'R-1004', type: 'vitals', description: 'Routine vitals: Temperature 36.8 °C, BP 134/80, HR 76', occurredAt: at(-2, '08:30'), recordedAt: at(-2, '08:45'), recordedBy: 's-priya', sourceType: 'vitals' },
];
