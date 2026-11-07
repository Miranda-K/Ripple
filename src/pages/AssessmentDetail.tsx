import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Info, Save, Send, TriangleAlert } from 'lucide-react';
import type { AssessmentItemResponse } from '@/types';
import { useRippleStore } from '@/store/useRippleStore';
import { can, useCurrentUser, useObservations } from '@/store/selectors';
import { RESIDENT_BY_ID } from '@/data/residents';
import { staffName } from '@/data/staff';
import { ASSESSMENT_ITEMS, DOMAIN_CATEGORY, DOMAIN_LABEL, DOMAINS, KEY_ITEM_IDS } from '@/lib/assessmentItems';
import { CATEGORY_LABEL } from '@/lib/analytics';
import { fmtDateTime, withinHours, parse } from '@/lib/time';
import { Breadcrumbs } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Caveat } from '@/components/ui/misc';
import { AssessmentForm } from '@/components/AssessmentForm';
import { AssessmentStatusBadge, ObservationBadge, ResidentAvatar } from '@/components/badges';
import { toast } from '@/store/toast';
import NotFound from './NotFound';

const ANSWER_LABEL = { yes: 'Yes', no: 'No', not_assessed: 'Not assessed' } as const;

export default function AssessmentDetailRoute() {
  const { id = '' } = useParams();
  return <AssessmentDetail key={id} id={id} />;
}

function AssessmentDetail({ id }: { id: string }) {
  const assessment = useRippleStore((s) => s.assessments.find((a) => a.id === id));
  const allAssessments = useRippleStore((s) => s.assessments);
  const saveAssessment = useRippleStore((s) => s.saveAssessment);
  const signOff = useRippleStore((s) => s.signOffAssessment);
  const now = useRippleStore((s) => s.now);
  const { role, user } = useCurrentUser();
  const observations = useObservations();
  const [responses, setResponses] = useState<Record<string, AssessmentItemResponse>>(() => assessment?.responses ?? {});
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [confirmSign, setConfirmSign] = useState(false);
  const defaultTime = useMemo(() => now(), [now]);

  if (!assessment) return <NotFound what="assessment" />;
  const r = RESIDENT_BY_ID[assessment.residentId];
  const readOnly = assessment.status === 'completed';
  const prior = allAssessments
    .filter((a) => a.residentId === r.id && a.status === 'completed' && a.id !== assessment.id)
    .sort((a, b) => (b.signedOffAt ?? '').localeCompare(a.signedOffAt ?? ''))[0];
  const recent = observations.filter((o) => o.residentId === r.id && withinHours(o.observedAt, 72) && parse(o.observedAt) <= parse(now()) && o.flag !== 'normal');
  const answered = ASSESSMENT_ITEMS.filter((i) => responses[i.id]?.answer).length;
  const keyUnassessed = KEY_ITEM_IDS.filter((k) => responses[k]?.answer === 'not_assessed');

  const onChange = (itemId: string, value: AssessmentItemResponse) => {
    setResponses((s) => ({ ...s, [itemId]: value }));
    setDirty(true);
    if (value.answer) setInvalid((s) => {
      const n = new Set(s);
      n.delete(itemId);
      return n;
    });
  };

  const save = (mode: 'draft' | 'submit') => {
    if (mode === 'submit') {
      const missing = ASSESSMENT_ITEMS.filter((i) => !responses[i.id]?.answer).map((i) => i.id);
      if (missing.length) {
        setInvalid(new Set(missing));
        toast({ tone: 'warning', title: `${missing.length} item${missing.length > 1 ? 's' : ''} still unanswered`, body: 'Choose Yes, No or Not assessed for every item before submitting.' });
        document.getElementById(`q-${missing[0]}-label`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    const next = saveAssessment(assessment.id, responses, mode);
    setDirty(false);
    toast({
      tone: next.reviewRequired && mode === 'submit' ? 'warning' : 'success',
      title: mode === 'submit' ? 'Submitted for nurse sign-off' : 'Progress saved locally',
      body: next.reviewRequired ? `${KEY_ITEM_IDS.filter((k) => responses[k]?.answer === 'not_assessed').length} key item(s) marked Not assessed — flagged as review required.` : undefined,
    });
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Assessments', to: '/assessments' }, { label: `${r.firstName} ${r.lastName}` }]} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ResidentAvatar resident={r} size={52} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">Behavioural review — {r.firstName} {r.lastName}</h1>
              <AssessmentStatusBadge status={assessment.status} />
              {assessment.reviewRequired && !readOnly && <Badge tone="review" icon={<TriangleAlert size={12} aria-hidden="true" />}>Review required</Badge>}
            </div>
            <p className="mt-1 text-ink-muted">{assessment.reason}</p>
            <p className="mt-1 text-sm text-ink-muted">
              Room {r.room} · Unit {r.unit} · requested {fmtDateTime(assessment.requestedAt)} by {staffName(assessment.requestedBy)} · assigned to {staffName(assessment.assignedTo)}
            </p>
          </div>
        </div>
        <Link to={`/residents/${r.id}`} className="text-sm font-medium text-primary hover:underline">Open resident profile</Link>
      </div>

      <div className="mb-5 flex gap-3 rounded-xl border border-blue-200 bg-primary-soft p-4 text-sm">
        <Info size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <p>
          <strong>DOS-inspired observation categories.</strong> This custom checklist borrows category names for structure only. It is <strong>not</strong> the validated Delirium Observation Screening (DOS) scale and Ripple computes no score. Record what you observed; use “Not assessed” when you could not observe an item.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <AssessmentForm responses={responses} onChange={onChange} readOnly={readOnly} invalidIds={invalid} defaultObserver={user.name} defaultTime={defaultTime} />
        </div>

        <aside className="space-y-4" aria-label="Context">
          <Card className="sticky top-24 p-5">
            <h2 className="font-semibold">Progress</h2>
            <p className="mt-1 text-sm text-ink-muted">{answered} of {ASSESSMENT_ITEMS.length} items answered{dirty && ' · unsaved changes'}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={ASSESSMENT_ITEMS.length} aria-label="Items answered">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(answered / ASSESSMENT_ITEMS.length) * 100}%` }} />
            </div>
            {keyUnassessed.length > 0 && (
              <div className="mt-3">
                <Caveat>{keyUnassessed.length} key item{keyUnassessed.length > 1 ? 's are' : ' is'} marked Not assessed. The submission will be flagged <strong>review required</strong>.</Caveat>
              </div>
            )}
            {readOnly ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-ok">
                <CheckCircle2 size={16} aria-hidden="true" /> Signed off by {staffName(assessment.signedOffBy)} on {fmtDateTime(assessment.signedOffAt!)}
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="secondary" icon={<Save size={16} aria-hidden="true" />} onClick={() => save('draft')}>Save progress</Button>
                <Button icon={<Send size={16} aria-hidden="true" />} onClick={() => save('submit')}>Submit for sign-off</Button>
                {assessment.status === 'needs_review' && (
                  can(role, 'signoff') ? (
                    <Button variant="subtle" icon={<CheckCircle2 size={16} aria-hidden="true" />} onClick={() => setConfirmSign(true)} disabled={dirty}>
                      Nurse sign-off
                    </Button>
                  ) : (
                    <p className="text-xs text-ink-muted">Awaiting sign-off by a nurse or head nurse. Switch role to sign off.</p>
                  )
                )}
                {dirty && assessment.status === 'needs_review' && <p className="text-xs text-ink-muted">Save or submit changes before sign-off.</p>}
              </div>
            )}
            {assessment.submittedBy && <p className="mt-3 text-xs text-ink-muted">Last submitted by {staffName(assessment.submittedBy)} · updated {fmtDateTime(assessment.updatedAt)}</p>}
          </Card>

          <Card>
            <CardHeader title="Prior baseline" subtitle={prior ? `Completed ${fmtDateTime(prior.signedOffAt!)}` : 'No previous completed assessment'} />
            <div className="p-5 text-sm">
              {prior ? (
                <ul className="space-y-1.5">
                  {DOMAINS.map((d) => {
                    const items = ASSESSMENT_ITEMS.filter((i) => i.domain === d);
                    const yes = items.filter((i) => prior.responses[i.id]?.answer === 'yes').length;
                    const na = items.filter((i) => prior.responses[i.id]?.answer === 'not_assessed').length;
                    return (
                      <li key={d} className="flex justify-between gap-3">
                        <span>{DOMAIN_LABEL[d]}</span>
                        <span className="text-ink-muted">{yes ? `${yes} concern${yes > 1 ? 's' : ''}` : na ? `${ANSWER_LABEL.not_assessed}` : 'No concerns'}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ul className="space-y-1.5">
                  {(['cognition', 'sleep', 'mood', 'mobility', 'appetite'] as const).map((k) => (
                    <li key={k}><span className="font-medium">{CATEGORY_LABEL[k]}:</span> {r.baseline[k].summary}</li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Relevant recent observations" subtitle="Documented changes, last 72 h" />
            <ul className="divide-y divide-line">
              {recent.length === 0 && <li className="p-5 text-sm text-ink-muted">No documented changes in the last 72 h.</li>}
              {recent.map((o) => {
                const domains = DOMAINS.filter((d) => DOMAIN_CATEGORY[d].includes(o.category)).map((d) => DOMAIN_LABEL[d]);
                return (
                  <li key={o.id} className="px-5 py-3 text-sm">
                    <p><span className="font-medium">{CATEGORY_LABEL[o.category]}:</span> {o.value}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                      <ObservationBadge flag={o.flag} short /> {fmtDateTime(o.observedAt)} · relates to {domains.join(', ')}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>
      </div>

      <Dialog
        open={confirmSign}
        onClose={() => setConfirmSign(false)}
        title="Sign off this assessment?"
        description="Sign-off records you as the reviewing nurse and closes the linked assessment request."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmSign(false)}>Cancel</Button>
            <Button
              onClick={() => {
                signOff(assessment.id);
                setConfirmSign(false);
                toast({ title: 'Assessment signed off', body: `${r.firstName} ${r.lastName} — completed.` });
              }}
            >
              Sign off
            </Button>
          </>
        }
      >
        {assessment.reviewRequired && <Caveat>This submission has key items marked Not assessed. Confirm that this has been reviewed with the assessor.</Caveat>}
      </Dialog>
    </div>
  );
}
