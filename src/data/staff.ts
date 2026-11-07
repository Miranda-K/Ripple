import type { Staff, UserRole } from '@/types';

export const STAFF: Staff[] = [
  { id: 's-priya', name: 'Priya Nair', title: 'RN · Unit A', role: 'nurse', unit: 'A' },
  { id: 's-daniel', name: 'Daniel Okafor', title: 'RPN · Unit B', role: 'nurse', unit: 'B' },
  { id: 's-sofia', name: 'Sofia Alvarez', title: 'RN · Unit C', role: 'nurse', unit: 'C' },
  { id: 's-james', name: 'James Whitfield', title: 'RPN · Unit D', role: 'nurse', unit: 'D' },
  { id: 's-grace', name: 'Grace Liu', title: 'Charge Nurse', role: 'head_nurse' },
  { id: 's-amara', name: 'Amara Bello', title: 'Behavioural Assessor', role: 'assessor' },
  { id: 's-tom', name: 'Tom Reyes', title: 'Care Aide · Units A/B', role: 'nurse' },
  { id: 's-lena', name: 'Lena Kowalski', title: 'Care Aide · Units C/D', role: 'nurse' },
  { id: 's-dietary', name: 'Dietary Services', title: 'Meal records', role: 'nurse' },
];

export const STAFF_BY_ID: Record<string, Staff> = Object.fromEntries(STAFF.map((s) => [s.id, s]));

export const ROLE_USER: Record<UserRole, string> = {
  nurse: 's-priya',
  head_nurse: 's-grace',
  assessor: 's-amara',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  nurse: 'Nurse',
  head_nurse: 'Head Nurse',
  assessor: 'Assessor',
};

export const UNIT_NURSE: Record<string, string> = { A: 's-priya', B: 's-daniel', C: 's-sofia', D: 's-james' };
export const UNIT_AIDE: Record<string, string> = { A: 's-tom', B: 's-tom', C: 's-lena', D: 's-lena' };

export const ASSIGNABLE_STAFF = STAFF.filter((s) => ['s-priya', 's-daniel', 's-sofia', 's-james', 's-grace'].includes(s.id));

export function staffName(id?: string | null): string {
  if (!id) return 'Unassigned';
  return STAFF_BY_ID[id]?.name ?? id;
}
