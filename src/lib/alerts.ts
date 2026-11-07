// Turn deterministic detections into reviewable alerts (pure functions).
import type { Alert, Assessment, IndividualChange, Observation, PatternCluster, RecoveryRecord } from '@/types';
import { RESIDENT_BY_ID, RESIDENTS, residentName } from '@/data/residents';
import { EXPOSURES, RESIDENT_EXPOSURES } from '@/data/exposures';
import { CATEGORY_LABEL, completeness, detectClusters, detectIndividualChanges, exposureComparisons, residentsMissing, RULES } from './analytics';
import { fmtDateTime } from './time';

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

export function individualAlert(change: IndividualChange, observations: Observation[], now: string): Omit<Alert, 'id' | 'status' | 'read' | 'followUps' | 'createdAt'> {
  const r = RESIDENT_BY_ID[change.residentId];
  const evidence = observations.filter((o) => change.evidenceIds.includes(o.id));
  const reportedOnly = evidence.filter((o) => o.status === 'reported').length;
  const uncertainty: string[] = [];
  if (reportedOnly) uncertainty.push(`${reportedOnly} of ${evidence.length} supporting observations are “reported” and not yet confirmed by a nurse.`);
  for (const d of change.domains) {
    const c = completeness(observations, r.id, d, now);
    if (c < 0.7) uncertainty.push(`${CATEGORY_LABEL[d]} documentation is incomplete over the last 3 days (${Math.round(c * 100)}% of expected records).`);
  }
  uncertainty.push('No medical cause is implied; this flag only indicates a documented change from baseline.');
  const domains = change.domains.map((d) => CATEGORY_LABEL[d].toLowerCase()).join(' and ');
  return {
    key: change.key,
    type: 'individual_change',
    title: `${residentName(r.id)}: change in ${domains}`,
    summary: `${r.preferredName ?? r.firstName} (Room ${r.room}, Unit ${r.unit}) has documented changes in ${domains} compared with their usual baseline.`,
    residentIds: [r.id],
    evidenceIds: change.evidenceIds,
    firstObservedAt: change.firstObservedAt,
    whyFlagged: change.reasons.join(' '),
    uncertainty,
  };
}

export function patternAlert(cluster: PatternCluster, observations: Observation[], now: string): Omit<Alert, 'id' | 'status' | 'read' | 'followUps' | 'createdAt'> {
  const comps = exposureComparisons(cluster, EXPOSURES, RESIDENT_EXPOSURES, RESIDENTS);
  const top = comps[0];
  const missing = residentsMissing(observations, RESIDENTS, cluster.domain, 72, now).length;
  const uncertainty = [
    'Onset times reflect when symptoms were documented; true onset may be earlier.',
    `${missing} resident${missing === 1 ? ' has' : 's have'} no ${cluster.domain === 'gi' ? 'GI' : 'respiratory'} screen documented in the last 72 h — missing is not the same as symptom-free.`,
    'No laboratory results are available in this dataset.',
  ];
  if (top) uncertainty.push(...top.caveats);
  const exposureLine = top
    ? ` Most-shared recent exposure: ${top.exposure.name} (${top.exposedSymptomatic}/${top.exposedTotal} attendees symptomatic, ${pct(top.exposedRate)}, vs ${top.unexposedSymptomatic}/${top.unexposedTotal} non-attendees, ${pct(top.unexposedRate)}). Hypothesis for review — not a cause.`
    : '';
  return {
    key: `pat:${cluster.id}`,
    type: 'facility_pattern',
    title: cluster.title,
    summary: `${cluster.residentIds.length} residents had a new ${cluster.domain === 'gi' ? 'gastrointestinal' : 'respiratory'} symptom documented between ${fmtDateTime(cluster.firstOnset)} and ${fmtDateTime(cluster.lastOnset)}.${exposureLine}`,
    residentIds: cluster.residentIds,
    patternId: cluster.id,
    evidenceIds: cluster.evidenceIds,
    firstObservedAt: cluster.firstOnset,
    whyFlagged: `Rule: ${RULES.cluster}.`,
    uncertainty,
  };
}

export function assessmentAlert(a: Assessment): Omit<Alert, 'id' | 'status' | 'read' | 'followUps' | 'createdAt'> {
  return {
    key: `asmt:${a.id}`,
    type: 'assessment_request',
    title: `Assessment requested: ${residentName(a.residentId)}`,
    summary: a.reason,
    residentIds: [a.residentId],
    assessmentId: a.id,
    evidenceIds: [],
    firstObservedAt: a.requestedAt,
    whyFlagged: 'Requested by care team following a documented change.',
    uncertainty: ['Observation categories are DOS-inspired only; the form is not a validated scale and produces no score.'],
    assignedTo: a.assignedTo,
  };
}

export interface SyncResult {
  alerts: Alert[];
  created: Alert[];
  updated: Alert[];
}

/** Reconcile current detections with stored alerts without duplicating. */
export function syncAlerts(
  existing: Alert[],
  observations: Observation[],
  now: string,
  newId: () => string,
  recoveryRecords: RecoveryRecord[] = [],
): SyncResult {
  const changes = detectIndividualChanges(observations, RESIDENTS, now);
  const clusters = detectClusters(observations, RESIDENTS, now, recoveryRecords);
  const drafts = [...changes.map((c) => individualAlert(c, observations, now)), ...clusters.map((c) => patternAlert(c, observations, now))];
  const alerts = [...existing];
  const created: Alert[] = [];
  const updated: Alert[] = [];
  for (const d of drafts) {
    const idx = alerts.findIndex((a) => a.key === d.key && a.status !== 'resolved');
    if (idx === -1) {
      if (alerts.some((a) => a.key === d.key && a.status === 'resolved' && a.firstObservedAt >= d.firstObservedAt && a.evidenceIds.length >= d.evidenceIds.length)) continue;
      const alert: Alert = { ...d, id: newId(), status: 'new', read: false, followUps: [], createdAt: now };
      alerts.unshift(alert);
      created.push(alert);
    } else {
      const prev = alerts[idx];
      if (d.evidenceIds.length !== prev.evidenceIds.length || d.residentIds.length !== prev.residentIds.length) {
        const next: Alert = { ...prev, ...d, assignedTo: prev.assignedTo, read: false };
        alerts[idx] = next;
        updated.push(next);
      }
    }
  }
  return { alerts, created, updated };
}
