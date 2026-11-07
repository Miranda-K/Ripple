import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Mic, MicOff, Sparkles, Trash2, Wand2 } from 'lucide-react';
import type { ObservationCategory, ObservationDraft, ObservationFlag, SourceType } from '@/types';
import { RESIDENTS, RESIDENT_BY_ID } from '@/data/residents';
import { DEMO_SCRIPTS } from '@/data/demoScripts';
import { extractObservations } from '@/lib/extraction';
import { CATEGORY_LABEL } from '@/lib/analytics';
import { fromInputValue, toInputValue } from '@/lib/time';
import { speechSupported, startDictation, type SpeechSession } from '@/lib/speech';
import { useRippleStore } from '@/store/useRippleStore';
import { useCurrentUser } from '@/store/selectors';
import { toast } from '@/store/toast';
import { Card, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Dialog } from './ui/Dialog';
import { Caveat, Field } from './ui/misc';
import { ObservationBadge } from './badges';

const CATS = Object.keys(CATEGORY_LABEL) as ObservationCategory[];

export function NoteCapture({ initialResident, initialScript }: { initialResident?: string; initialScript?: string }) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const saveNote = useRippleStore((s) => s.saveNote);
  const now = useRippleStore((s) => s.now);
  const script = DEMO_SCRIPTS.find((s) => s.id === initialScript);

  const [residentId, setResidentId] = useState(initialResident ?? script?.residentId ?? '');
  const [original, setOriginal] = useState(script?.text ?? '');
  const [text, setText] = useState(script?.text ?? '');
  const [inputMode, setInputMode] = useState<'typed' | 'voice'>('typed');
  const [eventTime, setEventTime] = useState(() => now());
  const [drafts, setDrafts] = useState<ObservationDraft[] | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ resident?: string; text?: string }>({});
  const [confirming, setConfirming] = useState(false);
  const session = useRef<SpeechSession | null>(null);
  const supported = useMemo(() => speechSupported(), []);

  useEffect(() => () => session.current?.stop(), []);

  const toggleMic = () => {
    if (listening) {
      session.current?.stop();
      return;
    }
    setSpeechError(null);
    const base = text ? `${text.trim()} ` : '';
    const s = startDictation({
      onText: (finalText, partial) => {
        const t = `${base}${finalText}`.trim();
        setText(t);
        setOriginal(t);
        setInterim(partial);
      },
      onError: (msg) => setSpeechError(msg),
      onEnd: () => {
        setListening(false);
        setInterim('');
      },
    });
    if (s) {
      session.current = s;
      setListening(true);
      setInputMode('voice');
      setDrafts(null);
    }
  };

  const loadScript = (id: string) => {
    const s = DEMO_SCRIPTS.find((x) => x.id === id);
    if (!s) return;
    setResidentId(s.residentId);
    setText(s.text);
    setOriginal(s.text);
    setInputMode('typed');
    setDrafts(null);
    setErrors({});
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!residentId) e.resident = 'Choose the resident this note is about.';
    if (text.trim().length < 10) e.text = 'Write or dictate at least a short sentence (10+ characters).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const extract = () => {
    if (!validate()) return;
    if (inputMode === 'typed') setOriginal(text);
    setDrafts(extractObservations(text, eventTime, inputMode === 'voice' ? 'voice_note' : 'care_note'));
  };

  const updateDraft = (tempId: string, patch: Partial<ObservationDraft>) => setDrafts((d) => d?.map((x) => (x.tempId === tempId ? { ...x, ...patch } : x)) ?? null);

  const included = drafts?.filter((d) => d.include) ?? [];

  const doSave = () => {
    const result = saveNote({ residentId, originalText: original || text, editedText: text, inputMode, eventTime, drafts: drafts ?? [] });
    setConfirming(false);
    const r = RESIDENT_BY_ID[residentId];
    const flagMsg = result.createdAlerts.length
      ? `${result.createdAlerts.length} new flag${result.createdAlerts.length > 1 ? 's' : ''} raised after re-analysis.`
      : result.updatedAlerts.length
        ? `${result.updatedAlerts.length} existing flag${result.updatedAlerts.length > 1 ? 's' : ''} updated with new evidence.`
        : 'Re-analysis found no new flags.';
    toast({
      title: `Note saved for ${r.firstName} ${r.lastName}`,
      body: `${result.observations.length} confirmed observation${result.observations.length === 1 ? '' : 's'} added. ${flagMsg}${result.createdAssessment ? ' A behavioural assessment was requested.' : ''}`,
      link: { to: `/residents/${residentId}?tab=timeline&note=${result.note.id}`, label: 'View resident timeline' },
    });
    if (result.createdAlerts.length) {
      toast({ tone: 'info', title: 'New flag', body: result.createdAlerts[0].title, link: { to: `/alerts?id=${result.createdAlerts[0].id}`, label: 'Open alert' } });
    }
    setText('');
    setOriginal('');
    setDrafts(null);
    setInputMode('typed');
    setEventTime(now());
    navigate('/notes?tab=history', { replace: true });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card>
        <CardHeader title="1 · Capture" subtitle="Dictate or type what you observed. Nothing is saved until you confirm." />
        <div className="space-y-5 p-5 md:p-6">
          <Field label="Resident" htmlFor="note-resident" error={errors.resident}>
            <select id="note-resident" className="input" value={residentId} onChange={(e) => { setResidentId(e.target.value); setDrafts(null); }} aria-invalid={!!errors.resident}>
              <option value="">Select a resident…</option>
              {RESIDENTS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstName} {r.lastName} — Room {r.room}, Unit {r.unit} ({r.id})
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-blue-200 bg-primary-soft/50 p-5 text-center">
            <button
              onClick={toggleMic}
              disabled={!supported}
              aria-pressed={listening}
              aria-label={listening ? 'Stop dictation' : 'Start dictation'}
              className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-pop transition disabled:cursor-not-allowed disabled:bg-slate-300 ${listening ? 'animate-pulse bg-urgent' : 'bg-primary hover:bg-primary-hover'}`}
            >
              {listening ? <MicOff size={30} /> : <Mic size={30} />}
            </button>
            <p className="text-sm font-medium">{listening ? 'Listening… tap to stop' : supported ? 'Tap to dictate' : 'Voice input is not supported in this browser'}</p>
            <p className="text-xs text-ink-muted">{supported ? 'Uses your browser’s speech recognition. Review the transcript before extracting.' : 'Use the typed transcript below — the workflow is identical.'}</p>
            {speechError && <p className="text-xs font-medium text-urgent-ink" role="alert">{speechError}</p>}
          </div>

          <Field label="Transcript" htmlFor="note-text" error={errors.text} hint="Edit freely. The original dictated text is preserved alongside your edits.">
            <textarea
              id="note-text"
              className="input min-h-[150px] py-3 leading-relaxed"
              value={text + (interim ? ` ${interim}` : '')}
              onChange={(e) => { setText(e.target.value); setDrafts(null); }}
              placeholder="e.g. Margaret seemed confused this morning and only ate a few bites of breakfast…"
              aria-invalid={!!errors.text}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event time (when observed)" htmlFor="note-time" hint="Relative phrases like “overnight” are resolved against this.">
              <input id="note-time" type="datetime-local" className="input" value={toInputValue(eventTime)} onChange={(e) => { setEventTime(fromInputValue(e.target.value)); setDrafts(null); }} />
            </Field>
            <Field label="Author" htmlFor="note-author">
              <input id="note-author" className="input bg-canvas" value={`${user.name} (${user.title})`} readOnly />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-ink-muted">Demo scripts (deterministic extraction)</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_SCRIPTS.map((s) => (
                <button key={s.id} onClick={() => loadScript(s.id)} className="min-h-[36px] rounded-full border border-line bg-white px-3 text-sm hover:border-primary hover:text-primary">
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={extract} icon={<Wand2 size={18} aria-hidden="true" />}>
            Extract observations
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="2 · Review extraction" subtitle="Edit, exclude or correct each item. Inferred symptoms are never saved silently." icon={<Sparkles size={18} aria-hidden="true" />} />
        <div className="p-5 md:p-6">
          {drafts === null ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
              Extracted observations will appear here for review. This demo uses a deterministic, rule-based extractor (no AI model or API key required).
            </div>
          ) : drafts.length === 0 ? (
            <Caveat>No observations were recognised. You can still save the note as free text, or add detail and extract again.</Caveat>
          ) : (
            <ul className="space-y-3">
              {drafts.map((d) => (
                <li key={d.tempId} className={`rounded-xl border p-4 ${d.include ? 'border-line' : 'border-dashed border-line bg-canvas opacity-70'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ObservationBadge flag={d.flag} />
                      {!d.include && <Badge tone="outline">Excluded</Badge>}
                    </div>
                    <label className="flex min-h-[36px] items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 accent-primary" checked={d.include} onChange={(e) => updateDraft(d.tempId, { include: e.target.checked })} />
                      Include
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block text-xs font-medium text-ink-muted">
                      Category
                      <select className="input mt-1" value={d.category} onChange={(e) => updateDraft(d.tempId, { category: e.target.value as ObservationCategory })}>
                        {CATS.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-ink-muted">
                      Classification
                      <select className="input mt-1" value={d.flag} onChange={(e) => updateDraft(d.tempId, { flag: e.target.value as ObservationFlag })}>
                        <option value="change">Change from baseline</option>
                        <option value="normal">At baseline</option>
                        <option value="not_assessed">Not assessed</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-ink-muted md:col-span-2">
                      Value
                      <input className="input mt-1" value={d.value} onChange={(e) => updateDraft(d.tempId, { value: e.target.value })} />
                    </label>
                    {d.category === 'appetite' && (
                      <label className="block text-xs font-medium text-ink-muted">
                        Intake estimate (%)
                        <input type="number" min={0} max={100} className="input mt-1" value={d.numeric ?? ''} onChange={(e) => updateDraft(d.tempId, { numeric: e.target.value === '' ? undefined : Number(e.target.value) })} />
                      </label>
                    )}
                    <label className="block text-xs font-medium text-ink-muted">
                      Onset / event time
                      <input type="datetime-local" className="input mt-1" value={toInputValue(d.observedAt)} onChange={(e) => updateDraft(d.tempId, { observedAt: fromInputValue(e.target.value) })} />
                    </label>
                    <label className="block text-xs font-medium text-ink-muted">
                      Source
                      <select className="input mt-1" value={d.sourceType} onChange={(e) => updateDraft(d.tempId, { sourceType: e.target.value as SourceType })}>
                        <option value="care_note">Care note</option>
                        <option value="voice_note">Voice note</option>
                        <option value="shift_handover">Shift handover</option>
                        <option value="vitals">Vitals</option>
                      </select>
                    </label>
                  </div>
                  <p className="mt-3 text-xs text-ink-muted">
                    <span className="font-medium text-ink">From text:</span> “{d.evidence}”
                  </p>
                  <button onClick={() => setDrafts((all) => all?.filter((x) => x.tempId !== d.tempId) ?? null)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-urgent-ink">
                    <Trash2 size={12} aria-hidden="true" /> Remove item
                  </button>
                </li>
              ))}
            </ul>
          )}
          {drafts !== null && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="text-sm text-ink-muted">{included.length} observation{included.length === 1 ? '' : 's'} will be saved as <strong>reported</strong>, reviewed by {user.name}.</p>
              <Button onClick={() => setConfirming(true)} icon={<CheckCircle2 size={18} aria-hidden="true" />}>
                Confirm & Save
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Confirm and save this note?"
        description="The original text, your edits, timestamps and you as reviewer are recorded. Ripple will then re-run its rules."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>Back to review</Button>
            <Button onClick={doSave} data-autofocus>Confirm & Save</Button>
          </>
        }
      >
        <p className="text-sm">
          <span className="font-medium">Resident:</span> {residentId && `${RESIDENT_BY_ID[residentId].firstName} ${RESIDENT_BY_ID[residentId].lastName}`}
        </p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {included.map((d) => (
            <li key={d.tempId} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{CATEGORY_LABEL[d.category]}:</span> {d.value} <ObservationBadge flag={d.flag} short />
            </li>
          ))}
          {included.length === 0 && <li className="text-ink-muted">No structured observations — the note will be saved as free text only.</li>}
        </ul>
      </Dialog>
    </div>
  );
}
