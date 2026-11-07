// Ripple domain model. All data in this prototype is synthetic.

export type UserRole = 'nurse' | 'head_nurse' | 'assessor';

export type UnitId = 'A' | 'B' | 'C' | 'D';

export type ObservationCategory =
  | 'cognition'
  | 'appetite'
  | 'mobility'
  | 'sleep'
  | 'mood'
  | 'gi'
  | 'respiratory'
  | 'fever';

/** normal = documented as within baseline; change = documented deviation;
 *  not_assessed = explicitly not checked; unknown = documented but indeterminate.
 *  Missing data is represented by the ABSENCE of an observation — never as "normal". */
export type ObservationFlag = 'normal' | 'change' | 'not_assessed' | 'unknown';

export type SourceType =
  | 'care_note'
  | 'voice_note'
  | 'meal_record'
  | 'vitals'
  | 'mar'
  | 'assessment'
  | 'incident_report'
  | 'shift_handover';

export type ObservationStatus = 'reported' | 'observed' | 'confirmed';

export interface Staff {
  id: string;
  name: string;
  title: string;
  role: UserRole;
  unit?: UnitId;
}

export interface BaselineEntry {
  summary: string;
  /** Optional numeric anchor, e.g. typical meal intake %. */
  numeric?: number;
}

export interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  age: number;
  sex: 'F' | 'M';
  unit: UnitId;
  room: string;
  assignedNurseId: string;
  careTeam: string[];
  admittedOn: string;
  baseline: Record<'cognition' | 'appetite' | 'mobility' | 'sleep' | 'mood', BaselineEntry>;
}

export interface Observation {
  id: string;
  residentId: string;
  category: ObservationCategory;
  value: string;
  flag: ObservationFlag;
  numeric?: number;
  observedAt: string; // when it happened (event time)
  recordedAt: string; // when it was entered (entry time)
  recordedBy: string; // staff id
  sourceType: SourceType;
  sourceId: string;
  status: ObservationStatus;
  reviewedBy: string | null;
}

export type ClinicalEventType = 'vitals' | 'fall' | 'physician_visit' | 'medication_change' | 'lab_request' | 'family_contact';

export interface ClinicalEvent {
  id: string;
  residentId: string;
  type: ClinicalEventType;
  description: string;
  occurredAt: string;
  recordedAt: string;
  recordedBy: string;
  sourceType: SourceType;
}

export type ExposureType = 'meal' | 'activity' | 'room_change' | 'contact';

export interface Exposure {
  id: string;
  type: ExposureType;
  name: string;
  start: string;
  end: string;
  location: string;
  detail?: string;
}

export type Attendance = 'attended' | 'absent' | 'unknown';

export interface ResidentExposure {
  id: string;
  exposureId: string;
  residentId: string;
  attendance: Attendance;
  source: 'dining_log' | 'activity_log' | 'bed_board' | 'care_note';
}

export type AssessmentDomain =
  | 'attention'
  | 'sleep'
  | 'mood'
  | 'mobility'
  | 'appetite'
  | 'respiratory'
  | 'gi'
  | 'functional';

export type AssessmentStatus = 'not_started' | 'in_progress' | 'needs_review' | 'completed';

export type ItemAnswer = 'yes' | 'no' | 'not_assessed';

export interface AssessmentItemResponse {
  answer: ItemAnswer | null; // null = not yet answered (form state only)
  note?: string;
  eventTime?: string;
  observer?: string;
}

export interface Assessment {
  id: string;
  residentId: string;
  status: AssessmentStatus;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  assignedTo: string;
  linkedAlertId?: string;
  responses: Record<string, AssessmentItemResponse>; // keyed by item id
  updatedAt: string;
  submittedBy?: string;
  reviewRequired?: boolean;
  signedOffBy?: string;
  signedOffAt?: string;
}

export type AlertType = 'individual_change' | 'facility_pattern' | 'assessment_request';
export type AlertStatus = 'new' | 'acknowledged' | 'in_review' | 'resolved';

export interface FollowUp {
  id: string;
  text: string;
  authorId: string;
  role: UserRole;
  at: string;
}

export interface FamilyMessage {
  id: string;
  alertId: string;
  residentId: string;
  message: string;
  authorId: string;
  at: string;
}

export interface Alert {
  id: string;
  /** Stable detection key so re-analysis does not duplicate alerts. */
  key: string;
  type: AlertType;
  title: string;
  summary: string;
  residentIds: string[];
  patternId?: string;
  assessmentId?: string;
  evidenceIds: string[];
  firstObservedAt: string;
  whyFlagged: string;
  uncertainty: string[];
  status: AlertStatus;
  assignedTo?: string;
  createdAt: string;
  read: boolean;
  followUps: FollowUp[];
}

export interface Note {
  id: string;
  residentId: string;
  originalText: string;
  editedText: string;
  inputMode: 'typed' | 'voice' | 'imported';
  sourceType: SourceType;
  eventTime: string;
  createdAt: string;
  authorId: string;
  reviewerId: string | null;
  observationIds: string[];
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  targetType: 'alert' | 'assessment' | 'note' | 'pattern' | 'demo';
  targetId: string;
  detail?: string;
}

export type PatternStatus = 'new' | 'under_review' | 'monitoring' | 'closed';

// ---- Derived analytics types ----

export interface IndividualChange {
  key: string;
  residentId: string;
  domains: ObservationCategory[];
  reasons: string[];
  evidenceIds: string[];
  firstObservedAt: string;
}

export interface PatternCluster {
  id: string;
  domain: 'gi' | 'respiratory';
  scope: 'facility' | UnitId;
  title: string;
  residentIds: string[];
  onsets: { residentId: string; onsetAt: string; observationId: string }[];
  firstOnset: string;
  lastOnset: string;
  unitDistribution: Record<UnitId, number>;
  evidenceIds: string[];
}

export interface ExposureComparison {
  exposure: Exposure;
  exposedSymptomatic: number;
  exposedTotal: number;
  unexposedSymptomatic: number;
  unexposedTotal: number;
  unknownSymptomatic: number;
  unknownTotal: number;
  exposedRate: number | null;
  unexposedRate: number | null;
  rateRatio: number | null;
  caveats: string[];
}

export interface ObservationDraft {
  tempId: string;
  category: ObservationCategory;
  value: string;
  flag: ObservationFlag;
  numeric?: number;
  observedAt: string;
  sourceType: SourceType;
  evidence: string;
  include: boolean;
}
