import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  CircleHelp,
  ClipboardList,
  FileText,
  HeartPulse,
  Mic,
  Pill,
  Repeat,
  ShieldAlert,
  Utensils,
} from 'lucide-react';
import type { AlertStatus, AlertType, AssessmentStatus, ObservationFlag, ObservationStatus, PatternStatus, Resident, SourceType } from '@/types';
import { Badge } from './ui/Badge';

const FLAG: Record<ObservationFlag, { label: string; tone: 'review' | 'ok' | 'neutral' | 'outline'; icon: typeof CheckCircle2 }> = {
  change: { label: 'Change from baseline', tone: 'review', icon: AlertCircle },
  normal: { label: 'At baseline', tone: 'ok', icon: CheckCircle2 },
  not_assessed: { label: 'Not assessed', tone: 'neutral', icon: CircleDashed },
  unknown: { label: 'Unknown', tone: 'outline', icon: CircleHelp },
};

export function ObservationBadge({ flag, short }: { flag: ObservationFlag; short?: boolean }) {
  const f = FLAG[flag];
  const Icon = f.icon;
  return (
    <Badge tone={f.tone} icon={<Icon size={12} aria-hidden="true" />}>
      {short ? (flag === 'change' ? 'Change' : f.label) : f.label}
    </Badge>
  );
}

export function MissingBadge() {
  return (
    <Badge tone="outline" icon={<CircleDashed size={12} aria-hidden="true" />}>
      No record
    </Badge>
  );
}

const SOURCE: Record<SourceType, { label: string; icon: typeof FileText }> = {
  care_note: { label: 'Care note', icon: FileText },
  voice_note: { label: 'Voice note', icon: Mic },
  meal_record: { label: 'Meal record', icon: Utensils },
  vitals: { label: 'Vitals', icon: HeartPulse },
  mar: { label: 'Medication record', icon: Pill },
  assessment: { label: 'Assessment', icon: ClipboardList },
  incident_report: { label: 'Incident report', icon: ShieldAlert },
  shift_handover: { label: 'Shift handover', icon: Repeat },
};

export function SourceChip({ type }: { type: SourceType }) {
  const s = SOURCE[type];
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-canvas px-2 py-0.5 text-xs font-medium text-ink-muted">
      <Icon size={12} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function sourceLabel(t: SourceType) {
  return SOURCE[t].label;
}

const OBS_STATUS: Record<ObservationStatus, string> = { reported: 'Reported', observed: 'Observed', confirmed: 'Confirmed' };
export function ObsStatusBadge({ status }: { status: ObservationStatus }) {
  return <Badge tone={status === 'confirmed' ? 'blue' : 'outline'}>{OBS_STATUS[status]}</Badge>;
}

const ALERT_STATUS: Record<AlertStatus, { label: string; tone: 'blue' | 'review' | 'neutral' | 'ok' }> = {
  new: { label: 'New', tone: 'blue' },
  acknowledged: { label: 'Acknowledged', tone: 'neutral' },
  in_review: { label: 'In review', tone: 'review' },
  resolved: { label: 'Resolved', tone: 'ok' },
};
export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const s = ALERT_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
export const ALERT_STATUS_LABEL = Object.fromEntries(Object.entries(ALERT_STATUS).map(([k, v]) => [k, v.label])) as Record<AlertStatus, string>;

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  individual_change: 'Individual change',
  facility_pattern: 'Facility pattern',
  assessment_request: 'Assessment request',
};
export function AlertTypeBadge({ type }: { type: AlertType }) {
  const Icon = type === 'facility_pattern' ? Activity : type === 'assessment_request' ? ClipboardList : AlertCircle;
  return (
    <Badge tone={type === 'facility_pattern' ? 'navy' : 'outline'} icon={<Icon size={12} aria-hidden="true" />}>
      {ALERT_TYPE_LABEL[type]}
    </Badge>
  );
}

const ASSESS: Record<AssessmentStatus, { label: string; tone: 'neutral' | 'blue' | 'review' | 'ok' }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'blue' },
  needs_review: { label: 'Needs review', tone: 'review' },
  completed: { label: 'Completed', tone: 'ok' },
};
export function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  const s = ASSESS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
export const ASSESSMENT_STATUS_LABEL = Object.fromEntries(Object.entries(ASSESS).map(([k, v]) => [k, v.label])) as Record<AssessmentStatus, string>;

const PATTERN: Record<PatternStatus, { label: string; tone: 'blue' | 'review' | 'neutral' | 'ok' }> = {
  new: { label: 'New — needs review', tone: 'blue' },
  under_review: { label: 'Under review', tone: 'review' },
  monitoring: { label: 'Monitoring', tone: 'neutral' },
  closed: { label: 'Closed', tone: 'ok' },
};
export function PatternStatusBadge({ status }: { status: PatternStatus }) {
  const s = PATTERN[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
export const PATTERN_STATUS_LABEL = Object.fromEntries(Object.entries(PATTERN).map(([k, v]) => [k, v.label])) as Record<PatternStatus, string>;

export function ResidentAvatar({ resident, size = 36 }: { resident: Resident; size?: number }) {
  const palette = ['bg-blue-100 text-blue-800', 'bg-sky-100 text-sky-800', 'bg-indigo-100 text-indigo-800', 'bg-slate-200 text-slate-700'];
  const cls = palette[Number(resident.id.slice(-2)) % palette.length];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${cls}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {resident.firstName[0]}
      {resident.lastName[0]}
    </span>
  );
}

export function DemoDataBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-review-soft px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-review-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-review" aria-hidden="true" />
      Demo data
    </span>
  );
}
