import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BellRing, CheckCircle2, FileSearch, Waves, X } from 'lucide-react';
import type { Observation, PatternStatus } from '@/types';
import { useRippleStore } from '@/store/useRippleStore';
import { useAnalysis, useCurrentUser } from '@/store/selectors';
import { RESIDENT_BY_ID, RESIDENTS, residentName } from '@/data/residents';
import { EXPOSURE_BY_ID, EXPOSURES, RESIDENT_EXPOSURES } from '@/data/exposures';
import { CATEGORY_LABEL, exposureComparisons, residentsMissing, RULES } from '@/lib/analytics';
import { fmtDateTime, parse, DEMO_NOW } from '@/lib/time';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Caveat, EmptyState, Field, PageHeader, Select, Skeleton } from '@/components/ui/misc';
import { PatternStatusBadge, PATTERN_STATUS_LABEL, ObservationBadge, SourceChip } from '@/components/badges';
import { UnitDistribution } from '@/components/cards';
import { ExposureGraph, type GraphSelection } from '@/components/pattern/ExposureGraph';
import { EvidenceDrawer } from '@/components/EvidenceDrawer';
import { useSimulatedLoading } from '@/hooks/useSimulatedLoading';

export default function PatternExplorer() {
  const loading = useSimulatedLoading(300);
  const [params, setParams] = useSearchParams();
  const { role } = useCurrentUser();
  const { observations, clusters } = useAnalysis();
  const patternStatus = useRippleStore((s) => s.patternStatus);
  const setPatternStatus = useRippleStore((s) => s.setPatternStatus);
  const markResidentRecovered = useRippleStore((s) => s.markResidentRecovered);
  const alerts = useRippleStore((s) => s.alerts);
  const [recoveringResidentId, setRecoveringResidentId] = useState<string | null>(null);
  const [recoveryNote, setRecoveryNote] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const range = Number(params.get('range') ?? 7);
  const domain = params.get('domain') ?? 'all';
  const unit = params.get('unit') ?? 'all';
  const status = params.get('status') ?? 'all';
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v === null || v === 'all') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const filtered = clusters.filter((c) => {
    if (domain !== 'all' && c.domain !== domain) return false;
    if (unit !== 'all' && !c.residentIds.some((id) => RESIDENT_BY_ID[id].unit === unit)) return false;
    if (status !== 'all' && (patternStatus[c.id] ?? 'new') !== status) return false;
    if (parse(DEMO_NOW) - parse(c.lastOnset) > range * 86_400_000) return false;
    return true;
  });
  const selectedId = params.get('pattern') ?? filtered[0]?.id;
  const cluster = filtered.find((c) => c.id === selectedId) ?? filtered[0];

  const comparisons = useMemo(() => (cluster ? exposureComparisons(cluster, EXPOSURES, RESIDENT_EXPOSURES, RESIDENTS) : []), [cluster]);
  const [selection, setSelection] = useState<GraphSelection>(null);
  const [drawer, setDrawer] = useState<{ title: string; obs: Observation[] } | null>(null);

  if (loading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-6 h-16 rounded-card" />
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      </div>
    );
  }

  const evidenceAll = cluster ? observations.filter((o) => cluster.evidenceIds.includes(o.id)) : [];
  const evidence = evidenceAll.filter((o) => {
    if (!selection) return true;
    if (selection.kind === 'resident') return o.residentId === selection.id;
    return RESIDENT_EXPOSURES.some((re) => re.exposureId === selection.id && re.residentId === o.residentId && re.attendance === 'attended');
  });
  const selectionLabel = selection
    ? selection.kind === 'resident'
      ? residentName(selection.id)
      : EXPOSURE_BY_ID[selection.id]?.name
    : null;
  const alert = cluster && alerts.find((a) => a.patternId === cluster.id && a.status !== 'resolved');
  const missing = cluster ? residentsMissing(observations, RESIDENTS, cluster.domain).length : 0;
  const domainLabel = cluster?.domain === 'gi' ? 'GI' : 'respiratory';
  const topComparison = comparisons[0];
  const affectedAttendees = cluster && topComparison
    ? cluster.residentIds.filter((id) =>
        RESIDENT_EXPOSURES.some((record) => record.exposureId === topComparison.exposure.id && record.residentId === id && record.attendance === 'attended'),
      )
    : [];

  return (
    <div>
      <PageHeader
        title="Pattern Explorer"
        subtitle="New symptom groups and possible shared exposures. For review, not proof of cause."
      />

      <Card className="mb-6 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="group" aria-label="Pattern filters">
          <Select label="Date range" value={String(range)} onChange={(e) => setParam('range', e.target.value === '7' ? null : e.target.value)}>
            <option value="3">Last 3 days</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </Select>
          <Select label="Symptom domain" value={domain} onChange={(e) => setParam('domain', e.target.value)}>
            <option value="all">All domains</option>
            <option value="gi">Gastrointestinal</option>
            <option value="respiratory">Respiratory</option>
          </Select>
          <Select label="Unit" value={unit} onChange={(e) => setParam('unit', e.target.value)}>
            <option value="all">All units</option>
            {['A', 'B', 'C', 'D'].map((u) => (
              <option key={u} value={u}>Unit {u}</option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="all">All statuses</option>
            {(Object.keys(PATTERN_STATUS_LABEL) as PatternStatus[]).map((s) => (
              <option key={s} value={s}>{PATTERN_STATUS_LABEL[s]}</option>
            ))}
          </Select>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Pattern list */}
        <aside aria-label="Discovered patterns" className="xl:col-span-2 2xl:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-ink-muted">Discovered patterns ({filtered.length})</h2>
          {filtered.length === 0 ? (
            <Card>
              <EmptyState title="No patterns match" body="Adjust the filters above." icon={<Waves size={22} />} action={<Button variant="secondary" size="sm" onClick={() => setParams({}, { replace: true })}>Reset filters</Button>} />
            </Card>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-1">
              {filtered.map((c) => {
                const active = c.id === cluster?.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setSelection(null);
                        const next = new URLSearchParams(params);
                        next.set('pattern', c.id);
                        next.delete('exposure');
                        setParams(next, { replace: true });
                      }}
                      aria-current={active}
                      className={`w-full rounded-card border bg-white p-4 text-left shadow-card transition ${active ? 'border-primary ring-2 ring-primary-ring' : 'border-line hover:border-primary/40'}`}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone="navy">{c.domain === 'gi' ? 'GI' : 'Respiratory'}</Badge>
                        <PatternStatusBadge status={patternStatus[c.id] ?? 'new'} />
                      </div>
                      <p className="mt-2 font-semibold leading-snug">{c.title}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {fmtDateTime(c.firstOnset)} → {fmtDateTime(c.lastOnset)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            <strong className="text-ink">Detection rule:</strong> {RULES.cluster}.
          </p>
        </aside>

        {/* Workspace */}
        <section aria-label="Pattern workspace" className="min-w-0">
          {!cluster ? (
            <Card><EmptyState title="Select a pattern" body="Choose a pattern on the left to investigate." /></Card>
          ) : (
            <Card>
              <div className="border-b border-line p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="outline">Hypothesis for review</Badge>
                      <PatternStatusBadge status={patternStatus[cluster.id] ?? 'new'} />
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">{cluster.title}</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      {cluster.residentIds.length} residents · first onset {fmtDateTime(cluster.firstOnset)} · latest {fmtDateTime(cluster.lastOnset)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    {role === 'head_nurse' && (
                      <Select label="Pattern status" value={patternStatus[cluster.id] ?? 'new'} onChange={(e) => setPatternStatus(cluster.id, e.target.value as PatternStatus)} className="w-60">
                        {(Object.keys(PATTERN_STATUS_LABEL) as PatternStatus[]).map((s) => (
                          <option key={s} value={s}>{PATTERN_STATUS_LABEL[s]}</option>
                        ))}
                      </Select>
                    )}
                    {alert && (
                      <ButtonLink to={`/alerts?id=${alert.id}`} variant="secondary" icon={<BellRing size={16} aria-hidden="true" />}>
                        Open alert & assign
                      </ButtonLink>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2" aria-label="Affected residents">
                  {cluster.residentIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas p-1 pl-3">
                      <Link to={`/residents/${id}?tab=timeline`} className="text-sm font-medium hover:text-primary">
                        {residentName(id)} <span className="text-ink-muted">· {RESIDENT_BY_ID[id].room}</span>
                      </Link>
                      {(role === 'nurse' || role === 'head_nurse') && (
                        <Button size="sm" variant="subtle" icon={<CheckCircle2 size={14} aria-hidden="true" />} onClick={() => { setRecoveringResidentId(id); setRecoveryNote(''); setRecoveryError(null); }}>
                          Mark recovered
                        </Button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-5 md:p-6">
                <ExposureGraph cluster={cluster} comparison={topComparison} residentExposures={RESIDENT_EXPOSURES} selection={selection} onSelect={setSelection} />
                {topComparison && (
                  <section aria-labelledby="pattern-suggestions-title" className="mt-6 border-t border-line pt-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 id="pattern-suggestions-title" className="text-base font-semibold">Suggested review steps</h3>
                      <Badge tone="outline">Rule-based demo</Badge>
                    </div>
                    <p className="mt-2 rounded-lg bg-canvas p-3 text-sm leading-relaxed text-ink-muted">
                      The leading documented exposure is <strong className="text-ink">{topComparison.exposure.name}</strong> at {topComparison.exposure.location}.
                      {' '}{topComparison.exposedSymptomatic}/{topComparison.exposedTotal} affected residents with documented attendance, compared with {topComparison.unexposedSymptomatic}/{topComparison.unexposedTotal} documented non-attendees; {topComparison.unknownTotal} attendance records are unknown.
                      {' '}This is a signal to review, not proof of cause.
                    </p>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-line p-4">
                        <h4 className="text-sm font-semibold">Affected residents who attended</h4>
                        {affectedAttendees.length > 0 ? (
                          <ul className="mt-2 space-y-2">
                            {affectedAttendees.map((id) => (
                              <li key={id}>
                                <Link to={`/residents/${id}?tab=timeline`} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                                  {residentName(id)} · Room {RESIDENT_BY_ID[id].room}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-ink-muted">No affected residents have documented attendance for this event.</p>
                        )}
                      </div>
                      <div className="rounded-lg border border-line p-4">
                        <h4 className="text-sm font-semibold">What to review</h4>
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                          <li>Confirm event details and attendance. Follow up on unknown records.</li>
                          <li>Continue routine symptom checks and document changes per facility protocol.</li>
                          <li>For a meal, ask the dietary or food-safety lead to review menu and preparation records.</li>
                          <li>Share the pattern with the clinical or infection-prevention lead.</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Caveat tone="info">
                        Rule-based demo prompts, not AI or clinical advice. This comparison does not establish cause or authorize isolation or menu changes.
                      </Caveat>
                    </div>
                  </section>
                )}
              </div>
            </Card>
          )}
        </section>

        {/* Evidence panel */}
        <aside aria-label="Evidence and exposure panel">
          {cluster && (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">Evidence</h2>
                  <span className="text-sm text-ink-muted">{evidence.length} records</span>
                </div>
                {selectionLabel && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone="blue">Filtered: {selectionLabel}</Badge>
                    <button onClick={() => setSelection(null)} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-primary hover:bg-primary-soft">
                      <X size={12} aria-hidden="true" /> Clear
                    </button>
                  </div>
                )}
                <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {evidence.map((o) => (
                    <li key={o.id} className="rounded-lg border border-line p-3">
                      <p className="text-sm font-medium">{residentName(o.residentId)}</p>
                      <p className="text-sm">{CATEGORY_LABEL[o.category]}: {o.value}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <ObservationBadge flag={o.flag} short />
                        <SourceChip type={o.sourceType} />
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">Event {fmtDateTime(o.observedAt)} · entered {fmtDateTime(o.recordedAt)}</p>
                    </li>
                  ))}
                  {evidence.length === 0 && <li className="text-sm text-ink-muted">No records for this selection.</li>}
                </ul>
                <Button className="mt-3 w-full" variant="secondary" icon={<FileSearch size={16} aria-hidden="true" />} onClick={() => setDrawer({ title: selectionLabel ?? cluster.title, obs: evidence })}>
                  View source records
                </Button>
              </Card>
              <Card className="p-5">
                <h2 className="text-base font-semibold">Location distribution</h2>
                <div className="mt-3">
                  <UnitDistribution dist={cluster.unitDistribution} />
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="text-base font-semibold">Uncertainty & missing data</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
                  <li>{missing} residents have no {domainLabel} screen documented in the last 72 h. Missing is not the same as symptom-free.</li>
                  <li>Onset = first documentation; true onset may be earlier.</li>
                  <li>No laboratory results are available in this demo dataset.</li>
                  <li>Small groups: one resident changes rates substantially.</li>
                </ul>
                <div className="mt-3">
                  <Caveat tone="info">Ripple does not determine causes. Follow your facility’s infection-prevention policy for any clinical action.</Caveat>
                </div>
              </Card>
            </div>
          )}
        </aside>
      </div>
      <Dialog
        open={!!recoveringResidentId}
        onClose={() => { setRecoveringResidentId(null); setRecoveryError(null); }}
        title="Record resident recovery?"
        description="This records that the resident's symptoms in this pattern have returned to their usual baseline. Their original observations remain in the record; symptoms documented after this time can count as a new onset."
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRecoveringResidentId(null); setRecoveryError(null); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (!recoveringResidentId || !cluster) return;
                try {
                  markResidentRecovered(recoveringResidentId, cluster.domain, cluster.id, recoveryNote);
                  setRecoveringResidentId(null);
                  setRecoveryNote('');
                  setRecoveryError(null);
                  setSelection(null);
                } catch (error) {
                  setRecoveryError(error instanceof Error ? error.message : 'Could not record recovery.');
                }
              }}
            >
              Confirm recovery
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm font-medium">{recoveringResidentId ? residentName(recoveringResidentId) : ''} · {cluster?.domain === 'gi' ? 'Gastrointestinal' : 'Respiratory'} symptoms</p>
          <Field label="Optional note" htmlFor="recovery-note" hint="This note is kept in the pattern audit trail." error={recoveryError ?? undefined}>
            <textarea id="recovery-note" className="input min-h-[88px] py-2" value={recoveryNote} onChange={(event) => { setRecoveryNote(event.target.value); setRecoveryError(null); }} placeholder="Add brief context for the care team." data-autofocus />
          </Field>
        </div>
      </Dialog>
      <EvidenceDrawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer?.title ?? ''} observations={drawer?.obs ?? []} />
    </div>
  );
}
