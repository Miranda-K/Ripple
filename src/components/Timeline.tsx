import { useMemo, useState } from 'react';
import { CalendarClock, FileText, HeartPulse, PenLine } from 'lucide-react';
import type { ClinicalEvent, Note, Observation } from '@/types';
import { CATEGORY_LABEL } from '@/lib/analytics';
import { dayKey, fmtDate, fmtTime } from '@/lib/time';
import { staffName } from '@/data/staff';
import { ObsStatusBadge, ObservationBadge, SourceChip } from './badges';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/misc';

type Item =
  | { kind: 'obs'; at: string; obs: Observation }
  | { kind: 'note'; at: string; note: Note }
  | { kind: 'event'; at: string; event: ClinicalEvent };

const EVENT_LABEL: Record<ClinicalEvent['type'], string> = {
  vitals: 'Vitals',
  fall: 'Fall incident',
  physician_visit: 'Physician visit',
  medication_change: 'Medication schedule change',
  lab_request: 'Lab request',
  family_contact: 'Family contact',
};

function Times({ event, entry, by }: { event: string; entry: string; by: string }) {
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
      <span>
        <span className="font-medium text-ink">Event</span> {fmtDate(event)} {fmtTime(event)}
      </span>
      <span>
        <span className="font-medium text-ink">Entered</span> {fmtDate(entry)} {fmtTime(entry)} by {staffName(by)}
      </span>
    </p>
  );
}

export function Timeline({ observations, notes, events, highlightNoteId }: { observations: Observation[]; notes: Note[]; events: ClinicalEvent[]; highlightNoteId?: string }) {
  const [routine, setRoutine] = useState(false);
  const items = useMemo(() => {
    const obsInNotes = new Set(notes.flatMap((n) => n.observationIds));
    const list: Item[] = [
      ...observations.filter((o) => !obsInNotes.has(o.id) && (routine || o.flag !== 'normal')).map((o) => ({ kind: 'obs' as const, at: o.observedAt, obs: o })),
      ...notes.map((n) => ({ kind: 'note' as const, at: n.eventTime, note: n })),
      ...events.map((e) => ({ kind: 'event' as const, at: e.occurredAt, event: e })),
    ];
    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [observations, notes, events, routine]);
  const obsById = useMemo(() => new Map(observations.map((o) => [o.id, o])), [observations]);

  const groups = useMemo(() => {
    const g = new Map<string, Item[]>();
    items.forEach((i) => (g.get(dayKey(i.at)) ?? g.set(dayKey(i.at), []).get(dayKey(i.at))!).push(i));
    return [...g.entries()];
  }, [items]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">Newest first · event time (when it happened) is shown separately from entry time (when it was documented).</p>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={routine} onChange={(e) => setRoutine(e.target.checked)} className="h-4 w-4 accent-primary" />
          Show routine at-baseline observations
        </label>
      </div>
      {groups.length === 0 && <EmptyState title="No timeline entries" body="Notes, events and observations will appear here." />}
      <ol className="space-y-6">
        {groups.map(([day, list]) => (
          <li key={day}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <CalendarClock size={15} aria-hidden="true" /> {fmtDate(`${day}T12:00:00`)}
            </h3>
            <ol className="relative space-y-3 border-l-2 border-line pl-5">
              {list.map((it) => {
                if (it.kind === 'note') {
                  const n = it.note;
                  const extracted = n.observationIds.map((id) => obsById.get(id)).filter(Boolean) as Observation[];
                  return (
                    <li key={n.id} className={`relative rounded-xl border bg-white p-4 ${highlightNoteId === n.id ? 'border-primary ring-2 ring-primary-ring' : 'border-line'}`}>
                      <span className="absolute -left-[29px] top-5 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-canvas" aria-hidden="true" />
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText size={16} className="text-primary" aria-hidden="true" />
                        <span className="text-sm font-semibold">Care note</span>
                        <SourceChip type={n.sourceType} />
                        {n.inputMode === 'voice' && <Badge tone="blue">Dictated</Badge>}
                        {n.editedText !== n.originalText && <Badge tone="outline" icon={<PenLine size={12} aria-hidden="true" />}>Edited before save</Badge>}
                      </div>
                      <p className="mt-2 text-[15px] leading-relaxed">“{n.editedText}”</p>
                      <Times event={n.eventTime} entry={n.createdAt} by={n.authorId} />
                      {extracted.length > 0 && (
                        <div className="mt-3 rounded-lg bg-canvas p-3">
                          <p className="label mb-2">Structured observations ({extracted.length}) · reviewed by {staffName(n.reviewerId)}</p>
                          <ul className="space-y-1.5">
                            {extracted.map((o) => (
                              <li key={o.id} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium">{CATEGORY_LABEL[o.category]}:</span> {o.value}
                                <ObservationBadge flag={o.flag} short />
                                <ObsStatusBadge status={o.status} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                }
                if (it.kind === 'event') {
                  const e = it.event;
                  return (
                    <li key={e.id} className="relative rounded-xl border border-line bg-white p-4">
                      <span className="absolute -left-[29px] top-5 h-4 w-4 rounded-full bg-navy ring-4 ring-canvas" aria-hidden="true" />
                      <div className="flex flex-wrap items-center gap-2">
                        <HeartPulse size={16} className="text-navy" aria-hidden="true" />
                        <span className="text-sm font-semibold">{EVENT_LABEL[e.type]}</span>
                        <SourceChip type={e.sourceType} />
                      </div>
                      <p className="mt-1.5 text-sm">{e.description}</p>
                      <Times event={e.occurredAt} entry={e.recordedAt} by={e.recordedBy} />
                    </li>
                  );
                }
                const o = it.obs;
                return (
                  <li key={o.id} className="relative rounded-xl border border-line bg-white px-4 py-3">
                    <span className={`absolute -left-[27px] top-4 h-3 w-3 rounded-full ring-4 ring-canvas ${o.flag === 'change' ? 'bg-review' : 'bg-slate-300'}`} aria-hidden="true" />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{CATEGORY_LABEL[o.category]}</span>
                      <span>{o.value}</span>
                      <ObservationBadge flag={o.flag} short />
                      <SourceChip type={o.sourceType} />
                    </div>
                    <Times event={o.observedAt} entry={o.recordedAt} by={o.recordedBy} />
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
