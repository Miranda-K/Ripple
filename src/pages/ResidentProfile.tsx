import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Activity, ClipboardCheck, FileSearch, NotebookPen, PenLine, Waves } from 'lucide-react';
import type { ObservationCategory, Observation } from '@/types';
import { useRippleStore } from '@/store/useRippleStore';
import { useAnalysis, useNow } from '@/store/selectors';
import { RESIDENT_BY_ID } from '@/data/residents';
import { staffName } from '@/data/staff';
import { SEED_EVENTS } from '@/data/storyRecords';
import { EXPOSURE_BY_ID, RESIDENT_EXPOSURES } from '@/data/exposures';
import { CATEGORY_LABEL, completeness, CURRENT_WINDOW_HOURS } from '@/lib/analytics';
import { fmtDateTime, relative, withinHours, parse } from '@/lib/time';
import { Breadcrumbs } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Caveat, EmptyState } from '@/components/ui/misc';
import { Dialog } from '@/components/ui/Dialog';
import { Timeline } from '@/components/Timeline';
import { EvidenceDrawer } from '@/components/EvidenceDrawer';
import { AssessmentStatusBadge, MissingBadge, ObservationBadge, ResidentAvatar, SourceChip } from '@/components/badges';
import { toast } from '@/store/toast';
import NotFound from './NotFound';

type Tab = 'overview' | 'timeline' | 'assessments' | 'exposures' | 'notes';

const DOMAINS: { id: string; label: string; cats: ObservationCategory[]; baselineKey?: 'cognition' | 'appetite' | 'mobility' | 'sleep' | 'mood' }[] = [
  { id: 'appetite', label: 'Appetite', cats: ['appetite'], baselineKey: 'appetite' },
  { id: 'mobility', label: 'Mobility', cats: ['mobility'], baselineKey: 'mobility' },
  { id: 'cognition', label: 'Cognition', cats: ['cognition'], baselineKey: 'cognition' },
  { id: 'sleep', label: 'Sleep', cats: ['sleep'], baselineKey: 'sleep' },
  { id: 'mood', label: 'Mood / behaviour', cats: ['mood'], baselineKey: 'mood' },
  { id: 'symptoms', label: 'Symptoms (GI, respiratory, temperature)', cats: ['gi', 'respiratory', 'fever'] },
];

export default function ResidentProfile() {
  const { id = '' } = useParams();
  const resident = RESIDENT_BY_ID[id];
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'overview';
  const now = useNow();
  const { observations, changes, clusters } = useAnalysis();
  const notes = useRippleStore((s) => s.notes);
  const assessments = useRippleStore((s) => s.assessments);
  const alerts = useRippleStore((s) => s.alerts);
  const requestAssessment = useRippleStore((s) => s.requestAssessment);
  const [evidence, setEvidence] = useState<{ title: string; obs: Observation[] } | null>(null);
  const [confirmRequest, setConfirmRequest] = useState(false);

  const mine = useMemo(() => observations.filter((o) => o.residentId === id && parse(o.observedAt) <= parse(now)), [observations, id, now]);
  if (!resident) return <NotFound what="resident" />;

  const myNotes = notes.filter((n) => n.residentId === id);
  const myEvents = SEED_EVENTS.filter((e) => e.residentId === id);
  const myAssessments = assessments.filter((a) => a.residentId === id);
  const change = changes.find((c) => c.residentId === id);
  const myClusters = clusters.filter((c) => c.residentIds.includes(id));
  const myAlerts = alerts.filter((a) => a.residentIds.includes(id) && a.status !== 'resolved');
  const openAssessment = myAssessments.find((a) => a.status !== 'completed');
  const lastUpdated = mine.reduce((acc, o) => (o.recordedAt > acc ? o.recordedAt : acc), '');
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Residents', to: '/residents' }, { label: `${resident.firstName} ${resident.lastName}` }]} />
      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-5">
          <ResidentAvatar resident={resident} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {resident.firstName} {resident.lastName}
              </h1>
              {resident.preferredName && <span className="text-ink-muted">(“{resident.preferredName}”)</span>}
              {change && <Badge tone="review" icon={<Activity size={12} aria-hidden="true" />}>Individual change flagged</Badge>}
              {myClusters.map((c) => (
                <Badge key={c.id} tone="navy" icon={<Waves size={12} aria-hidden="true" />}>
                  In {c.domain === 'gi' ? 'GI' : 'respiratory'} pattern
                </Badge>
              ))}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <div><dt className="label">Resident ID</dt><dd className="mt-0.5 font-medium">{resident.id}</dd></div>
              <div><dt className="label">Age</dt><dd className="mt-0.5 font-medium">{resident.age}</dd></div>
              <div><dt className="label">Room</dt><dd className="mt-0.5 font-medium">{resident.room} · Unit {resident.unit}</dd></div>
              <div><dt className="label">Care team</dt><dd className="mt-0.5 font-medium">{resident.careTeam.map(staffName).join(', ')}</dd></div>
              <div><dt className="label">Last updated</dt><dd className="mt-0.5 font-medium">{lastUpdated ? relative(lastUpdated, now) : '—'}</dd></div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`/notes?resident=${id}`} icon={<NotebookPen size={18} aria-hidden="true" />}>Add note</ButtonLink>
            {openAssessment ? (
              <ButtonLink to={`/assessments/${openAssessment.id}`} variant="secondary" icon={<ClipboardCheck size={18} aria-hidden="true" />}>Open assessment</ButtonLink>
            ) : (
              <Button variant="secondary" icon={<ClipboardCheck size={18} aria-hidden="true" />} onClick={() => setConfirmRequest(true)}>Request assessment</Button>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <Tabs<Tab>
          label="Resident sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'assessments', label: 'Assessments', count: myAssessments.length },
            { id: 'exposures', label: 'Exposures' },
            { id: 'notes', label: 'Notes', count: myNotes.length },
          ]}
        />

        {tab === 'overview' && (
          <TabPanel id="overview">
            {(change || myAlerts.length > 0) && (
              <Card className="mb-5 border-amber-200">
                <CardHeader title="Why Ripple flagged this resident" subtitle="Transparent rules; no scores or diagnoses" icon={<Activity size={18} aria-hidden="true" />}
                  action={change && <Button size="sm" variant="secondary" icon={<FileSearch size={16} aria-hidden="true" />} onClick={() => setEvidence({ title: 'Individual change', obs: mine.filter((o) => change.evidenceIds.includes(o.id)) })}>View source records</Button>} />
                <div className="space-y-2 p-5 md:p-6">
                  {change?.reasons.map((r) => <p key={r} className="text-sm">{r}</p>)}
                  {myClusters.map((c) => (
                    <p key={c.id} className="text-sm">
                      Included in <Link className="font-medium text-primary hover:underline" to={`/patterns?pattern=${c.id}`}>{c.title}</Link>.
                    </p>
                  ))}
                  {myAlerts.length > 0 && (
                    <p className="text-sm text-ink-muted">
                      Open alerts: {myAlerts.map((a, i) => <span key={a.id}>{i > 0 && ', '}<Link className="text-primary hover:underline" to={`/alerts?id=${a.id}`}>{a.title}</Link></span>)}
                    </p>
                  )}
                </div>
              </Card>
            )}
            <h2 className="mb-1 text-base font-semibold">Baseline vs current</h2>
            <p className="mb-4 text-sm text-ink-muted">“Current” covers documented observations in the last {CURRENT_WINDOW_HOURS} h. A domain with no record is shown as missing — never as normal.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {DOMAINS.map((d) => {
                const recent = mine.filter((o) => d.cats.includes(o.category) && withinHours(o.observedAt, CURRENT_WINDOW_HOURS, now)).sort((a, b) => b.observedAt.localeCompare(a.observedAt));
                const changesHere = recent.filter((o) => o.flag === 'change');
                const latest = changesHere[0] ?? recent[0];
                const comp = Math.round((d.cats.map((c) => completeness(mine, id, c, now)).reduce((s, v) => s + v, 0) / d.cats.length) * 100);
                return (
                  <Card key={d.id} className="flex flex-col p-5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{d.label}</h3>
                      {latest ? <ObservationBadge flag={changesHere.length ? 'change' : latest.flag} /> : <MissingBadge />}
                    </div>
                    <div className="mt-3 space-y-3 text-sm">
                      <div>
                        <p className="label">Baseline</p>
                        <p className="mt-0.5">{d.baselineKey ? resident.baseline[d.baselineKey].summary : 'No GI or respiratory symptoms; afebrile'}</p>
                      </div>
                      <div>
                        <p className="label">Current</p>
                        {latest ? (
                          <p className="mt-0.5">
                            {latest.value} <span className="text-xs text-ink-muted">· {fmtDateTime(latest.observedAt)}</span>
                          </p>
                        ) : (
                          <p className="mt-0.5 text-ink-muted">No observation documented in the last 72 h</p>
                        )}
                        {changesHere.length > 1 && <p className="mt-1 text-xs text-review-ink">{changesHere.length} documented changes in this window</p>}
                      </div>
                    </div>
                    <div className="mt-auto pt-4">
                      <div className="flex items-center justify-between text-xs text-ink-muted">
                        <span>Data completeness (3 days)</span>
                        <span className="font-medium text-ink">{comp}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={comp} aria-valuemin={0} aria-valuemax={100} aria-label={`${d.label} documentation completeness`}>
                        <div className={`h-full rounded-full ${comp < 60 ? 'bg-review' : 'bg-primary'}`} style={{ width: `${comp}%` }} />
                      </div>
                      <button
                        className="mt-3 text-sm font-medium text-primary hover:underline disabled:text-ink-faint disabled:no-underline"
                        disabled={!recent.length}
                        onClick={() => setEvidence({ title: d.label, obs: recent })}
                      >
                        Evidence ({recent.length} record{recent.length === 1 ? '' : 's'})
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabPanel>
        )}

        {tab === 'timeline' && (
          <TabPanel id="timeline">
            <Timeline observations={mine} notes={myNotes} events={myEvents} highlightNoteId={params.get('note') ?? undefined} />
          </TabPanel>
        )}

        {tab === 'assessments' && (
          <TabPanel id="assessments">
            <Card>
              {myAssessments.length === 0 ? (
                <EmptyState title="No assessments yet" body="Request a behavioural assessment if you notice a change." action={<Button onClick={() => setConfirmRequest(true)}>Request assessment</Button>} />
              ) : (
                <ul className="divide-y divide-line">
                  {myAssessments.map((a) => (
                    <li key={a.id}>
                      <Link to={`/assessments/${a.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-canvas">
                        <ClipboardCheck size={18} className="text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{a.reason}</span>
                          <span className="text-xs text-ink-muted">Requested {fmtDateTime(a.requestedAt)} by {staffName(a.requestedBy)} · assigned to {staffName(a.assignedTo)}</span>
                        </span>
                        <AssessmentStatusBadge status={a.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabPanel>
        )}

        {tab === 'exposures' && (
          <TabPanel id="exposures">
            <ExposuresTab residentId={id} symptomatic={new Set(clusters.flatMap((c) => c.residentIds))} />
          </TabPanel>
        )}

        {tab === 'notes' && (
          <TabPanel id="notes">
            {myNotes.length === 0 ? (
              <Card><EmptyState title="No notes yet" action={<ButtonLink to={`/notes?resident=${id}`}>Add note</ButtonLink>} /></Card>
            ) : (
              <div className="space-y-3">
                {myNotes.map((n) => (
                  <Card key={n.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceChip type={n.sourceType} />
                      <span className="text-sm text-ink-muted">Event {fmtDateTime(n.eventTime)} · entered {fmtDateTime(n.createdAt)} by {staffName(n.authorId)}</span>
                      {n.editedText !== n.originalText && <Badge tone="outline" icon={<PenLine size={12} aria-hidden="true" />}>Edited</Badge>}
                    </div>
                    <p className="mt-2">{n.editedText}</p>
                    {n.editedText !== n.originalText && (
                      <details className="mt-2 text-sm text-ink-muted">
                        <summary className="cursor-pointer">Original transcript</summary>
                        <p className="mt-1 italic">{n.originalText}</p>
                      </details>
                    )}
                    <p className="mt-2 text-xs text-ink-muted">{n.observationIds.length} structured observation(s) · reviewer {staffName(n.reviewerId)}</p>
                  </Card>
                ))}
              </div>
            )}
          </TabPanel>
        )}
      </div>

      <EvidenceDrawer open={!!evidence} onClose={() => setEvidence(null)} title={evidence?.title ?? ''} observations={evidence?.obs ?? []} />
      <Dialog
        open={confirmRequest}
        onClose={() => setConfirmRequest(false)}
        title="Request behavioural assessment?"
        description={`An assessment request for ${resident.firstName} ${resident.lastName} will be sent to Amara Bello (Behavioural Assessor).`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRequest(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const a = requestAssessment(id, change ? `Documented change in ${change.domains.map((d) => CATEGORY_LABEL[d].toLowerCase()).join(' and ')}.` : 'Care team request for behavioural review.', myAlerts[0]?.id);
                setConfirmRequest(false);
                toast({ title: 'Assessment requested', body: 'The assessor has been notified (demo).', link: { to: `/assessments/${a.id}`, label: 'Open assessment' } });
              }}
            >
              Send request
            </Button>
          </>
        }
      />
    </div>
  );
}

function ExposuresTab({ residentId, symptomatic }: { residentId: string; symptomatic: Set<string> }) {
  const mine = RESIDENT_EXPOSURES.filter((re) => re.residentId === residentId && re.attendance !== 'absent').map((re) => ({ re, ex: EXPOSURE_BY_ID[re.exposureId] }));
  const sorted = mine.sort((a, b) => b.ex.start.localeCompare(a.ex.start));
  const contactsFor = (exposureId: string) =>
    RESIDENT_EXPOSURES.filter((re) => re.exposureId === exposureId && re.attendance === 'attended' && re.residentId !== residentId && symptomatic.has(re.residentId)).length;
  const groups: { title: string; types: string[] }[] = [
    { title: 'Meals', types: ['meal'] },
    { title: 'Activities', types: ['activity'] },
    { title: 'Room changes & possible contact events', types: ['room_change', 'contact'] },
  ];
  return (
    <div className="space-y-5">
      <Caveat tone="info">Shared exposures are common in congregate living. “Possible contact” only means another resident in a current pattern was documented at the same event — it is not evidence of transmission.</Caveat>
      {groups.map((g) => {
        const rows = sorted.filter((x) => g.types.includes(x.ex.type));
        return (
          <Card key={g.title}>
            <CardHeader title={g.title} subtitle={`${rows.length} in the last 7 days`} />
            {rows.length === 0 ? (
              <EmptyState title={`No ${g.title.toLowerCase()} recorded`} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-canvas/70">
                    <tr>
                      <th className="table-th">Exposure</th>
                      <th className="table-th">When</th>
                      <th className="table-th">Location</th>
                      <th className="table-th">Attendance</th>
                      <th className="table-th">Possible contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ re, ex }) => {
                      const c = contactsFor(ex.id);
                      return (
                        <tr key={re.id} className="border-b border-line last:border-0">
                          <td className="table-td font-medium">{ex.name}{ex.detail && <p className="text-xs font-normal text-ink-muted">{ex.detail}</p>}</td>
                          <td className="table-td whitespace-nowrap">{fmtDateTime(ex.start)}</td>
                          <td className="table-td">{ex.location}</td>
                          <td className="table-td">{re.attendance === 'attended' ? <Badge tone="blue">Attended</Badge> : <Badge tone="outline">Unknown</Badge>}</td>
                          <td className="table-td">{c > 0 ? <Badge tone="review">{c} resident{c > 1 ? 's' : ''} in a current pattern</Badge> : <span className="text-ink-muted">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
