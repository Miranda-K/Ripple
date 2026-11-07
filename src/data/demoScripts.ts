// Scripted caregiver notes that the deterministic extractor is tuned for.
export interface DemoScript {
  id: string;
  label: string;
  residentId: string;
  text: string;
}

export const DEMO_SCRIPTS: DemoScript[] = [
  {
    id: 'margaret',
    label: 'Margaret — confusion & poor appetite (Scenario B)',
    residentId: 'R-1004',
    text: "Margaret seemed confused this morning and didn't recognize her room. She only ate a few bites of breakfast and said she wasn't hungry. No vomiting, no cough. Walked to the lounge with her walker as usual.",
  },
  {
    id: 'harold',
    label: 'Harold — GI follow-up',
    residentId: 'R-1007',
    text: 'Harold had another loose stool overnight and felt nauseous at breakfast. Temperature 37.8. Drinking fluids well.',
  },
  {
    id: 'howard',
    label: 'Howard — new cough on Unit B',
    residentId: 'R-1014',
    text: 'Howard has a new dry cough since yesterday afternoon and sounds congested. Slept poorly overnight.',
  },
  {
    id: 'agnes',
    label: 'Agnes — routine (no changes)',
    residentId: 'R-1001',
    text: 'Agnes ate well at lunch and slept through the night. In good spirits at bingo.',
  },
];
