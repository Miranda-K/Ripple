import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Alert, Assessment, AssessmentItemResponse, AuditEvent, FamilyMessage, Note, Observation, ObservationDraft, PatternCluster, PatternStatus, RecoveryRecord, UserRole } from '@/types';
import { buildSeed, type SeedState } from '@/data/seed';
import { BASE_OBSERVATIONS } from '@/data/observations';
import { ROLE_USER, staffName } from '@/data/staff';
import { RESIDENT_BY_ID, RESIDENTS, residentName } from '@/data/residents';
import { assessmentAlert, syncAlerts } from '@/lib/alerts';
import { detectClusters } from '@/lib/analytics';
import { KEY_ITEM_IDS } from '@/lib/assessmentItems';
import { DEMO_NOW, addMinutes } from '@/lib/time';

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++counter).toString(36)}`;

export interface SaveNoteInput {
  residentId: string;
  originalText: string;
  editedText: string;
  inputMode: Note['inputMode'];
  eventTime: string;
  drafts: ObservationDraft[];
}

export interface SaveNoteResult {
  note: Note;
  observations: Observation[];
  createdAlerts: Alert[];
  updatedAlerts: Alert[];
  createdAssessment?: Assessment;
}

interface Actions {
  now: () => string;
  userId: () => string;
  setRole: (role: UserRole) => void;
  saveNote: (input: SaveNoteInput) => SaveNoteResult;
  acknowledgeAlert: (id: string) => void;
  assignAlert: (id: string, staffId: string) => void;
  addFollowUp: (id: string, text: string) => void;
  recordFamilyMessage: (alertId: string, residentId: string, message: string) => void;
  markResidentRecovered: (residentId: string, domain: PatternCluster['domain'], patternId: string, note?: string) => void;
  resolveAlert: (id: string) => void;
  markAlertRead: (id: string) => void;
  clearNotifications: () => void;
  setPatternStatus: (patternId: string, status: PatternStatus) => void;
  requestAssessment: (residentId: string, reason: string, linkedAlertId?: string) => Assessment;
  saveAssessment: (id: string, responses: Record<string, AssessmentItemResponse>, mode: 'draft' | 'submit') => Assessment;
  signOffAssessment: (id: string) => void;
  reset: () => void;
  loadScenario: (s: 'A' | 'B') => void;
}

export type RippleState = SeedState & Actions;

export const useRippleStore = create<RippleState>()(
  persist(
    (set, get) => {
      const tick = () => {
        set((s) => ({ clockOffset: s.clockOffset + 2 }));
        return get().now();
      };
      const audit = (action: string, targetType: AuditEvent['targetType'], targetId: string, detail?: string): AuditEvent => ({
        id: uid('au'),
        at: get().now(),
        actorId: get().userId(),
        actorRole: get().role,
        action,
        targetType,
        targetId,
        detail,
      });
      const patchAlert = (id: string, patch: (a: Alert) => Partial<Alert>, action: string, detail?: string) => {
        tick();
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch(a) } : a)),
          audit: [audit(action, 'alert', id, detail), ...s.audit],
        }));
      };

      return {
        ...buildSeed(),
        now: () => addMinutes(DEMO_NOW, get().clockOffset),
        userId: () => ROLE_USER[get().role],
        setRole: (role) => set({ role }),

        saveNote: (input) => {
          const now = tick();
          const state = get();
          const author = state.userId();
          const noteId = uid('n');
          const sourceType = input.inputMode === 'voice' ? 'voice_note' : 'care_note';
          const observations: Observation[] = input.drafts
            .filter((d) => d.include)
            .map((d, i) => ({
              id: `o-${noteId}-${i}`,
              residentId: input.residentId,
              category: d.category,
              value: d.value,
              flag: d.flag,
              numeric: d.numeric,
              observedAt: d.observedAt,
              recordedAt: now,
              recordedBy: author,
              sourceType: d.sourceType ?? sourceType,
              sourceId: noteId,
              status: 'reported',
              reviewedBy: author,
            }));
          const note: Note = {
            id: noteId,
            residentId: input.residentId,
            originalText: input.originalText,
            editedText: input.editedText,
            inputMode: input.inputMode,
            sourceType,
            eventTime: input.eventTime,
            createdAt: now,
            authorId: author,
            reviewerId: author,
            observationIds: observations.map((o) => o.id),
          };
          const userObservations = [...state.userObservations, ...observations];
          const sync = syncAlerts(state.alerts, [...BASE_OBSERVATIONS, ...userObservations], now, () => uid('al'), state.recoveryRecords);
          let alerts = sync.alerts;
          let assessments = state.assessments;
          let createdAssessment: Assessment | undefined;
          const events: AuditEvent[] = [audit('Saved note with confirmed observations', 'note', noteId, `${observations.length} structured observation(s) for ${residentName(input.residentId)}`)];
          for (const a of sync.created) events.push(audit('Flag raised by re-analysis', 'alert', a.id, a.title));
          for (const a of sync.updated) events.push(audit('Flag updated with new evidence', 'alert', a.id, a.title));

          // Facility protocol (demo): a new cognition or mood change requests a behavioural review.
          const needsReview = sync.created.find(
            (a) => a.type === 'individual_change' && /cognition|mood/.test(a.title) &&
              !assessments.some((x) => x.residentId === a.residentIds[0] && x.status !== 'completed'),
          );
          if (needsReview) {
            createdAssessment = {
              id: uid('as'),
              residentId: needsReview.residentIds[0],
              status: 'not_started',
              reason: `Auto-requested (demo protocol): ${needsReview.title.split(': ')[1]} flagged after a new care note.`,
              requestedBy: author,
              requestedAt: now,
              assignedTo: 's-amara',
              linkedAlertId: needsReview.id,
              responses: {},
              updatedAt: now,
            };
            assessments = [createdAssessment, ...assessments];
            const req: Alert = { ...assessmentAlert(createdAssessment), id: uid('al'), status: 'new', read: false, followUps: [], createdAt: now };
            alerts = [req, ...alerts];
            events.push(audit('Assessment requested', 'assessment', createdAssessment.id, 'Assigned to Amara Bello'));
          }
          set((s) => ({ notes: [note, ...s.notes], userObservations, alerts, assessments, audit: [...events.reverse(), ...s.audit] }));
          return { note, observations, createdAlerts: sync.created, updatedAlerts: sync.updated, createdAssessment };
        },

        acknowledgeAlert: (id) => patchAlert(id, () => ({ status: 'acknowledged', read: true }), 'Acknowledged'),
        assignAlert: (id, staffId) =>
          patchAlert(id, (a) => ({ assignedTo: staffId, status: a.status === 'resolved' ? 'resolved' : 'in_review', read: true }), `Assigned to ${staffName(staffId)}`),
        addFollowUp: (id, text) => {
          const at = tick();
          set((s) => ({
            alerts: s.alerts.map((a) =>
              a.id === id ? { ...a, followUps: [...a.followUps, { id: uid('fu'), text, authorId: s.userId(), role: s.role, at }] } : a,
            ),
            audit: [audit('Added follow-up note', 'alert', id, text.length > 80 ? `${text.slice(0, 80)}…` : text), ...s.audit],
          }));
        },
        recordFamilyMessage: (alertId, residentId, message) => {
          const text = message.trim();
          const alert = get().alerts.find((a) => a.id === alertId);
          if (!alert) throw new Error(`Cannot record family message: alert "${alertId}" was not found.`);
          if (!alert.residentIds.includes(residentId)) throw new Error(`Cannot record family message: resident "${residentId}" is not part of alert "${alertId}".`);
          if (text.length < 3) throw new Error('Cannot record family message: message must contain at least 3 characters.');

          const at = tick();
          const entry: FamilyMessage = {
            id: uid('fm'),
            alertId,
            residentId,
            message: text,
            authorId: get().userId(),
            at,
          };
          set((s) => ({
            familyMessages: [entry, ...s.familyMessages],
            audit: [audit('Recorded simulated family message', 'alert', alertId, `Demo only — message recorded for ${residentName(residentId)}; not delivered.`), ...s.audit],
          }));
        },
        markResidentRecovered: (residentId, domain, patternId, note) => {
          if (get().role === 'assessor') throw new Error('Only a nurse or Head Nurse can record resident recovery.');
          if (!RESIDENT_BY_ID[residentId]) throw new Error(`Cannot record recovery: resident "${residentId}" was not found.`);
          if (!patternId.startsWith(`pattern-${domain}-`)) throw new Error(`Cannot record recovery: pattern "${patternId}" does not match domain "${domain}".`);

          const now = tick();
          const state = get();
          const recovery: RecoveryRecord = {
            id: uid('rec'),
            residentId,
            domain,
            recoveredAt: now,
            recordedBy: state.userId(),
            note: note?.trim() || undefined,
          };
          const recoveryRecords = [...state.recoveryRecords, recovery];
          const sync = syncAlerts(
            state.alerts,
            [...BASE_OBSERVATIONS, ...state.userObservations],
            now,
            () => uid('al'),
            recoveryRecords,
          );
          const activeClusterIds = new Set(detectClusters(
            [...BASE_OBSERVATIONS, ...state.userObservations],
            RESIDENTS,
            now,
            recoveryRecords,
          ).map((cluster) => cluster.id));
          const resolvedAlerts: Alert[] = [];
          const alerts = sync.alerts.map((alert) => {
            if (
              alert.type !== 'facility_pattern' ||
              alert.status === 'resolved' ||
              !alert.patternId?.startsWith(`pattern-${domain}-`) ||
              !alert.residentIds.includes(residentId) ||
              activeClusterIds.has(alert.patternId)
            ) {
              return alert;
            }
            const resolved = { ...alert, status: 'resolved' as const, read: true };
            resolvedAlerts.push(resolved);
            return resolved;
          });
          const auditEvents = [
            audit('Marked resident recovered', 'pattern', patternId, `${residentName(residentId)} — ${domain === 'gi' ? 'GI' : 'respiratory'} symptoms documented as returned to baseline.${recovery.note ? ` Note: ${recovery.note}` : ''}`),
            ...resolvedAlerts.map((alert) => audit('Pattern alert closed after recovery', 'alert', alert.id, `${residentName(residentId)} recorded as recovered.`)),
          ];
          set((s) => ({
            recoveryRecords,
            alerts,
            audit: [...auditEvents, ...s.audit],
          }));
        },
        resolveAlert: (id) => patchAlert(id, () => ({ status: 'resolved', read: true }), 'Marked reviewed (resolved)'),
        markAlertRead: (id) => set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) })),
        clearNotifications: () => set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),
        setPatternStatus: (patternId, status) => {
          tick();
          set((s) => ({ patternStatus: { ...s.patternStatus, [patternId]: status }, audit: [audit(`Pattern status → ${status.replace('_', ' ')}`, 'pattern', patternId), ...s.audit] }));
        },

        requestAssessment: (residentId, reason, linkedAlertId) => {
          const now = tick();
          const a: Assessment = { id: uid('as'), residentId, status: 'not_started', reason, requestedBy: get().userId(), requestedAt: now, assignedTo: 's-amara', linkedAlertId, responses: {}, updatedAt: now };
          const req: Alert = { ...assessmentAlert(a), id: uid('al'), status: 'new', read: false, followUps: [], createdAt: now };
          set((s) => ({ assessments: [a, ...s.assessments], alerts: [req, ...s.alerts], audit: [audit('Assessment requested', 'assessment', a.id, reason), ...s.audit] }));
          return a;
        },
        saveAssessment: (id, responses, mode) => {
          const now = tick();
          const prev = get().assessments.find((a) => a.id === id)!;
          const unassessedKey = KEY_ITEM_IDS.filter((k) => responses[k]?.answer === 'not_assessed').length;
          const next: Assessment = {
            ...prev,
            responses,
            updatedAt: now,
            status: mode === 'submit' ? 'needs_review' : 'in_progress',
            submittedBy: mode === 'submit' ? get().userId() : prev.submittedBy,
            reviewRequired: unassessedKey > 0,
          };
          set((s) => ({
            assessments: s.assessments.map((a) => (a.id === id ? next : a)),
            alerts: s.alerts.map((a) => (a.assessmentId === id && mode === 'submit' && a.status !== 'resolved' ? { ...a, status: 'in_review' } : a)),
            audit: [
              audit(mode === 'submit' ? 'Submitted assessment for sign-off' : 'Saved assessment progress', 'assessment', id, unassessedKey ? `${unassessedKey} key item(s) not assessed — review required` : undefined),
              ...s.audit,
            ],
          }));
          return next;
        },
        signOffAssessment: (id) => {
          const now = tick();
          set((s) => ({
            assessments: s.assessments.map((a) => (a.id === id ? { ...a, status: 'completed', signedOffBy: s.userId(), signedOffAt: now, updatedAt: now } : a)),
            alerts: s.alerts.map((a) => (a.assessmentId === id ? { ...a, status: 'resolved', read: true } : a)),
            audit: [audit('Signed off assessment', 'assessment', id), ...s.audit],
          }));
        },

        reset: () => set({ ...buildSeed() }),
        loadScenario: (scenario) => set({ ...buildSeed(), scenario, role: scenario === 'A' ? 'head_nurse' : 'nurse' }),
      };
    },
    {
      name: 'ripple-demo-v1',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
        }
      }),
      partialize: (s) => ({
        role: s.role,
        notes: s.notes,
        userObservations: s.userObservations,
        alerts: s.alerts,
        familyMessages: s.familyMessages,
        recoveryRecords: s.recoveryRecords,
        assessments: s.assessments,
        audit: s.audit,
        patternStatus: s.patternStatus,
        clockOffset: s.clockOffset,
        scenario: s.scenario,
      }),
    },
  ),
);
