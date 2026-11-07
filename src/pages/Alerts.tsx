import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BellOff, Check, CheckCheck, ClipboardCheck, FileSearch, History, MessageSquarePlus, Send, UserPlus, Waves } from 'lucide-react';
import type { Alert, AlertStatus, AlertType, Observation } from '@/types';
import { useRippleStore } from '@/store/useRippleStore';
import { can, useCurrentUser, useNow, useObservations, useVisibleAlerts } from '@/store/selectors';
import { RESIDENT_BY_ID, residentName } from '@/data/residents';
import { ASSIGNABLE_STAFF, ROLE_LABEL, staffName } from '@/data/staff';
import { fmtDateTime, relative } from '@/lib/time';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, Field, PageHeader, Select } from '@/components/ui/misc';
import { AlertStatusBadge, AlertTypeBadge, ALERT_TYPE_LABEL } from '@/components/badges';
import { EvidenceDrawer } from '@/components/EvidenceDrawer';
import { toast } from '@/store/toast';

type StatusFilter = AlertStatus | 'all';
type TypeFilter = AlertType | 'all';

export default function Alerts() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as StatusFilter) ?? 'all';
  const type = (params.get('type') as TypeFilter) ?? 'all';
  const selectedId = params.get('id');
  const alerts = useVisibleAlerts();
  const { role } = useCurrentUser();
  const now = useNow();
  const markRead = useRippleStore((s) => s.markAlertRead);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (!v || v === 'all') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const byType = alerts.filter((a) => type === 'all' || a.type === type);
  const rows = byType.filter((a) => status === 'all' || a.status === status);
  const selected = alerts.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (selected && !selected.read) markRead(selected.id);
  }, [selected, markRead]);

  const scopeText =
    role === 'head_nurse' ? 'All units.' : role === 'nurse' ? 'Your alerts and Unit A.' : 'Your requests.';
  const count = (s: StatusFilter) => byType.filter((a) => s === 'all' || a.status === s).length;

  return (
    <div>
      <PageHeader title="Alerts" subtitle={`${scopeText} Each alert explains why. No severity scores.`} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Tabs<StatusFilter>
            label="Alert status"
            value={status}
            onChange={(v) => set('status', v)}
            tabs={[
              { id: 'all', label: 'All', count: count('all') },
              { id: 'new', label: 'New', count: count('new') },
              { id: 'acknowledged', label: 'Acknowledged', count: count('acknowledged') },
              { id: 'in_review', label: 'In review', count: count('in_review') },
              { id: 'resolved', label: 'Resolved', count: count('resolved') },
            ]}
          />
        </div>
        <Select label="Type" value={type} onChange={(e) => set('type', e.target.value)} className="w-56">
          <option value="all">All types</option>
          {(Object.keys(ALERT_TYPE_LABEL) as AlertType[]).map((t) => (
            <option key={t} value={t}>{ALERT_TYPE_LABEL[t]}</option>
          ))}
        </Select>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card className="self-start">
          {rows.length === 0 ? (
            <EmptyState title="No alerts here" body="Try a different status or type filter." icon={<BellOff size={22} />} />
          ) : (
            <ul className="divide-y divide-line" aria-label="Alerts">
              {rows.map((a) => {
                const active = a.id === selected?.id;
                return (
                  <li key={a.id}>
                    <button onClick={() => set('id', a.id)} aria-current={active} className={`flex w-full gap-3 px-4 py-4 text-left transition ${active ? 'bg-primary-soft' : 'hover:bg-canvas'}`}>
                      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${a.read ? 'bg-transparent' : 'bg-primary'}`} aria-label={a.read ? undefined : 'Unread'} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">{a.title}</span>
                        <span className="mt-1 line-clamp-2 block text-sm text-ink-muted">{a.summary}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                          <AlertTypeBadge type={a.type} />
                          <AlertStatusBadge status={a.status} />
                          <span>{relative(a.createdAt, now)}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <div className="min-w-0">
          {selected ? (
            <AlertDetail key={selected.id} alert={selected} />
          ) : (
            <Card>
              <EmptyState title="Select an alert" body="Choose an alert to see the evidence, the reason it was flagged and the available actions." />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertDetail({ alert }: { alert: Alert }) {
  const { role } = useCurrentUser();
  const allAudit = useRippleStore((s) => s.audit);
  const audit = allAudit.filter((e) => e.targetId === alert.id || (alert.assessmentId && e.targetId === alert.assessmentId));
  const acknowledge = useRippleStore((s) => s.acknowledgeAlert);
  const assign = useRippleStore((s) => s.assignAlert);
  const addFollowUp = useRippleStore((s) => s.addFollowUp);
  const resolve = useRippleStore((s) => s.resolveAlert);
  const observations = useObservations();
  const [dialog, setDialog] = useState<'assign' | 'followup' | 'family' | 'resolve' | null>(null);
  const [assignee, setAssignee] = useState(alert.assignedTo ?? '');
  const [text, setText] = useState('');
  const [familyText, setFamilyText] = useState('');
  const [familyResidentId, setFamilyResidentId] = useState(alert.residentIds[0] ?? '');
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Observation[] | null>(null);
  const familyMessages = useRippleStore((s) => s.familyMessages);
  const recordFamilyMessage = useRippleStore((s) => s.recordFamilyMessage);
  const alertFamilyMessages = familyMessages.filter((message) => message.alertId === alert.id);
  const resolved = alert.status === 'resolved';
  const evidenceObs = observations.filter((o) => alert.evidenceIds.includes(o.id));

  const close = () => {
    setDialog(null);
    setError(null);
  };

  return (
    <Card>
      <div className="border-b border-line p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <AlertTypeBadge type={alert.type} />
          <AlertStatusBadge status={alert.status} />
          {alert.assignedTo && <span className="text-sm text-ink-muted">Assigned to <strong className="text-ink">{staffName(alert.assignedTo)}</strong></span>}
        </div>
        <h2 className="mt-3 text-xl font-semibold">{alert.title}</h2>
        <p className="mt-2">{alert.summary}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {can(role, 'acknowledge', alert) && (
            <Button variant="secondary" icon={<Check size={16} aria-hidden="true" />} disabled={alert.status !== 'new'} onClick={() => { acknowledge(alert.id); toast({ title: 'Alert acknowledged' }); }}>
              Acknowledge
            </Button>
          )}
          {can(role, 'assign', alert) && (
            <Button variant="secondary" icon={<UserPlus size={16} aria-hidden="true" />} disabled={resolved} onClick={() => setDialog('assign')}>
              Assign to nurse
            </Button>
          )}
          <Button variant="secondary" icon={<MessageSquarePlus size={16} aria-hidden="true" />} onClick={() => setDialog('followup')}>
            Add follow-up note
          </Button>
          <Button variant="secondary" icon={<Send size={16} aria-hidden="true" />} onClick={() => setDialog('family')}>
            Notify family (demo)
          </Button>
          {can(role, 'resolve', alert) && (
            <Button icon={<CheckCheck size={16} aria-hidden="true" />} disabled={resolved} onClick={() => setDialog('resolve')}>
              Mark reviewed
            </Button>
          )}
        </div>
        {!can(role, 'assign', alert) && <p className="mt-2 text-xs text-ink-muted">Assignment is available to the Head Nurse role.</p>}
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="label">First observed</dt>
            <dd className="mt-1">{fmtDateTime(alert.firstObservedAt)}</dd>
          </div>
          <div>
            <dt className="label">Resident scope</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {alert.residentIds.map((id) => (
                <Link key={id} to={`/residents/${id}`} className="rounded-full border border-line px-2.5 py-0.5 hover:border-primary hover:text-primary">
                  {residentName(id)} · {RESIDENT_BY_ID[id].room}
                </Link>
              ))}
            </dd>
          </div>
          <div>
            <dt className="label">Evidence</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3">
              <span>{alert.evidenceIds.length} source record{alert.evidenceIds.length === 1 ? '' : 's'}</span>
              {alert.evidenceIds.length > 0 && (
                <Button size="sm" variant="ghost" icon={<FileSearch size={16} aria-hidden="true" />} onClick={() => setEvidence(evidenceObs)}>
                  View source records
                </Button>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            {alert.patternId && <ButtonLink size="sm" variant="subtle" to={`/patterns?pattern=${alert.patternId}`} icon={<Waves size={16} aria-hidden="true" />}>Investigate pattern</ButtonLink>}
            {alert.assessmentId && <ButtonLink size="sm" variant="subtle" to={`/assessments/${alert.assessmentId}`} icon={<ClipboardCheck size={16} aria-hidden="true" />}>Open assessment</ButtonLink>}
            {alert.type === 'individual_change' && <ButtonLink size="sm" variant="subtle" to={`/residents/${alert.residentIds[0]}`}>Open resident</ButtonLink>}
          </div>
        </dl>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="label">Why flagged</h3>
            <p className="mt-1 leading-relaxed">{alert.whyFlagged}</p>
          </div>
          <div>
            <h3 className="label">Uncertainty & missing information</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-muted">
              {alert.uncertainty.map((u) => <li key={u}>{u}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-6 border-t border-line p-5 md:grid-cols-2 md:p-6">
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquarePlus size={16} aria-hidden="true" /> Follow-up notes ({alert.followUps.length})</h3>
          {alert.followUps.length === 0 ? (
            <p className="text-sm text-ink-muted">No follow-up notes yet.</p>
          ) : (
            <ul className="space-y-2">
              {alert.followUps.map((f) => (
                <li key={f.id} className="rounded-lg bg-canvas p-3 text-sm">
                  <p>{f.text}</p>
                  <p className="mt-1 text-xs text-ink-muted">{staffName(f.authorId)} ({ROLE_LABEL[f.role]}) · {fmtDateTime(f.at)}</p>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mb-2 mt-5 flex items-center gap-2 text-sm font-semibold"><Send size={16} aria-hidden="true" /> Family messages (demo only) ({alertFamilyMessages.length})</h3>
          {alertFamilyMessages.length === 0 ? (
            <p className="text-sm text-ink-muted">No simulated family messages recorded.</p>
          ) : (
            <ul className="space-y-2">
              {alertFamilyMessages.map((message) => (
                <li key={message.id} className="rounded-lg border border-line p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-ink-muted">{residentName(message.residentId)} · Not delivered</p>
                  <p>{message.message}</p>
                  <p className="mt-1 text-xs text-ink-muted">{staffName(message.authorId)} · {fmtDateTime(message.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><History size={16} aria-hidden="true" /> Audit trail (demo)</h3>
          <ol className="space-y-2 border-l-2 border-line pl-4 text-sm">
            <li>
              <p className="font-medium">Raised by Ripple rules</p>
              <p className="text-xs text-ink-muted">{fmtDateTime(alert.createdAt)} · system</p>
            </li>
            {[...audit].reverse().map((e) => (
              <li key={e.id}>
                <p className="font-medium">{e.action}</p>
                {e.detail && <p className="text-ink-muted">{e.detail}</p>}
                <p className="text-xs text-ink-muted">{fmtDateTime(e.at)} · {staffName(e.actorId)} ({ROLE_LABEL[e.actorRole]})</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Dialog
        open={dialog === 'assign'}
        onClose={close}
        title="Assign follow-up"
        description="The assignee becomes responsible for reviewing this alert. Status moves to In review."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button
              onClick={() => {
                if (!assignee) return setError('Choose a staff member.');
                assign(alert.id, assignee);
                close();
                toast({ title: `Assigned to ${staffName(assignee)}` });
              }}
            >
              Assign
            </Button>
          </>
        }
      >
        <Field label="Assign to" htmlFor="assignee" error={error ?? undefined}>
          <select id="assignee" className="input" value={assignee} onChange={(e) => { setAssignee(e.target.value); setError(null); }} data-autofocus>
            <option value="">Select staff…</option>
            {ASSIGNABLE_STAFF.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.title}</option>
            ))}
          </select>
        </Field>
      </Dialog>

      <Dialog
        open={dialog === 'family'}
        onClose={close}
        title="Record a family message (demo)"
        description="This prototype does not send email or text messages. Recording this action only saves it in this demo."
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button
              onClick={() => {
                if (!familyResidentId) return setError('Choose a resident.');
                if (familyText.trim().length < 3) return setError('Write a message (3+ characters).');
                recordFamilyMessage(alert.id, familyResidentId, familyText);
                setFamilyText('');
                close();
                toast({ title: 'Simulated family message recorded', body: 'No message was sent.' });
              }}
            >
              Record simulated send
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-primary-soft px-3 py-2 text-sm text-navy" role="note">
            Demo only — no message will be sent. Do not enter real resident or family contact information.
          </div>
          <Field label="Resident" htmlFor="family-resident" error={error ?? undefined}>
            <select id="family-resident" className="input" value={familyResidentId} onChange={(e) => { setFamilyResidentId(e.target.value); setError(null); }} data-autofocus>
              {alert.residentIds.map((id) => (
                <option key={id} value={id}>{residentName(id)} · Room {RESIDENT_BY_ID[id].room}</option>
              ))}
            </select>
          </Field>
          <Field label="Message" htmlFor="family-message" hint="A demo copy will be saved to this alert's family-message log." error={error && familyText.trim().length < 3 ? error : undefined}>
            <textarea id="family-message" className="input min-h-[140px] py-2" value={familyText} onChange={(e) => { setFamilyText(e.target.value); setError(null); }} placeholder="Write the message you would send to the family in a real system." />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={dialog === 'followup'}
        onClose={close}
        title="Add follow-up note"
        description="Visible to everyone with access to this alert and recorded in the audit trail."
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button
              onClick={() => {
                if (text.trim().length < 3) return setError('Write a short note (3+ characters).');
                addFollowUp(alert.id, text.trim());
                setText('');
                close();
                toast({ title: 'Follow-up note added' });
              }}
            >
              Add note
            </Button>
          </>
        }
      >
        <Field label="Note" htmlFor="followup" error={error ?? undefined}>
          <textarea id="followup" className="input min-h-[120px] py-2" value={text} onChange={(e) => { setText(e.target.value); setError(null); }} placeholder="e.g. Spoke with dietary about Thursday’s menu; requested batch records." data-autofocus />
        </Field>
      </Dialog>

      <Dialog
        open={dialog === 'resolve'}
        onClose={close}
        title="Mark this alert as reviewed?"
        description="The alert will move to Resolved. The underlying observations stay in the record and a new alert will be raised if new evidence appears."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button
              onClick={() => {
                resolve(alert.id);
                close();
                toast({ title: 'Alert marked reviewed', body: 'Moved to Resolved.' });
              }}
            >
              Confirm — mark reviewed
            </Button>
          </>
        }
      />

      <EvidenceDrawer open={!!evidence} onClose={() => setEvidence(null)} title={alert.title} observations={evidence ?? []} />
    </Card>
  );
}
