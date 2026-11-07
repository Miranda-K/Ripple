import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, Brain, FlaskConical, NotebookPen, RotateCcw, Utensils } from 'lucide-react';
import { useRippleStore } from '@/store/useRippleStore';
import { ROLE_LABEL, staffName } from '@/data/staff';
import { fmtDateTime } from '@/lib/time';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Caveat, PageHeader } from '@/components/ui/misc';
import { DemoDataBadge } from '@/components/badges';
import { toast } from '@/store/toast';

const SCRIPT_A = [
  'Overview shows 2 emerging patterns (Head Nurse view).',
  'Click “Investigate” on the GI pattern → 5 affected residents.',
  'Pattern graph: Harvest Lunch Seating A at the Main Dining Room; lines show affected residents documented as attendees.',
  'Select the event or a resident to filter evidence; open “View source records” for the underlying notes.',
  '“Open alert & assign” → Assign follow-up to Grace Liu (Head Nurse) and add a follow-up note.',
];
const SCRIPT_B = [
  'Open Margaret Chen (Room 104, Unit A) as the Nurse.',
  'Overview tab: baseline “Oriented ×3” vs one new confusion report; appetite 1 of 3 recent meals low.',
  'Add note → use the Margaret demo script or dictate → Extract observations.',
  'Edit if needed → Confirm & Save → toast links to the timeline; a new individual-change flag appears.',
  'Switch role to Assessor → open the auto-requested review → record answers (including Not assessed) → Submit.',
];

export default function DemoControls() {
  const navigate = useNavigate();
  const reset = useRippleStore((s) => s.reset);
  const loadScenario = useRippleStore((s) => s.loadScenario);
  const clear = useRippleStore((s) => s.clearNotifications);
  const scenario = useRippleStore((s) => s.scenario);
  const audit = useRippleStore((s) => s.audit);
  const role = useRippleStore((s) => s.role);
  const [confirm, setConfirm] = useState<null | 'reset' | 'A' | 'B'>(null);

  const run = () => {
    if (confirm === 'reset') {
      reset();
      toast({ title: 'Synthetic dataset reset', body: '48 residents, 6 individual changes, 2 patterns, 4 pending assessments.' });
      navigate('/');
    } else if (confirm === 'A') {
      loadScenario('A');
      toast({ tone: 'info', title: 'Scenario A loaded — GI cluster', body: 'Role set to Head Nurse.' });
      navigate('/');
    } else if (confirm === 'B') {
      loadScenario('B');
      toast({ tone: 'info', title: 'Scenario B loaded — individual change', body: 'Role set to Nurse. Opening Margaret Chen.' });
      navigate('/residents/R-1004');
    }
    setConfirm(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow={<DemoDataBadge />}
        title="Demo controls"
        subtitle="Reset data or load a scenario."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Dataset" subtitle={`Current: ${scenario === 'base' ? 'base seed' : `Scenario ${scenario}`} · role ${ROLE_LABEL[role]}`} icon={<FlaskConical size={18} aria-hidden="true" />} />
          <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-6">
            <Button variant="secondary" size="lg" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={() => setConfirm('reset')}>Reset data</Button>
            <Button variant="secondary" size="lg" icon={<BellOff size={18} aria-hidden="true" />} onClick={() => { clear(); toast({ title: 'Notifications cleared' }); }}>Clear notifications</Button>
            <Button size="lg" icon={<Utensils size={18} aria-hidden="true" />} onClick={() => setConfirm('A')}>Scenario A — GI pattern</Button>
            <Button size="lg" icon={<Brain size={18} aria-hidden="true" />} onClick={() => setConfirm('B')}>Scenario B — Behaviour change</Button>
            <Button variant="subtle" size="lg" className="sm:col-span-2" icon={<NotebookPen size={18} aria-hidden="true" />} onClick={() => navigate('/notes?resident=R-1004&script=margaret')}>
              Add sample note
            </Button>
          </div>
          <div className="px-5 pb-5 md:px-6 md:pb-6">
            <Caveat tone="info">Demo edits are saved in this browser’s localStorage (key <code>ripple-demo-v1</code>). Reset restores the exact seed.</Caveat>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Last 8 actions" />
          <ol className="divide-y divide-line">
            {audit.slice(0, 8).map((e) => (
              <li key={e.id} className="px-5 py-3 text-sm md:px-6">
                <p className="font-medium">{e.action}</p>
                {e.detail && <p className="text-ink-muted">{e.detail}</p>}
                <p className="text-xs text-ink-muted">{fmtDateTime(e.at)} · {staffName(e.actorId)} ({ROLE_LABEL[e.actorRole]})</p>
              </li>
            ))}
          </ol>
        </Card>

        {[{ t: 'Script A — GI cluster', s: SCRIPT_A }, { t: 'Script B — Individual behavioural change', s: SCRIPT_B }].map(({ t, s }) => (
          <Card key={t}>
            <CardHeader title={t} />
            <ol className="list-decimal space-y-2 py-5 pl-10 pr-6 text-sm">
              {s.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </Card>
        ))}
      </div>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'reset' ? 'Reset the synthetic dataset?' : `Load Scenario ${confirm}?`}
        description="All demo edits (notes, alert actions, assessments) will be replaced with the deterministic seed."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button onClick={run} data-autofocus>{confirm === 'reset' ? 'Reset' : 'Load scenario'}</Button>
          </>
        }
      />
    </div>
  );
}
