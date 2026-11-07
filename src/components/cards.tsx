import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Users } from 'lucide-react';
import type { Alert, PatternCluster, PatternStatus, UnitId } from '@/types';
import { fmtDateTime, hoursBetween, relative } from '@/lib/time';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { ButtonLink } from './ui/Button';
import { AlertStatusBadge, AlertTypeBadge, PatternStatusBadge } from './badges';
import { staffName } from '@/data/staff';

export function MetricCard({ label, value, icon, hint, to }: { label: string; value: ReactNode; icon: ReactNode; hint?: ReactNode; to?: string }) {
  const body = (
    <Card className="h-full p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <span className="rounded-lg bg-primary-soft p-2 text-primary" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-navy tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-muted">{hint}</p>}
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-card">
      {body}
    </Link>
  ) : (
    body
  );
}

export function UnitDistribution({ dist }: { dist: Record<UnitId, number> }) {
  const max = Math.max(1, ...Object.values(dist));
  return (
    <div className="flex items-end gap-3" aria-label={`Location: ${Object.entries(dist).map(([u, n]) => `Unit ${u} ${n}`).join(', ')}`}>
      {(Object.keys(dist) as UnitId[]).map((u) => (
        <div key={u} className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold tabular-nums">{dist[u]}</span>
          <span className="flex h-8 w-6 items-end overflow-hidden rounded bg-canvas ring-1 ring-line" aria-hidden="true">
            <span className="w-full rounded-t bg-primary" style={{ height: `${(dist[u] / max) * 100}%` }} />
          </span>
          <span className="text-[11px] text-ink-muted">{u}</span>
        </div>
      ))}
    </div>
  );
}

export function PatternCard({ cluster, status, compact }: { cluster: PatternCluster; status: PatternStatus; compact?: boolean }) {
  const span = Math.round(hoursBetween(cluster.firstOnset, cluster.lastOnset));
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="navy">{cluster.domain === 'gi' ? 'Gastrointestinal' : 'Respiratory'}</Badge>
        <PatternStatusBadge status={status} />
        <Badge tone="outline">Hypothesis for review</Badge>
      </div>
      <h3 className="mt-3 text-[17px] font-semibold leading-snug">{cluster.title}</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <p className="label">First onset</p>
          <p className="mt-1 text-sm font-medium">{fmtDateTime(cluster.firstOnset)}</p>
        </div>
        <div>
          <p className="label">Latest onset</p>
          <p className="mt-1 text-sm font-medium">{fmtDateTime(cluster.lastOnset)}</p>
          <p className="text-xs text-ink-muted">span {span} h</p>
        </div>
        {!compact && (
          <div className="col-span-2 sm:col-span-1">
            <p className="label mb-1">By unit</p>
            <UnitDistribution dist={cluster.unitDistribution} />
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="flex items-center gap-4 text-sm text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Users size={16} aria-hidden="true" /> <strong className="text-ink">{cluster.residentIds.length}</strong> residents
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={16} aria-hidden="true" /> {cluster.scope === 'facility' ? 'Facility-wide' : `Unit ${cluster.scope}`}
          </span>
        </span>
        <ButtonLink to={`/patterns?pattern=${cluster.id}`} size="sm" icon={<ArrowRight size={16} aria-hidden="true" />}>
          Investigate
        </ButtonLink>
      </div>
    </Card>
  );
}

export function AlertRow({ alert, now }: { alert: Alert; now: string }) {
  return (
    <Link to={`/alerts?id=${alert.id}`} className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-canvas">
      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${alert.read ? 'bg-slate-300' : 'bg-primary'}`} aria-label={alert.read ? 'Read' : 'Unread'} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug">{alert.title}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
          <AlertTypeBadge type={alert.type} />
          <AlertStatusBadge status={alert.status} />
          <span>· {relative(alert.createdAt, now)}</span>
          {alert.assignedTo && <span>· {staffName(alert.assignedTo)}</span>}
        </span>
      </span>
      <ArrowRight size={16} className="mt-1 shrink-0 text-ink-faint" aria-hidden="true" />
    </Link>
  );
}
