import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
