import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, CircleDashed, Users, Waves } from 'lucide-react';
import { useAnalysis, useNow } from '@/store/selectors';
import { RESIDENTS } from '@/data/residents';
import { staffName } from '@/data/staff';
import { CATEGORY_LABEL } from '@/lib/analytics';
import { summarize, type ChangeStatus, type ResidentSummary } from '@/lib/residentSummary';
import { relative } from '@/lib/time';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, PageHeader, SearchInput, Select } from '@/components/ui/misc';
import { ResidentAvatar, SourceChip } from '@/components/badges';

const STATUS_LABEL: Record<ChangeStatus | 'all', string> = {
  all: 'All residents',
  changed: 'New individual change',
  pattern: 'Part of a pattern',
  missing: 'Missing recent documentation',
  stable: 'No current flags',
};

function Indicators({ s }: { s: ResidentSummary }) {
  if (!s.changeDomains.length && !s.patternDomains.length && !s.missingDomains.length) return <Badge tone="ok">No current flags</Badge>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {s.changeDomains.map((d) => (
        <Badge key={d} tone="review">
          {CATEGORY_LABEL[d]} change
        </Badge>
      ))}
      {s.patternDomains.map((d) => (
        <Badge key={d} tone="navy" icon={<Waves size={12} aria-hidden="true" />}>
          {d === 'gi' ? 'GI pattern' : 'Respiratory pattern'}
        </Badge>
      ))}
      {s.missingDomains.length > 0 && (
        <Badge tone="outline" icon={<CircleDashed size={12} aria-hidden="true" />}>
          No recent {s.missingDomains.map((d) => CATEGORY_LABEL[d].toLowerCase()).join(', ')} record
        </Badge>
      )}
    </div>
  );
}

export function ResidentTable({ rows, now }: { rows: ResidentSummary[]; now: string }) {
  const navigate = useNavigate();
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Residents</caption>
          <thead className="border-b border-line bg-canvas/70">
            <tr>
              <th scope="col" className="table-th">Resident</th>
              <th scope="col" className="table-th">Room / unit</th>
              <th scope="col" className="table-th">Last observation</th>
              <th scope="col" className="table-th">Change indicators</th>
              <th scope="col" className="table-th">Assigned nurse</th>
              <th scope="col" className="table-th"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const r = s.resident;
              return (
                <tr key={r.id} onClick={() => navigate(`/residents/${r.id}`)} className="cursor-pointer border-b border-line last:border-0 hover:bg-primary-soft/40">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <ResidentAvatar resident={r} />
                      <div>
                        <Link to={`/residents/${r.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-ink hover:text-primary hover:underline">
                          {r.firstName} {r.lastName}
                        </Link>
                        <p className="text-xs text-ink-muted">{r.id} · {r.age} y</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">Room {r.room} · Unit {r.unit}</td>
                  <td className="table-td">
                    {s.lastObservation ? (
                      <div className="space-y-1">
                        <p>{relative(s.lastObservation.observedAt, now)}</p>
                        <SourceChip type={s.lastObservation.sourceType} />
                      </div>
                    ) : (
                      <span className="text-ink-muted">No records</span>
                    )}
                  </td>
                  <td className="table-td max-w-[320px]"><Indicators s={s} /></td>
                  <td className="table-td">{staffName(r.assignedNurseId)}</td>
                  <td className="table-td text-right">
                    <ChevronRight size={18} className="inline text-ink-faint" aria-hidden="true" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <ul className="grid divide-y divide-line md:grid-cols-2 md:divide-y-0 md:gap-px md:bg-line lg:hidden">
        {rows.map((s) => (
          <li key={s.resident.id} className="bg-white">
            <Link to={`/residents/${s.resident.id}`} className="flex gap-3 p-4">
              <ResidentAvatar resident={s.resident} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.resident.firstName} {s.resident.lastName}</p>
                <p className="text-xs text-ink-muted">Room {s.resident.room} · Unit {s.resident.unit} · {staffName(s.resident.assignedNurseId)}</p>
                <div className="mt-2"><Indicators s={s} /></div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Residents() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const unit = params.get('unit') ?? 'all';
  const status = (params.get('status') ?? 'all') as ChangeStatus | 'all';
  const now = useNow();
  const { observations, changes, clusters } = useAnalysis();
  const all = useMemo(() => summarize(RESIDENTS, observations, changes, clusters, now), [observations, changes, clusters, now]);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (!v || v === 'all') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const rows = all.filter((s) => {
    const r = s.resident;
    const t = q.trim().toLowerCase();
    if (t && !`${r.firstName} ${r.lastName} ${r.preferredName ?? ''} ${r.id} ${r.room}`.toLowerCase().includes(t)) return false;
    if (unit !== 'all' && r.unit !== unit) return false;
    if (status !== 'all' && !s.statuses.includes(status)) return false;
    return true;
  });
  const filtered = q || unit !== 'all' || status !== 'all';

  return (
    <div>
      <PageHeader title="Residents" subtitle={`${RESIDENTS.length} residents · Changes compared with each person’s baseline.`} />
      <Card>
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1fr_180px_260px_auto] md:items-end md:p-5">
          <SearchInput value={q} onChange={(v) => set('q', v)} label="Search residents" placeholder="Name, ID or room…" />
          <Select label="Unit" value={unit} onChange={(e) => set('unit', e.target.value)}>
            <option value="all">All units</option>
            {['A', 'B', 'C', 'D'].map((u) => (
              <option key={u} value={u}>Unit {u}</option>
            ))}
          </Select>
          <Select label="Change status" value={status} onChange={(e) => set('status', e.target.value)}>
            {(Object.keys(STATUS_LABEL) as (ChangeStatus | 'all')[]).map((k) => (
              <option key={k} value={k}>{STATUS_LABEL[k]}</option>
            ))}
          </Select>
          <Button variant="ghost" onClick={() => setParams({}, { replace: true })} disabled={!filtered}>
            Clear filters
          </Button>
        </div>
        <p className="px-5 pt-3 text-sm text-ink-muted" aria-live="polite">
          Showing {rows.length} of {RESIDENTS.length} residents
        </p>
        {rows.length === 0 ? (
          <EmptyState title="No residents match these filters" body="Try a different name, unit or status." icon={<Users size={22} />} action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Clear filters</Button>} />
        ) : (
          <ResidentTable rows={rows} now={now} />
        )}
      </Card>
    </div>
  );
}
