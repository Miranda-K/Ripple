import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, PenLine } from 'lucide-react';
import { useRippleStore } from '@/store/useRippleStore';
import { RESIDENT_BY_ID, residentName } from '@/data/residents';
import { staffName } from '@/data/staff';
import { fmtDateTime } from '@/lib/time';
import { NoteCapture } from '@/components/NoteCapture';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, PageHeader, SearchInput } from '@/components/ui/misc';
import { SourceChip } from '@/components/badges';

type Tab = 'add' | 'history';

export default function CareNotes() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'add';
  const notes = useRippleStore((s) => s.notes);
  const [q, setQ] = useState('');
  const captureKey = `${params.get('resident') ?? ''}|${params.get('script') ?? ''}`;

  const list = notes.filter((n) => {
    const t = q.trim().toLowerCase();
    return !t || `${residentName(n.residentId)} ${n.editedText}`.toLowerCase().includes(t);
  });

  return (
    <div>
      <PageHeader title="Care notes" subtitle="Add a note by voice or text. Review before saving." />
      <Tabs<Tab>
        label="Care notes"
        value={tab}
        onChange={(t) => setParams(t === 'add' ? {} : { tab: t }, { replace: true })}
        tabs={[
          { id: 'add', label: 'Add note' },
          { id: 'history', label: 'History', count: notes.length },
        ]}
      />
      {tab === 'add' && (
        <TabPanel id="add">
          <NoteCapture key={captureKey} initialResident={params.get('resident') ?? undefined} initialScript={params.get('script') ?? undefined} />
        </TabPanel>
      )}
      {tab === 'history' && (
        <TabPanel id="history">
          <SearchInput value={q} onChange={setQ} label="Search notes" placeholder="Search by resident or text…" className="mb-4 max-w-md" />
          {list.length === 0 ? (
            <Card>
              <EmptyState title="No notes found" icon={<FileText size={22} />} />
            </Card>
          ) : (
            <div className="space-y-3">
              {list.map((n) => {
                const r = RESIDENT_BY_ID[n.residentId];
                return (
                  <Card key={n.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/residents/${n.residentId}?tab=timeline&note=${n.id}`} className="font-semibold text-primary hover:underline">
                        {r.firstName} {r.lastName}
                      </Link>
                      <span className="text-sm text-ink-muted">Room {r.room} · Unit {r.unit}</span>
                      <SourceChip type={n.sourceType} />
                      {n.inputMode === 'voice' && <Badge tone="blue">Dictated</Badge>}
                      {n.editedText !== n.originalText && <Badge tone="outline" icon={<PenLine size={12} aria-hidden="true" />}>Edited</Badge>}
                      {n.observationIds.length > 0 && <Badge tone="neutral">{n.observationIds.length} structured</Badge>}
                    </div>
                    <p className="mt-2">{n.editedText}</p>
                    {n.editedText !== n.originalText && (
                      <details className="mt-2 text-sm text-ink-muted">
                        <summary className="cursor-pointer">Original transcript</summary>
                        <p className="mt-1 italic">{n.originalText}</p>
                      </details>
                    )}
                    <p className="mt-2 text-xs text-ink-muted">
                      Event {fmtDateTime(n.eventTime)} · entered {fmtDateTime(n.createdAt)} by {staffName(n.authorId)}
                      {n.reviewerId && ` · reviewed by ${staffName(n.reviewerId)}`}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}
        </TabPanel>
      )}
    </div>
  );
}
