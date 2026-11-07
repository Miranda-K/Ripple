import type { AssessmentDomain, ObservationCategory } from '@/types';

export interface AssessmentItem {
  id: string;
  domain: AssessmentDomain;
  prompt: string;
  key?: boolean;
}

export const DOMAIN_LABEL: Record<AssessmentDomain, string> = {
  attention: 'Attention / orientation',
  sleep: 'Sleep / wake',
  mood: 'Mood / behaviour',
  mobility: 'Mobility',
  appetite: 'Appetite',
  respiratory: 'Respiratory',
  gi: 'Gastrointestinal',
  functional: 'Functional independence',
};

/** Domain → related observation category, to show recent evidence beside the form. */
export const DOMAIN_CATEGORY: Record<AssessmentDomain, ObservationCategory[]> = {
  attention: ['cognition'],
  sleep: ['sleep'],
  mood: ['mood'],
  mobility: ['mobility'],
  appetite: ['appetite'],
  respiratory: ['respiratory', 'fever'],
  gi: ['gi'],
  functional: ['mobility'],
};

export const ASSESSMENT_ITEMS: AssessmentItem[] = [
  { id: 'att-1', domain: 'attention', prompt: 'Easily distracted or has difficulty following conversation', key: true },
  { id: 'att-2', domain: 'attention', prompt: 'Disoriented to time or place', key: true },
  { id: 'slp-1', domain: 'sleep', prompt: 'Drowsy or sleeping more than usual during the day', key: true },
  { id: 'slp-2', domain: 'sleep', prompt: 'Awake or restless at night' },
  { id: 'mood-1', domain: 'mood', prompt: 'Appears anxious, fearful or irritable', key: true },
  { id: 'mood-2', domain: 'mood', prompt: 'Withdrawn or less interested than usual' },
  { id: 'mob-1', domain: 'mobility', prompt: 'Needs more help to walk or transfer than usual' },
  { id: 'mob-2', domain: 'mobility', prompt: 'Unsteady, or a near-fall observed' },
  { id: 'app-1', domain: 'appetite', prompt: 'Eating less than usual' },
  { id: 'app-2', domain: 'appetite', prompt: 'Drinking less than usual' },
  { id: 'resp-1', domain: 'respiratory', prompt: 'New cough or congestion' },
  { id: 'resp-2', domain: 'respiratory', prompt: 'Breathing appears faster or more effortful' },
  { id: 'gi-1', domain: 'gi', prompt: 'Nausea, vomiting or loose stools' },
  { id: 'gi-2', domain: 'gi', prompt: 'Reports abdominal discomfort' },
  { id: 'fn-1', domain: 'functional', prompt: 'Needs more help with dressing, hygiene or toileting' },
  { id: 'fn-2', domain: 'functional', prompt: 'Less able to take part in usual activities' },
];

export const DOMAINS = Object.keys(DOMAIN_LABEL) as AssessmentDomain[];
export const KEY_ITEM_IDS = ASSESSMENT_ITEMS.filter((i) => i.key).map((i) => i.id);
