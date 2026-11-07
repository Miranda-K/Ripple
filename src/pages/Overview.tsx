import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2, ClipboardCheck, ClipboardList, NotebookPen, TriangleAlert, Users, Waves } from 'lucide-react';
import { useRippleStore } from '@/store/useRippleStore';
import { useAnalysis, useCurrentUser, useNow, useVisibleAlerts } from '@/store/selectors';
import { RESIDENT_BY_ID, RESIDENTS, residentName } from '@/data/residents';
import { ROLE_LABEL, ROLE_USER, STAFF_BY_ID } from '@/data/staff';
import { CATEGORY_LABEL, onsetsByDay, unitHeatmap } from '@/lib/analytics';
import { withinHours } from '@/lib/time';
import { MetricCard, PatternCard, AlertRow } from '@/components/cards';
import { OnsetChart, UnitHeatmap } from '@/components/charts';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { AssessmentStatusBadge, ResidentAvatar } from '@/components/badges';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { useSimulatedLoading } from '@/hooks/useSimulatedLoading';
import type { UserRole } from '@/types';

const SUBTITLE: Record<UserRole, string> = {
  head_nurse: 'Facility-wide view: emerging patterns and the review queue across all four units.',
  nurse: 'Your shift on Unit A — residents with documented changes and tasks that need you first.',
  assessor: 'Assessment requests and residents whose recent observations may need behavioural review.',
};

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading overview">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[132px] rounded-card" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-80 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

export default function Overview() {
  const loading = useSimulatedLoading();
  const { role, user } = useCurrentUser();
  const now = useNow();
  const { observations, changes, clusters } = useAnalysis();
  const patternStatus = useRippleStore((s) => s.patternStatus);
  const assessments = useRippleStore((s) => s.assessments);
  const alerts = useVisibleAlerts();
  const onsetData = useMemo(() => onsetsByDay(observations), [observations]);
  const heat = useMemo(() => unitHeatmap(observations, RESIDENTS), [observations]);

  if (loading) return <OverviewSkeleton />;

  const openPatterns = clusters.filter((c) => (patternStatus[c.id] ?? 'new') !== 'closed');
  const pendingAssessments = assessments.filter((a) => a.status !== 'completed');
  const openAlerts = alerts.filter((a) => a.status !== 'resolved').sort((a, b) => Number(a.read) - Number(b.read) || b.createdAt.localeCompare(a.createdAt));
  const firstName = user.name.split(' ')[0];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{ROLE_LABEL[role]} view</p>
          <h1 className="mt-1 text-2xl font-semibold md:text-[28px]">
            Good morning, {ROLE_LABEL[role]} {firstName}
          </h1>
          <p className="mt-1 max-w-2xl text-ink-muted">{SUBTITLE[role]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/notes" variant="secondary" icon={<NotebookPen size={18} aria-hidden="true" />}>
            Add care note
          </ButtonLink>
          <ButtonLink to="/patterns" icon={<Waves size={18} aria-hidden="true" />}>
            Open Pattern Explorer
          </ButtonLink>
        </div>
      </div>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard label="Residents monitored" value={RESIDENTS.length} icon={<Users size={18} />} hint="Synthetic demo residents · 4 units" to="/residents" />
        <MetricCard label="Residents with new changes" value={changes.length} icon={<Activity size={18} />} hint="Rule-based vs. own baseline · last 72 h · demo data" to="/residents?status=changed" />
        <MetricCard label="Patterns under review" value={openPatterns.length} icon={<Waves size={18} />} hint="Cross-resident symptom groupings · demo data" to="/patterns" />
        <MetricCard label="Pending assessments" value={pendingAssessments.length} icon={<ClipboardCheck size={18} />} hint="Not started, in progress or awaiting sign-off" to="/assessments" />
      </section>

      {role === 'nurse' && <NurseShift now={now} />}
      {role === 'assessor' && <AssessorQueue />}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="emerging">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="emerging" className="text-base font-semibold">
              Emerging patterns
            </h2>
            <Link to="/patterns" className="text-sm font-medium text-primary hover:underline">
              All patterns
            </Link>
          </div>
          {openPatterns.length === 0 ? (
            <Card>
              <EmptyState title="No open patterns" body="When 3 or more residents have a new symptom in the same domain within 72 hours, it appears here for review." icon={<CheckCircle2 size={22} />} />
            </Card>
          ) : (
            <div className="grid gap-4">
              {openPatterns.map((c) => (
                <PatternCard key={c.id} cluster={c} status={patternStatus[c.id] ?? 'new'} compact={role === 'nurse'} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="attention">
          <Card className="h-full">
            <CardHeader
              title={<span id="attention">{role === 'head_nurse' ? 'Needs attention — review queue' : role === 'nurse' ? 'My alerts' : 'Requests for me'}</span>}
              subtitle={`${openAlerts.filter((a) => !a.read).length} unread · ${openAlerts.length} open`}
              icon={<TriangleAlert size={18} aria-hidden="true" />}
              action={
                <Link to="/alerts" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              }
            />
            <div className="p-2">
              {openAlerts.length === 0 ? (
                <EmptyState title="Nothing needs attention" body="Open alerts visible to your role will appear here." />
              ) : (
                openAlerts.slice(0, 7).map((a) => <AlertRow key={a.id} alert={a} now={now} />)
              )}
            </div>
          </Card>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Symptom onsets — last 7 days" subtitle="First documented GI or respiratory symptom per resident" />
          <div className="p-5 md:p-6">
            <OnsetChart data={onsetData} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Unit activity — documented changes" subtitle="Count of observations flagged as a change from baseline, by unit and day" />
          <div className="p-5 md:p-6">
            <UnitHeatmap dayKeys={heat.dayKeys} cells={heat.cells} />
          </div>
        </Card>
      </div>
      <p className="mt-6 text-center text-xs text-ink-muted">
        All counts are computed from synthetic demo data. Ripple surfaces documented changes for human review; it does not diagnose.
      </p>
    </div>
  );
}

function NurseShift({ now }: { now: string }) {
  const { changes, observations } = useAnalysis();
  const alerts = useVisibleAlerts();
  const assessments = useRippleStore((s) => s.assessments);
  const me = ROLE_USER.nurse;
  const unit = STAFF_BY_ID[me].unit;
  const mine = RESIDENTS.filter((r) => r.unit === unit);
  const changed = changes.filter((c) => RESIDENT_BY_ID[c.residentId].unit === unit);
  const assigned = alerts.filter((a) => a.assignedTo === me && a.status !== 'resolved');
  const signoffs = assessments.filter((a) => a.status === 'needs_review');
  const noSleep = mine.filter((r) => !observations.some((o) => o.residentId === r.id && o.category === 'sleep' && o.flag !== 'not_assessed' && withinHours(o.observedAt, 12, now)));

  const tasks = [
    ...changed.map((c) => ({ key: c.key, to: `/residents/${c.residentId}`, resident: c.residentId, text: `Review documented change in ${c.domains.map((d) => CATEGORY_LABEL[d].toLowerCase()).join(' & ')}`, tone: 'review' as const })),
    ...assigned.map((a) => ({ key: a.id, to: `/alerts?id=${a.id}`, resident: a.residentIds[0], text: `Assigned to you: ${a.title}`, tone: 'blue' as const })),
    ...signoffs.map((a) => ({ key: a.id, to: `/assessments/${a.id}`, resident: a.residentId, text: 'Assessment awaiting nurse sign-off', tone: 'blue' as const })),
    ...noSleep.slice(0, 4).map((r) => ({ key: `sleep-${r.id}`, to: `/notes?resident=${r.id}`, resident: r.id, text: 'No sleep record for last night — document if observed', tone: 'neutral' as const })),
  ];

  return (
    <Card className="mt-6">
      <CardHeader
        title={`My residents · Unit ${unit} · My shift`}
        subtitle={`${mine.length} residents · ${changed.length} with documented changes · ${tasks.length} tasks`}
        icon={<ClipboardList size={18} aria-hidden="true" />}
        action={
          <Link to={`/residents?unit=${unit}`} className="text-sm font-medium text-primary hover:underline">
            My residents
          </Link>
        }
      />
      <ul className="divide-y divide-line">
        {tasks.map((t) => (
          <li key={t.key}>
            <Link to={t.to} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas md:px-6">
              <ResidentAvatar resident={RESIDENT_BY_ID[t.resident]} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{residentName(t.resident)}</span>
                <span className="block text-sm text-ink-muted">{t.text}</span>
              </span>
              <Badge tone={t.tone}>{t.tone === 'review' ? 'Review' : t.tone === 'blue' ? 'Action' : 'Documentation'}</Badge>
              <ArrowRight size={16} className="text-ink-faint" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AssessorQueue() {
  const assessments = useRippleStore((s) => s.assessments).filter((a) => a.status !== 'completed');
  return (
    <Card className="mt-6">
      <CardHeader
        title="My assessment queue"
        subtitle={`${assessments.length} open · DOS-inspired observation categories (not a validated scale)`}
        icon={<ClipboardCheck size={18} aria-hidden="true" />}
        action={
          <Link to="/assessments" className="text-sm font-medium text-primary hover:underline">
            Open queue
          </Link>
        }
      />
      <ul className="divide-y divide-line">
        {assessments.map((a) => (
          <li key={a.id}>
            <Link to={`/assessments/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas md:px-6">
              <ResidentAvatar resident={RESIDENT_BY_ID[a.residentId]} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{residentName(a.residentId)}</span>
                <span className="block truncate text-sm text-ink-muted">{a.reason}</span>
              </span>
              <AssessmentStatusBadge status={a.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
