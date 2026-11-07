import { useMemo } from 'react';
import type { Alert, Observation, UserRole } from '@/types';
import { BASE_OBSERVATIONS } from '@/data/observations';
import { RESIDENT_BY_ID, RESIDENTS } from '@/data/residents';
import { ROLE_USER, STAFF_BY_ID } from '@/data/staff';
import { detectClusters, detectIndividualChanges } from '@/lib/analytics';
import { useRippleStore } from './useRippleStore';

export function useObservations(): Observation[] {
  const user = useRippleStore((s) => s.userObservations);
  return useMemo(() => [...BASE_OBSERVATIONS, ...user].sort((a, b) => a.observedAt.localeCompare(b.observedAt)), [user]);
}

export function useNow(): string {
  useRippleStore((s) => s.clockOffset);
  return useRippleStore.getState().now();
}

export function useAnalysis() {
  const observations = useObservations();
  const now = useNow();
  const recoveryRecords = useRippleStore((s) => s.recoveryRecords);
  return useMemo(
    () => ({
      observations,
      changes: detectIndividualChanges(observations, RESIDENTS, now),
      clusters: detectClusters(observations, RESIDENTS, now, recoveryRecords),
    }),
    [observations, now, recoveryRecords],
  );
}

export function useCurrentUser() {
  const role = useRippleStore((s) => s.role);
  return { role, user: STAFF_BY_ID[ROLE_USER[role]] };
}

/** Role scoping: head nurse sees everything; nurse sees assigned + own-unit alerts; assessor sees assessment work. */
export function alertVisibleTo(a: Alert, role: UserRole): boolean {
  if (role === 'head_nurse') return true;
  const me = ROLE_USER[role];
  if (role === 'assessor') return a.type === 'assessment_request' || a.assignedTo === me;
  const myUnit = STAFF_BY_ID[me].unit;
  if (a.assignedTo === me) return true;
  if (a.type === 'assessment_request') return false;
  return a.residentIds.some((id) => RESIDENT_BY_ID[id]?.unit === myUnit);
}

export function useVisibleAlerts(): Alert[] {
  const alerts = useRippleStore((s) => s.alerts);
  const role = useRippleStore((s) => s.role);
  return useMemo(() => alerts.filter((a) => alertVisibleTo(a, role)), [alerts, role]);
}

export function can(role: UserRole, action: 'acknowledge' | 'assign' | 'resolve' | 'followup' | 'signoff' | 'assess', a?: Alert): boolean {
  switch (action) {
    case 'acknowledge':
      return role !== 'assessor' || a?.type === 'assessment_request';
    case 'assign':
      return role === 'head_nurse';
    case 'resolve':
      if (role === 'head_nurse') return true;
      if (role === 'assessor') return a?.type === 'assessment_request';
      return a?.type === 'individual_change' && a.assignedTo === ROLE_USER.nurse;
    case 'followup':
      return true;
    case 'signoff':
      return role === 'nurse' || role === 'head_nurse';
    case 'assess':
      return true;
  }
}
