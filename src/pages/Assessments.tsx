import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, ClipboardCheck, TriangleAlert } from 'lucide-react';
import type { AssessmentStatus } from '@/types';
import { useRippleStore } from '@/store/useRippleStore';
import { RESIDENT_BY_ID } from '@/data/residents';
import { staffName } from '@/data/staff';
import { ASSESSMENT_ITEMS } from '@/lib/assessmentItems';
import { relative } from '@/lib/time';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Caveat, EmptyState, PageHeader } from '@/components/ui/misc';
import { AssessmentStatusBadge, ResidentAvatar } from '@/components/badges';
import { useNow } from '@/store/selectors';

type Filter = 'open' | AssessmentStatus | 'all';

export default function Assessments() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get('status') as Filter) ?? 'open';
  const assessments = useRippleStore((s) => s.assessments);
  const now = useNow();
  const navigate = useNavigate();
  const count = (f: Filter) => assessments.filter((a) => match(a.status, f)).length;
  function match(s: AssessmentStatus, f: Filter) {
    return f === 'all' || (f === 'open' ? s !== 'completed' : s === f);
  }
  const rows = assessments.filter((a) => match(a.status, filter)).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  return (
    <div>
      <PageHeader title="Assessments" subtitle="Behavioural review queue for assessors and nurses. Uses DOS-inspired observation categories as labels only — this is not the validated DOS scale and no clinical score is computed." />
      <Tabs<Filter>
        label="Assessment status"
        value={filter}
        onChange={(f) => setParams(f === 'open' ? {} : { status: f }, { replace: true })}
        tabs={[
          { id: 'open', label: 'Open', count: count('open') },
          { id: 'not_started', label: 'Not started', count: count('not_started') },
          { id: 'in_progress', label: 'In progress', count: count('in_progress') },
          { id: 'needs_review', label: 'Needs review', count: count('needs_review') },
          { id: 'completed', label: 'Completed', count: count('completed') },
        ]}
      />
      <Card className="mt-5">
        {rows.length === 0 ? (
          <EmptyState title="Nothing in this queue" body="Assessments appear here when the care team requests a behavioural review." icon={<ClipboardCheck size={22} />} />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas/70">
                  <tr>
                    <th className="table-th">Resident</th>
                    <th className="table-th">Reason</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Progress</th>
                    <th className="table-th">Requested</th>
                    <th className="table-th">Assigned to</th>
                    <th className="table-th"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const r = RESIDENT_BY_ID[a.residentId];
                    const answered = Object.values(a.responses).filter((x) => x.answer).length;
                    return (
                      <tr key={a.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-primary-soft/40" onClick={() => navigate(`/assessments/${a.id}`)}>
                        <td className="table-td">
                          <div className="flex items-center gap-3">
                            <ResidentAvatar resident={r} size={32} />
                            <div>
                              <Link to={`/assessments/${a.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary hover:underline">
                                {r.firstName} {r.lastName}
                              </Link>
                              <p className="text-xs text-ink-muted">Room {r.room} · Unit {r.unit}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-td max-w-[320px]">{a.reason}</td>
                        <td className="table-td">
                          <div className="flex flex-col items-start gap-1">
                            <AssessmentStatusBadge status={a.status} />
                            {a.reviewRequired && a.status !== 'completed' && <Badge tone="review" icon={<TriangleAlert size={12} aria-hidden="true" />}>Review required</Badge>}
                          </div>
                        </td>
                        <td className="table-td tabular-nums">{answered}/{ASSESSMENT_ITEMS.length}</td>
                        <td className="table-td whitespace-nowrap">{relative(a.requestedAt, now)}<p className="text-xs text-ink-muted">by {staffName(a.requestedBy)}</p></td>
                        <td className="table-td">{staffName(a.assignedTo)}</td>
                        <td className="table-td"><ChevronRight size={18} className="text-ink-faint" aria-hidden="true" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="grid divide-y divide-line md:grid-cols-2 md:divide-y-0 md:gap-px md:bg-line lg:hidden">
              {rows.map((a) => {
                const r = RESIDENT_BY_ID[a.residentId];
                return (
                  <li key={a.id} className="bg-white">
                    <Link to={`/assessments/${a.id}`} className="flex gap-3 p-4">
                      <ResidentAvatar resident={r} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{r.firstName} {r.lastName}</p>
                        <p className="text-sm text-ink-muted">{a.reason}</p>
                        <div className="mt-2"><AssessmentStatusBadge status={a.status} /></div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
      <div className="mt-4">
        <Caveat tone="info">“Not assessed” is recorded explicitly and is never treated as “No”. Submissions with unassessed key domains (attention, sleep/wake, mood) are marked <strong>review required</strong>.</Caveat>
      </div>
    </div>
  );
}
