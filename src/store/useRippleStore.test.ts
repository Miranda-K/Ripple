import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BASE_OBSERVATIONS } from '@/data/observations';
import { RESIDENTS } from '@/data/residents';
import { detectClusters } from '@/lib/analytics';
import { useRippleStore } from './useRippleStore';

describe('simulated family messages', () => {
  beforeEach(() => useRippleStore.getState().reset());
  afterEach(() => useRippleStore.getState().reset());

  it('records a demo message and an audit event without sending it', () => {
    const alert = useRippleStore.getState().alerts.find((item) => item.residentIds.length > 0)!;
    const residentId = alert.residentIds[0];

    useRippleStore.getState().recordFamilyMessage(alert.id, residentId, 'Please call the care team when convenient.');

    const state = useRippleStore.getState();
    expect(state.familyMessages).toHaveLength(1);
    expect(state.familyMessages[0]).toMatchObject({
      alertId: alert.id,
      residentId,
      message: 'Please call the care team when convenient.',
      authorId: 's-grace',
    });
    expect(state.audit[0]).toMatchObject({
      targetId: alert.id,
      action: 'Recorded simulated family message',
    });
    expect(state.audit[0].detail).toContain('not delivered');
  });

  it('rejects messages for residents outside the alert', () => {
    const alert = useRippleStore.getState().alerts.find((item) => item.residentIds.length > 0)!;

    expect(() => useRippleStore.getState().recordFamilyMessage(alert.id, 'not-in-alert', 'A demo message')).toThrow('is not part of alert');
    expect(useRippleStore.getState().familyMessages).toHaveLength(0);
  });
});

describe('resident recovery', () => {
  beforeEach(() => useRippleStore.getState().reset());
  afterEach(() => useRippleStore.getState().reset());

  it('removes a recovered resident from active clusters and retains the audit record', () => {
    const store = useRippleStore.getState();
    const before = detectClusters(BASE_OBSERVATIONS, RESIDENTS).find((cluster) => cluster.domain === 'gi')!;
    const residentId = before.residentIds[0];
    expect(before.residentIds).toHaveLength(5);

    store.markResidentRecovered(residentId, 'gi', before.id, 'Symptoms returned to baseline.');

    const state = useRippleStore.getState();
    const after = detectClusters(BASE_OBSERVATIONS, RESIDENTS, state.now(), state.recoveryRecords).find((cluster) => cluster.domain === 'gi')!;
    expect(after.residentIds).toHaveLength(4);
    expect(after.residentIds).not.toContain(residentId);
    expect(state.recoveryRecords[0]).toMatchObject({
      residentId,
      domain: 'gi',
      note: 'Symptoms returned to baseline.',
      recordedBy: 's-grace',
    });
    expect(state.audit[0]).toMatchObject({
      action: 'Marked resident recovered',
      targetId: before.id,
    });
  });

  it('resolves a pattern alert when recovery leaves too few active residents', () => {
    const patternId = 'pattern-gi-facility';
    const gi = detectClusters(BASE_OBSERVATIONS, RESIDENTS).find((cluster) => cluster.id === patternId)!;

    gi.residentIds.slice(0, 3).forEach((residentId) => {
      useRippleStore.getState().markResidentRecovered(residentId, 'gi', patternId);
    });

    const current = useRippleStore.getState();
    expect(detectClusters(BASE_OBSERVATIONS, RESIDENTS, current.now(), current.recoveryRecords).some((cluster) => cluster.domain === 'gi')).toBe(false);
    expect(current.alerts.find((alert) => alert.patternId === patternId)?.status).toBe('resolved');
  });
});
