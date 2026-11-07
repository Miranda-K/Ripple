import { Link } from 'react-router-dom';
import type { Observation } from '@/types';
import { useRippleStore } from '@/store/useRippleStore';
import { residentName } from '@/data/residents';
import { staffName } from '@/data/staff';
import { CATEGORY_LABEL } from '@/lib/analytics';
import { fmtDateTime } from '@/lib/time';
import { Drawer } from './ui/Dialog';
import { ObsStatusBadge, ObservationBadge, SourceChip } from './badges';
import { EmptyState } from './ui/misc';

/** Lists the underlying source records for any insight. */
export function EvidenceDrawer({ open, onClose, title, observations }: { open: boolean; onClose: () => void; title: string; observations: Observation[] }) {
  const notes = useRippleStore((s) => s.notes);
  const sorted = [...observations].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  return (
    <Drawer open={open} onClose={onClose} title="Source records" description={`${title} · ${sorted.length} record${sorted.length === 1 ? '' : 's'}`}>
      {sorted.length === 0 ? (
        <EmptyState title="No source records" body="This insight has no linked observations." />
      ) : (
        <ol className="space-y-3">
          {sorted.map((o) => {
            const note = notes.find((n) => n.id === o.sourceId);
            return (
              <li key={o.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/residents/${o.residentId}?tab=timeline`} className="font-semibold text-primary hover:underline" onClick={onClose}>
                    {residentName(o.residentId)}
                  </Link>
                  <span className="text-sm text-ink-muted">· {CATEGORY_LABEL[o.category]}</span>
                </div>
                <p className="mt-1 text-[15px]">{o.value}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <ObservationBadge flag={o.flag} />
                  <ObsStatusBadge status={o.status} />
                  <SourceChip type={o.sourceType} />
                </div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                  <dt className="font-medium text-ink">Event time</dt>
                  <dd>{fmtDateTime(o.observedAt)}</dd>
                  <dt className="font-medium text-ink">Entered</dt>
                  <dd>
                    {fmtDateTime(o.recordedAt)} by {staffName(o.recordedBy)}
                  </dd>
                  <dt className="font-medium text-ink">Source ID</dt>
                  <dd className="font-mono">{o.sourceId}</dd>
                </dl>
                {note && <blockquote className="mt-3 border-l-4 border-primary/40 bg-canvas px-3 py-2 text-sm italic">“{note.editedText}”</blockquote>}
              </li>
            );
          })}
        </ol>
      )}
    </Drawer>
  );
}
