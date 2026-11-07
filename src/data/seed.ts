// Builds the initial (resettable) demo state from deterministic fixtures.
import type { Alert, AlertStatus, Assessment, AuditEvent, Note, Observation, PatternStatus, UserRole } from '@/types';
import { BASE_OBSERVATIONS } from './observations';
import { SEED_NOTES } from './storyRecords';
import { assessmentAlert, syncAlerts } from '@/lib/alerts';
import { ASSESSMENT_ITEMS } from '@/lib/assessmentItems';
import { DEMO_NOW, addMinutes, at } from '@/lib/time';

export interface SeedState {
  role: UserRole;
  notes: Note[];
  userObservations: Observation[];
  alerts: Alert[];
  assessments: Assessment[];
  audit: AuditEvent[];
  patternStatus: Record<string, PatternStatus>;
  clockOffset: number;
  scenario: 'base' | 'A' | 'B';
}

function responses(map: Record<string, 'yes' | 'no' | 'not_assessed'>, observer: string, eventTime: string) {
  return Object.fromEntries(
    ASSESSMENT_ITEMS.filter((i) => map[i.id]).map((i) => [i.id, { answer: map[i.id], observer, eventTime }]),
  );
}
const allNo = Object.fromEntries(ASSESSMENT_ITEMS.map((i) => [i.id, 'no' as const]));

function seedAssessments(): Assessment[] {
  return [
    {
      id: 'as-1', residentId: 'R-1034', status: 'needs_review', reason: 'Two documented episodes of disorientation in 24 h; behavioural review requested.',
      requestedBy: 's-sofia', requestedAt: at(-1, '11:00'), assignedTo: 's-amara', linkedAlertId: undefined,
      responses: responses({ 'att-1': 'yes', 'att-2': 'yes', 'slp-1': 'not_assessed', 'slp-2': 'yes', 'mood-1': 'no', 'mood-2': 'no', 'mob-1': 'no', 'mob-2': 'no', 'app-1': 'no', 'app-2': 'not_assessed', 'resp-1': 'no', 'resp-2': 'no', 'gi-1': 'no', 'gi-2': 'no', 'fn-1': 'yes', 'fn-2': 'no' }, 'Amara Bello', at(-1, '15:00')),
      updatedAt: at(-1, '15:30'), submittedBy: 's-amara', reviewRequired: true,
    },
    {
      id: 'as-2', residentId: 'R-1028', status: 'in_progress', reason: 'Withdrawn and tearful on two consecutive days.',
      requestedBy: 's-grace', requestedAt: at(-1, '12:00'), assignedTo: 's-amara',
      responses: responses({ 'att-1': 'no', 'att-2': 'no', 'mood-1': 'yes', 'mood-2': 'yes' }, 'Amara Bello', at(-1, '16:00')),
      updatedAt: at(-1, '16:10'),
    },
    {
      id: 'as-3', residentId: 'R-1010', status: 'not_started', reason: 'Night-time restlessness on two consecutive nights.',
      requestedBy: 's-priya', requestedAt: at(-1, '08:00'), assignedTo: 's-amara', responses: {}, updatedAt: at(-1, '08:00'),
    },
    {
      id: 'as-4', residentId: 'R-1002', status: 'not_started', reason: 'Post-fall review: unsteady transfers since unwitnessed fall.',
      requestedBy: 's-grace', requestedAt: at(0, '06:45'), assignedTo: 's-amara', responses: {}, updatedAt: at(0, '06:45'),
    },
    {
      id: 'as-5', residentId: 'R-1004', status: 'completed', reason: 'Quarterly baseline review.',
      requestedBy: 's-priya', requestedAt: '2026-10-14T09:00:00', assignedTo: 's-amara',
      responses: responses(allNo, 'Amara Bello', '2026-10-15T10:30:00'),
      updatedAt: '2026-10-15T11:00:00', submittedBy: 's-amara', signedOffBy: 's-priya', signedOffAt: '2026-10-15T14:00:00',
    },
    {
      id: 'as-6', residentId: 'R-1046', status: 'completed', reason: 'Quarterly baseline review.',
      requestedBy: 's-james', requestedAt: '2026-09-20T09:00:00', assignedTo: 's-amara',
      responses: responses({ ...allNo, 'mob-1': 'yes' }, 'Amara Bello', '2026-09-21T10:00:00'),
      updatedAt: '2026-09-21T10:30:00', submittedBy: 's-amara', signedOffBy: 's-james', signedOffAt: '2026-09-21T15:00:00',
    },
  ];
}

const SEED_ALERT_STATE: Record<string, { status: AlertStatus; assignedTo?: string; read: boolean }> = {
  'pat:pattern-gi-facility': { status: 'new', read: false },
  'pat:pattern-respiratory-unit-B': { status: 'in_review', assignedTo: 's-daniel', read: true },
  'ind:R-1002': { status: 'new', read: false },
  'ind:R-1010': { status: 'acknowledged', read: true },
  'ind:R-1013': { status: 'new', read: false },
  'ind:R-1028': { status: 'in_review', assignedTo: 's-sofia', read: true },
  'ind:R-1034': { status: 'in_review', assignedTo: 's-sofia', read: true },
  'ind:R-1046': { status: 'acknowledged', read: true },
};

export function buildSeed(): SeedState {
  let n = 0;
  const { alerts: detected } = syncAlerts([], BASE_OBSERVATIONS, DEMO_NOW, () => `al-${String(++n).padStart(3, '0')}`);
  const obsById = new Map(BASE_OBSERVATIONS.map((o) => [o.id, o]));
  const alerts: Alert[] = detected.map((a) => {
    const s = SEED_ALERT_STATE[a.key] ?? { status: 'new' as AlertStatus, read: false };
    const lastRecorded = a.evidenceIds.map((id) => obsById.get(id)?.recordedAt ?? a.firstObservedAt).sort().pop()!;
    return { ...a, status: s.status, assignedTo: s.assignedTo, read: s.read, createdAt: addMinutes(lastRecorded, 5) };
  });
  const assessments = seedAssessments();
  for (const a of assessments.filter((x) => x.status === 'not_started')) {
    alerts.push({ ...assessmentAlert(a), id: `al-${String(++n).padStart(3, '0')}`, status: 'new', read: a.id === 'as-3', followUps: [], createdAt: a.requestedAt });
  }
  alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const byKey = (k: string) => alerts.find((a) => a.key === k)!;
  const audit: AuditEvent[] = [];
  const log = (at_: string, actorId: string, actorRole: UserRole, action: string, targetType: AuditEvent['targetType'], targetId: string, detail?: string) =>
    audit.push({ id: `au-${audit.length + 1}`, at: at_, actorId, actorRole, action, targetType, targetId, detail });
  log(at(-2, '11:30'), 's-grace', 'head_nurse', 'Acknowledged', 'alert', byKey('pat:pattern-respiratory-unit-B').id);
  log(at(-2, '11:32'), 's-grace', 'head_nurse', 'Assigned to Daniel Okafor', 'alert', byKey('pat:pattern-respiratory-unit-B').id);
  log(at(-1, '08:20'), 's-priya', 'nurse', 'Acknowledged', 'alert', byKey('ind:R-1010').id);
  log(at(-1, '12:05'), 's-grace', 'head_nurse', 'Assigned to Sofia Alvarez', 'alert', byKey('ind:R-1028').id);
  log(at(-1, '11:05'), 's-grace', 'head_nurse', 'Assigned to Sofia Alvarez', 'alert', byKey('ind:R-1034').id);
  log(at(-1, '10:15'), 's-james', 'nurse', 'Acknowledged', 'alert', byKey('ind:R-1046').id);
  log(at(-1, '15:30'), 's-amara', 'assessor', 'Submitted assessment for sign-off', 'assessment', 'as-1', '2 items not assessed — review required');
  byKey('pat:pattern-respiratory-unit-B').followUps.push({
    id: 'fu-1', text: 'Droplet precautions started for Rooms 203 and 206 per unit protocol. Monitoring Unit B each shift.', authorId: 's-daniel', role: 'nurse', at: at(-2, '13:00'),
  });
  audit.sort((a, b) => b.at.localeCompare(a.at));

  return {
    role: 'head_nurse',
    notes: [...SEED_NOTES].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    userObservations: [],
    alerts,
    assessments,
    audit,
    patternStatus: { 'pattern-gi-facility': 'new', 'pattern-respiratory-unit-B': 'under_review' },
    clockOffset: 0,
    scenario: 'base',
  };
}
