// Deterministic, transparent analytics. No machine learning, no risk scores:
// every flag is produced by a named rule that is shown to the user.
import type {
  Exposure,
  ExposureComparison,
  IndividualChange,
  Observation,
  ObservationCategory,
  PatternCluster,
  RecoveryRecord,
  Resident,
  ResidentExposure,
  UnitId,
} from '@/types';
import { DEMO_NOW, at, dayKey, parse, withinHours } from './time';

export const CURRENT_WINDOW_HOURS = 72;
export const CLUSTER_WINDOW_HOURS = 72;
export const CLUSTER_MIN_RESIDENTS = 3;
export const LOW_INTAKE_PCT = 50;

export const RULES: Record<string, string> = {
  cognition: '≥2 documented cognition changes within 72 h (baseline is the resident’s usual orientation)',
  mood: '≥2 documented mood/behaviour changes within 72 h',
  sleep: '≥2 documented disrupted nights within 72 h',
  mobility: '≥1 documented fall, or ≥2 documented mobility declines within 72 h',
  appetite: `≥2 of the 3 most recent intake records below ${LOW_INTAKE_PCT}%`,
  cluster: `≥${CLUSTER_MIN_RESIDENTS} residents with a new symptom onset in the same domain within ${CLUSTER_WINDOW_HOURS} h (grouped by unit first, then facility-wide)`,
};

export const CATEGORY_LABEL: Record<ObservationCategory, string> = {
  cognition: 'Cognition',
  appetite: 'Appetite',
  mobility: 'Mobility',
  sleep: 'Sleep',
  mood: 'Mood / behaviour',
  gi: 'Gastrointestinal',
  respiratory: 'Respiratory',
  fever: 'Temperature',
};

const UNITS: UnitId[] = ['A', 'B', 'C', 'D'];

function byResident(observations: Observation[]): Map<string, Observation[]> {
  const m = new Map<string, Observation[]>();
  for (const o of observations) {
    const list = m.get(o.residentId);
    if (list) list.push(o);
    else m.set(o.residentId, [o]);
  }
  return m;
}

const isPast = (o: Observation, now: string) => parse(o.observedAt) <= parse(now);

export function detectIndividualChanges(observations: Observation[], residents: Resident[], now: string = DEMO_NOW): IndividualChange[] {
  const grouped = byResident(observations);
  const out: IndividualChange[] = [];
  for (const r of residents) {
    const all = (grouped.get(r.id) ?? []).filter((o) => isPast(o, now));
    const recent = all.filter((o) => withinHours(o.observedAt, CURRENT_WINDOW_HOURS, now));
    const domains: ObservationCategory[] = [];
    const reasons: string[] = [];
    const evidence: Observation[] = [];
    const changes = (c: ObservationCategory) => recent.filter((o) => o.category === c && o.flag === 'change');

    for (const c of ['cognition', 'mood', 'sleep'] as const) {
      const ch = changes(c);
      if (ch.length >= 2) {
        domains.push(c);
        reasons.push(`${CATEGORY_LABEL[c]}: ${ch.length} documented changes in the last 72 h (rule: ${RULES[c]}). Baseline: “${r.baseline[c].summary}”.`);
        evidence.push(...ch);
      }
    }
    const mob = changes('mobility');
    const falls = mob.filter((o) => /\bfall\b|\bfell\b/i.test(o.value));
    if (falls.length >= 1 || mob.length >= 2) {
      domains.push('mobility');
      reasons.push(
        `Mobility: ${falls.length ? `${falls.length} documented fall${falls.length > 1 ? 's' : ''}` : ''}${falls.length && mob.length > falls.length ? ' and ' : ''}${mob.length > falls.length ? `${mob.length - falls.length} documented decline${mob.length - falls.length > 1 ? 's' : ''}` : ''} in the last 72 h (rule: ${RULES.mobility}). Baseline: “${r.baseline.mobility.summary}”.`,
      );
      evidence.push(...mob);
    }
    const intake = all
      .filter((o) => o.category === 'appetite' && typeof o.numeric === 'number')
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
      .slice(0, 3);
    const low = intake.filter((o) => (o.numeric ?? 100) < LOW_INTAKE_PCT);
    if (intake.length >= 2 && low.length >= 2 && low.some((o) => withinHours(o.observedAt, CURRENT_WINDOW_HOURS, now))) {
      domains.push('appetite');
      reasons.push(
        `Appetite: ${low.length} of the ${intake.length} most recent intake records were below ${LOW_INTAKE_PCT}% (${low.map((o) => `${o.numeric}%`).join(', ')}) vs. baseline ~${r.baseline.appetite.numeric ?? '—'}%.`,
      );
      evidence.push(...low);
    }
    if (domains.length) {
      const first = evidence.map((o) => o.observedAt).sort()[0];
      out.push({ key: `ind:${r.id}`, residentId: r.id, domains, reasons, evidenceIds: [...new Set(evidence.map((o) => o.id))], firstObservedAt: first });
    }
  }
  return out;
}

export interface Onset {
  residentId: string;
  onsetAt: string;
  observationId: string;
}

/** First documented change in a domain within the lookback, with no change in the 7 days before it. */
export function symptomOnsets(
  observations: Observation[],
  domain: ObservationCategory,
  now: string = DEMO_NOW,
  lookbackDays = 7,
  recoveryRecords: RecoveryRecord[] = [],
): Onset[] {
  const grouped = byResident(observations.filter((o) => o.category === domain && o.flag === 'change' && isPast(o, now)));
  const out: Onset[] = [];
  const start = parse(now) - lookbackDays * 86_400_000;
  for (const [residentId, list] of grouped) {
    const latestRecovery = recoveryRecords
      .filter((record) => record.residentId === residentId && record.domain === domain)
      .reduce<string | null>((latest, record) => (latest === null || record.recoveredAt > latest ? record.recoveredAt : latest), null);
    const sorted = [...list]
      .filter((observation) => !latestRecovery || observation.observedAt > latestRecovery)
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
    for (const o of sorted) {
      const t = parse(o.observedAt);
      if (t < start) continue;
      const prior = sorted.some((p) => parse(p.observedAt) < t && t - parse(p.observedAt) <= 7 * 86_400_000);
      if (!prior) {
        out.push({ residentId, onsetAt: o.observedAt, observationId: o.id });
      }
      break;
    }
  }
  return out.sort((a, b) => a.onsetAt.localeCompare(b.onsetAt));
}

function bestWindow(onsets: Onset[]): Onset[] {
  let best: Onset[] = [];
  for (let i = 0; i < onsets.length; i++) {
    const group = onsets.filter((o) => {
      const d = parse(o.onsetAt) - parse(onsets[i].onsetAt);
      return d >= 0 && d <= CLUSTER_WINDOW_HOURS * 3_600_000;
    });
    if (group.length > best.length) best = group;
  }
  return best;
}

const DOMAIN_TITLE: Record<'gi' | 'respiratory', string> = { gi: 'Gastrointestinal symptoms', respiratory: 'Respiratory symptoms' };

export function detectClusters(
  observations: Observation[],
  residents: Resident[],
  now: string = DEMO_NOW,
  recoveryRecords: RecoveryRecord[] = [],
): PatternCluster[] {
  const unitOf = new Map(residents.map((r) => [r.id, r.unit]));
  const out: PatternCluster[] = [];
  for (const domain of ['gi', 'respiratory'] as const) {
    const onsets = symptomOnsets(observations, domain, now, 7, recoveryRecords);
    const latestRecoveryByResident = new Map<string, string>();
    recoveryRecords
      .filter((record) => record.domain === domain)
      .forEach((record) => {
        const previous = latestRecoveryByResident.get(record.residentId);
        if (!previous || record.recoveredAt > previous) latestRecoveryByResident.set(record.residentId, record.recoveredAt);
      });
    const used = new Set<string>();
    const make = (group: Onset[], scope: PatternCluster['scope']) => {
      const ids = group.map((g) => g.residentId);
      const dist = Object.fromEntries(UNITS.map((u) => [u, 0])) as Record<UnitId, number>;
      ids.forEach((id) => {
        const u = unitOf.get(id);
        if (u) dist[u] += 1;
      });
      const unitsInvolved = UNITS.filter((u) => dist[u] > 0).length;
      const evidence = observations.filter(
        (o) =>
          ids.includes(o.residentId) &&
          (o.category === domain || o.category === 'fever') &&
          o.flag === 'change' &&
          (!latestRecoveryByResident.has(o.residentId) || o.observedAt > latestRecoveryByResident.get(o.residentId)!) &&
          withinHours(o.observedAt, 7 * 24, now),
      );
      out.push({
        id: `pattern-${domain}-${scope === 'facility' ? 'facility' : `unit-${scope}`}`,
        domain,
        scope,
        title:
          scope === 'facility'
            ? `${DOMAIN_TITLE[domain]} — ${ids.length} residents across ${unitsInvolved} units`
            : `${DOMAIN_TITLE[domain]} — ${ids.length} residents on Unit ${scope}`,
        residentIds: ids,
        onsets: group,
        firstOnset: group[0].onsetAt,
        lastOnset: group[group.length - 1].onsetAt,
        unitDistribution: dist,
        evidenceIds: evidence.map((o) => o.id),
      });
      ids.forEach((id) => used.add(id));
    };
    for (const u of UNITS) {
      const g = bestWindow(onsets.filter((o) => unitOf.get(o.residentId) === u));
      if (g.length >= CLUSTER_MIN_RESIDENTS) make(g, u);
    }
    const rest = bestWindow(onsets.filter((o) => !used.has(o.residentId)));
    if (rest.length >= CLUSTER_MIN_RESIDENTS) make(rest, 'facility');
  }
  return out;
}

export const rate = (num: number, den: number): number | null => (den > 0 ? num / den : null);

export function compareExposure(
  exposure: Exposure,
  symptomatic: Set<string>,
  residentExposures: ResidentExposure[],
  population: Resident[],
): ExposureComparison {
  const att = new Map<string, ResidentExposure['attendance']>();
  residentExposures.filter((re) => re.exposureId === exposure.id).forEach((re) => att.set(re.residentId, re.attendance));
  let es = 0, et = 0, us = 0, ut = 0, ks = 0, kt = 0;
  for (const r of population) {
    const a = att.get(r.id) ?? 'unknown';
    const s = symptomatic.has(r.id) ? 1 : 0;
    if (a === 'attended') { et++; es += s; }
    else if (a === 'absent') { ut++; us += s; }
    else { kt++; ks += s; }
  }
  const exposedRate = rate(es, et);
  const unexposedRate = rate(us, ut);
  const caveats: string[] = [];
  if (Math.min(es, et - es, us, ut - us) < 5) caveats.push('Small numbers: at least one cell of the comparison has fewer than 5 residents, so rates are unstable.');
  if (kt > 0) caveats.push(`${kt} resident${kt > 1 ? 's have' : ' has'} unknown attendance and ${kt > 1 ? 'are' : 'is'} excluded from both denominators${ks ? ` (${ks} of them symptomatic)` : ''}.`);
  if (unexposedRate === 0) caveats.push('No symptomatic residents in the comparison group, so a rate ratio cannot be calculated.');
  return {
    exposure,
    exposedSymptomatic: es,
    exposedTotal: et,
    unexposedSymptomatic: us,
    unexposedTotal: ut,
    unknownSymptomatic: ks,
    unknownTotal: kt,
    exposedRate,
    unexposedRate,
    rateRatio: exposedRate !== null && unexposedRate ? exposedRate / unexposedRate : null,
    caveats,
  };
}

/** Compare every shared exposure in the 72 h before the first onset. */
export function exposureComparisons(
  cluster: PatternCluster,
  exposures: Exposure[],
  residentExposures: ResidentExposure[],
  residents: Resident[],
): ExposureComparison[] {
  const first = parse(cluster.firstOnset);
  const from = first - CLUSTER_WINDOW_HOURS * 3_600_000;
  const symptomatic = new Set(cluster.residentIds);
  return exposures
    .filter((e) => parse(e.start) < first && parse(e.end) >= from)
    .map((e) => compareExposure(e, symptomatic, residentExposures, residents))
    .filter((c) => c.exposedSymptomatic > 0)
    .sort((a, b) => {
      const da = (a.exposedRate ?? 0) - (a.unexposedRate ?? 0);
      const db = (b.exposedRate ?? 0) - (b.unexposedRate ?? 0);
      return db - da || b.exposedSymptomatic - a.exposedSymptomatic;
    });
}

/** Share of expected records present over the last `days` days (meals 3/day, others 1/day). */
export function completeness(observations: Observation[], residentId: string, category: ObservationCategory, now: string = DEMO_NOW, days = 3): number {
  const expectedPerDay = category === 'appetite' ? 3 : 1;
  const present = new Set(
    observations
      .filter((o) => o.residentId === residentId && o.category === category && o.flag !== 'not_assessed' && withinHours(o.observedAt, days * 24, now))
      .map((o) => (category === 'appetite' ? o.id : dayKey(o.observedAt))),
  );
  return Math.min(1, present.size / (expectedPerDay * days));
}

/** Residents with no record in a domain during the window (missing ≠ negative). */
export function residentsMissing(observations: Observation[], residents: Resident[], category: ObservationCategory, hours = 72, now: string = DEMO_NOW): string[] {
  const have = new Set(observations.filter((o) => o.category === category && withinHours(o.observedAt, hours, now)).map((o) => o.residentId));
  return residents.filter((r) => !have.has(r.id)).map((r) => r.id);
}

export function onsetsByDay(observations: Observation[], now: string = DEMO_NOW, days = 7) {
  const gi = symptomOnsets(observations, 'gi', now, days);
  const resp = symptomOnsets(observations, 'respiratory', now, days);
  const rows = [];
  for (let d = -(days - 1); d <= 0; d++) {
    const k = dayKey(at(d, '12:00'));
    rows.push({
      day: k,
      gi: gi.filter((o) => dayKey(o.onsetAt) === k).length,
      respiratory: resp.filter((o) => dayKey(o.onsetAt) === k).length,
    });
  }
  return rows;
}

export function unitHeatmap(observations: Observation[], residents: Resident[], now: string = DEMO_NOW, days = 7) {
  const unitOf = new Map(residents.map((r) => [r.id, r.unit]));
  const dayKeys: string[] = [];
  for (let d = -(days - 1); d <= 0; d++) dayKeys.push(dayKey(at(d, '12:00')));
  const cells: Record<UnitId, number[]> = { A: [], B: [], C: [], D: [] };
  for (const u of UNITS) {
    cells[u] = dayKeys.map(
      (k) => observations.filter((o) => o.flag === 'change' && unitOf.get(o.residentId) === u && dayKey(o.observedAt) === k && isPast(o, now)).length,
    );
  }
  return { dayKeys, cells };
}
