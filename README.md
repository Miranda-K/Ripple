# ripple.

**Small changes ripple. We catch them first.**

Ripple is a hackathon prototype of an explainable decision-support tool for senior-care facilities. It pulls timestamped resident observations, clinical events, meals, activities and care notes together to surface:

- **Individual changes**: a resident's documented observations compared with their *own* baseline, using transparent rules.
- **Cross-resident patterns**: new symptoms grouped by domain, onset window and unit, with exposure comparisons that use full denominators.

> ⚠️ **Synthetic data only.** Ripple is *not* a diagnostic or autonomous outbreak-detection system. It does not compute risk scores, assign severity, or claim causes. Every insight is a hypothesis for human review.

## Quick start

Requires Node.js 18+ (tested on Node 26).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # analytics + extraction unit tests
npm run build      # typecheck + production build (dist/)
npm run preview    # serve the production build
```

No backend, API keys or network services are needed. Demo edits are saved to `localStorage` (key `ripple-demo-v1`), and **Demo Controls → Reset synthetic dataset** restores the exact seed.

The Alerts page includes a **Notify family (demo)** workflow. It records a simulated message in the alert and audit trail; it does not send email or text messages. Do not enter real resident or family contact information.

Set `VITE_DEMO_MODE=false` to hide the Demo Controls page.

## Demo walkthrough (about 5 minutes)

Open **Demo Controls** at any time to reset or load a scenario. Both scenarios are deterministic.

### Script A: GI cluster (Head Nurse)
1. **Demo Controls → Scenario A**. The Overview shows 48 residents monitored, 6 with new changes, 2 patterns under review and 4 pending assessments.
2. On the *Gastrointestinal symptoms — 5 residents across 3 units* card, click **Investigate**.
3. The pattern graph shows the most-shared recent event and its location, with lines only to affected residents documented as attendees. Attendance is not proof of cause.
4. Select an event or resident to filter the evidence panel, then use **View source records** to inspect the underlying notes.
5. **Open alert & assign** → Acknowledge → **Assign to nurse** (e.g. Grace Liu) → **Add follow-up note**. Each action appears in the alert's audit trail.

### Script B: Individual behavioural change (Nurse → Assessor)
1. **Demo Controls → Scenario B**. This opens Margaret Chen (Room 104, Unit A) as the Nurse.
2. **Overview** tab: her baseline (*Oriented ×3*) is shown against one new confusion report and one low-intake dinner. She is not yet flagged, because the rules need 2 or more.
3. **Add note** → click the *Margaret* demo script, or dictate it (browser speech recognition, with typed fallback) → **Extract observations**.
4. Review and edit the drafts (category, value, onset, source), then **Confirm & Save**. A toast links to her timeline. Re-analysis raises a new *change in cognition and appetite* flag and auto-requests a behavioural review (demo protocol).
5. Switch role to **Assessor** → Assessments → Margaret → answer items (try *Not assessed* for key items) → **Submit for sign-off**. Because key items are unassessed, the assessment is marked *Review required*.
6. Switch to **Nurse** → **Nurse sign-off**.

## How the analytics work (`src/lib/analytics.ts`)

| Rule | Threshold |
|---|---|
| Cognition / mood / sleep | 2 or more documented changes within 72 h |
| Mobility | 1 or more documented falls, or 2 or more documented declines within 72 h |
| Appetite | 2 or more of the 3 most recent intake records below 50% |
| Pattern | 3 or more residents with a new symptom onset in the same domain within 72 h (grouped by unit first, then facility-wide) |
| Exposure comparison | Every shared exposure in the 72 h before the first onset: a 2×2 table of attended / not attended vs symptomatic / not symptomatic. Unknown attendance is excluded and reported. A rate ratio is shown only when it can be calculated. |

How missing and uncertain data are handled:
- **Missing ≠ negative.** A missing record is shown as *No record*. *Not assessed* is stored explicitly, and data-completeness percentages are displayed.
- Each observation keeps its **event time** separate from its **entry time**, along with source, status (reported / observed / confirmed) and reviewer.

**Care-note extraction** (`src/lib/extraction.ts`) is a deterministic keyword and time-phrase extractor, not an LLM. It handles negation ("no vomiting"), relative times ("overnight", "this morning") and intake estimates. Drafts are never saved without explicit confirmation.

## Project structure

```
src/
  types/            Domain model (Resident, Observation, Exposure, Alert, …)
  data/             Deterministic fixtures: 48 residents, story notes, routine observations, exposures, seed state
  lib/              analytics, alerts, extraction, speech, time, assessment items
  store/            Zustand store (persisted) + selectors/role permissions + toasts
  components/       AppShell, Sidebar, TopBar, cards, charts, Timeline, EvidenceDrawer,
                    NoteCapture, AssessmentForm, pattern/ (timeline, exposure comparison, graph)
  pages/            Overview, Residents, ResidentProfile, PatternExplorer, Assessments,
                    AssessmentDetail, CareNotes, Alerts, DemoControls
```

All state changes go through the store actions in `src/store/useRippleStore.ts`. A real backend could be added behind those actions without changing the UI.

## Roles

| Role | Sees | Can |
|---|---|---|
| Nurse (Priya Nair, Unit A) | My shift tasks, Unit A and assigned alerts | Acknowledge, add follow-ups, resolve own assigned individual alerts, sign off assessments |
| Head Nurse (Grace Liu) | Facility-wide queue | All alert actions, including assign and resolve; set pattern status |
| Assessor (Amara Bello) | Assessment requests | Complete and submit assessments, resolve assessment requests |

The assessment form uses *DOS-inspired observation categories* as labels only. It is not the validated Delirium Observation Screening scale, and no score is computed.
