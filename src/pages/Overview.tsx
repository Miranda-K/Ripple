import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2, ClipboardCheck, ClipboardList, NotebookPen, TriangleAlert, Users, Waves } from 'lucide-react';
import { useRippleStore } from '@/store/useRippleStore';
import { useAnalysis, useCurrentUser, useNow, useVisibleAlerts } from '@/store/selectors';
import { RESIDENT_BY_ID, RESIDENTS, residentName } from '@/data/residents';
import { ROLE_LABEL, ROLE_USER, STAFF_BY_ID } from '@/data/staff';
import { CATEGORY_LABEL } from '@/lib/analytics';
import { withinHours } from '@/lib/time';
import { MetricCard, PatternCard, AlertRow } from '@/components/cards';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { AssessmentStatusBadge, ResidentAvatar } from '@/components/badges';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { useSimulatedLoading } from '@/hooks/useSimulatedLoading';
import type { UserRole } from '@/types';

const SUBTITLE: Record<UserRole, string> = {
  head_nurse: 'Patterns and alerts across all units.',
  nurse: 'Your Unit A residents and tasks.',
  assessor: 'Open assessment requests.',
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
  const { changes, clusters } = useAnalysis();
  const patternStatus = useRippleStore((s) => s.patternStatus);
  const assessments = useRippleStore((s) => s.assessments);
  const alerts = useVisibleAlerts();
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
            Welcome, {firstName}
          </h1>
          <p className="mt-1 max-w-2xl text-ink-muted">{SUBTITLE[role]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/notes" variant="secondary" icon={<NotebookPen size={18} aria-hidden="true" />}>
            Add note
          </ButtonLink>
          <ButtonLink to="/patterns" icon={<Waves size={18} aria-hidden="true" />}>
            Patterns
          </ButtonLink>
        </div>
      </div>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard label="Residents" value={RESIDENTS.length} icon={<Users size={18} />} hint="Across 4 units" to="/residents" />
        <MetricCard label="New changes" value={changes.length} icon={<Activity size={18} />} hint="Past 72 hours" to="/residents?status=changed" />
        <MetricCard label="Open patterns" value={openPatterns.length} icon={<Waves size={18} />} hint="For review" to="/patterns" />
        <MetricCard label="Assessments" value={pendingAssessments.length} icon={<ClipboardCheck size={18} />} hint="Awaiting review" to="/assessments" />
      </section>

      {role === 'nurse' && <NurseShift now={now} />}
      {role === 'assessor' && <AssessorQueue />}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="emerging">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="emerging" className="text-base font-semibold">
              Patterns
            </h2>
            <Link to="/patterns" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {openPatterns.length === 0 ? (
            <Card>
              <EmptyState title="No open patterns" body="New patterns will appear here." icon={<CheckCircle2 size={22} />} />
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
              title={<span id="attention">{role === 'head_nurse' ? 'Review queue' : role === 'nurse' ? 'My alerts' : 'My requests'}</span>}
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
                <EmptyState title="All caught up" />
              ) : (
                openAlerts.slice(0, 7).map((a) => <AlertRow key={a.id} alert={a} now={now} />)
              )}
            </div>
          </Card>
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        Demo data only · For human review, not diagnosis
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
    ...changed.map((c) => ({ key: c.key, to: `/residents/${c.residentId}`, resident: c.residentId, text: `Review ${c.domains.map((d) => CATEGORY_LABEL[d].toLowerCase()).join(' & ')} change`, tone: 'review' as const })),
    ...assigned.map((a) => ({ key: a.id, to: `/alerts?id=${a.id}`, resident: a.residentIds[0], text: `Assigned: ${a.title}`, tone: 'blue' as const })),
    ...signoffs.map((a) => ({ key: a.id, to: `/assessments/${a.id}`, resident: a.residentId, text: 'Sign-off needed', tone: 'blue' as const })),
    ...noSleep.slice(0, 4).map((r) => ({ key: `sleep-${r.id}`, to: `/notes?resident=${r.id}`, resident: r.id, text: 'No sleep record — add if observed', tone: 'neutral' as const })),
  ];

  return (
    <Card className="mt-6">
      <CardHeader
        title={`Unit ${unit} · My shift`}
        subtitle={`${mine.length} residents · ${tasks.length} tasks`}
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
              <Badge tone={t.tone}>{t.tone === 'review' ? 'Review' : t.tone === 'blue' ? 'Action' : 'Note'}</Badge>
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
        title="Assessments"
        subtitle={`${assessments.length} open · Labels only, no score`}
        icon={<ClipboardCheck size={18} aria-hidden="true" />}
        action={
          <Link to="/assessments" className="text-sm font-medium text-primary hover:underline">
            View all
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
