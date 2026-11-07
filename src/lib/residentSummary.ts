import type { IndividualChange, Observation, ObservationCategory, PatternCluster, Resident } from '@/types';
import { withinHours } from './time';

export type ChangeStatus = 'changed' | 'pattern' | 'stable' | 'missing';

export interface ResidentSummary {
  resident: Resident;
  lastObservation?: Observation;
  changeDomains: ObservationCategory[];
  patternIds: string[];
  patternDomains: ('gi' | 'respiratory')[];
  missingDomains: ObservationCategory[];
  statuses: ChangeStatus[];
}

const CORE: ObservationCategory[] = ['cognition', 'mobility', 'sleep', 'appetite'];

export function summarize(residents: Resident[], observations: Observation[], changes: IndividualChange[], clusters: PatternCluster[], now: string): ResidentSummary[] {
  const byRes = new Map<string, Observation[]>();
  for (const o of observations) {
    if (o.observedAt > now) continue;
    (byRes.get(o.residentId) ?? byRes.set(o.residentId, []).get(o.residentId)!).push(o);
  }
  return residents.map((r) => {
    const list = byRes.get(r.id) ?? [];
    const last = list.reduce<Observation | undefined>((acc, o) => (!acc || o.observedAt > acc.observedAt ? o : acc), undefined);
    const change = changes.find((c) => c.residentId === r.id);
    const pats = clusters.filter((c) => c.residentIds.includes(r.id));
    const missingDomains = CORE.filter((c) => !list.some((o) => o.category === c && o.flag !== 'not_assessed' && withinHours(o.observedAt, 36, now)));
    const statuses: ChangeStatus[] = [];
    if (change) statuses.push('changed');
    if (pats.length) statuses.push('pattern');
    if (missingDomains.length) statuses.push('missing');
    if (!change && !pats.length) statuses.push('stable');
    return {
      resident: r,
      lastObservation: last,
      changeDomains: change?.domains ?? [],
      patternIds: pats.map((p) => p.id),
      patternDomains: pats.map((p) => p.domain),
      missingDomains,
      statuses,
    };
  });
}
