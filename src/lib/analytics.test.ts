import { describe, expect, it } from 'vitest';
import { BASE_OBSERVATIONS } from '@/data/observations';
import { RESIDENTS, STORY } from '@/data/residents';
import { EXPOSURES, HARVEST_LUNCH_ID, RESIDENT_EXPOSURES } from '@/data/exposures';
import { completeness, detectClusters, detectIndividualChanges, exposureComparisons } from './analytics';
import { extractObservations } from './extraction';
import { DEMO_SCRIPTS } from '@/data/demoScripts';
import type { Observation } from '@/types';

describe('seed dataset', () => {
  it('has 48 residents across four units', () => {
    expect(RESIDENTS).toHaveLength(48);
    expect(new Set(RESIDENTS.map((r) => r.unit)).size).toBe(4);
  });

  it('flags exactly the six seeded individual changes (Margaret not yet flagged)', () => {
    const changes = detectIndividualChanges(BASE_OBSERVATIONS, RESIDENTS);
    expect(changes.map((c) => c.residentId).sort()).toEqual([...STORY.individual].sort());
  });

  it('detects the GI facility cluster and the Unit B respiratory cluster', () => {
    const clusters = detectClusters(BASE_OBSERVATIONS, RESIDENTS);
    expect(clusters).toHaveLength(2);
    const gi = clusters.find((c) => c.domain === 'gi')!;
    const resp = clusters.find((c) => c.domain === 'respiratory')!;
    expect(gi.scope).toBe('facility');
    expect(gi.residentIds.sort()).toEqual([...STORY.gi].sort());
    expect(resp.scope).toBe('B');
    expect(resp.residentIds.sort()).toEqual([...STORY.resp].sort());
  });
});

describe('exposure comparison', () => {
  it('computes denominators for Harvest Lunch Seating A, excluding unknown attendance', () => {
    const gi = detectClusters(BASE_OBSERVATIONS, RESIDENTS).find((c) => c.domain === 'gi')!;
    const rows = exposureComparisons(gi, EXPOSURES, RESIDENT_EXPOSURES, RESIDENTS);
    const top = rows[0];
    expect(top.exposure.id).toBe(HARVEST_LUNCH_ID);
    expect([top.exposedSymptomatic, top.exposedTotal]).toEqual([4, 20]);
    expect([top.unexposedSymptomatic, top.unexposedTotal]).toEqual([1, 26]);
    expect([top.unknownSymptomatic, top.unknownTotal]).toEqual([0, 2]);
    expect(top.exposedRate).toBeCloseTo(0.2);
    expect(top.unexposedRate).toBeCloseTo(1 / 26);
    expect(top.caveats.some((c) => c.startsWith('Small numbers'))).toBe(true);
  });

  it('keeps every other shared exposure well below the Harvest Lunch signal', () => {
    const gi = detectClusters(BASE_OBSERVATIONS, RESIDENTS).find((c) => c.domain === 'gi')!;
    const rows = exposureComparisons(gi, EXPOSURES, RESIDENT_EXPOSURES, RESIDENTS);
    for (const r of rows.slice(1)) expect(r.exposedSymptomatic).toBeLessThanOrEqual(3);
    expect((rows[1].exposedRate ?? 0) - (rows[1].unexposedRate ?? 0)).toBeLessThan(0.1);
  });
});

describe('completeness', () => {
  it('treats missing records as missing, not as normal', () => {
    expect(completeness([], 'R-1001', 'sleep')).toBe(0);
  });
});

describe('scripted note (Scenario B)', () => {
  it('extracts confusion and reduced appetite and then flags Margaret', () => {
    const drafts = extractObservations(DEMO_SCRIPTS[0].text, '2026-11-07T08:00:00');
    const cats = drafts.filter((d) => d.flag === 'change').map((d) => d.category).sort();
    expect(cats).toEqual(['appetite', 'cognition']);
    const added: Observation[] = drafts.map((d, i) => ({
      id: `t-${i}`, residentId: STORY.margaret, category: d.category, value: d.value, flag: d.flag, numeric: d.numeric,
      observedAt: d.observedAt, recordedAt: '2026-11-07T08:00:00', recordedBy: 's-priya', sourceType: 'care_note', sourceId: 'n-test',
      status: 'reported', reviewedBy: 's-priya',
    }));
    const changes = detectIndividualChanges([...BASE_OBSERVATIONS, ...added], RESIDENTS);
    const m = changes.find((c) => c.residentId === STORY.margaret);
    expect(m?.domains.sort()).toEqual(['appetite', 'cognition']);
    expect(changes).toHaveLength(7);
  });
});
