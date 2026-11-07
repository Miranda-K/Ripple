import { useState } from 'react';
import { ChevronDown, Key } from 'lucide-react';
import type { AssessmentItemResponse, ItemAnswer } from '@/types';
import { ASSESSMENT_ITEMS, DOMAIN_LABEL, DOMAINS } from '@/lib/assessmentItems';
import { fromInputValue, toInputValue } from '@/lib/time';

const OPTIONS: { value: ItemAnswer; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_assessed', label: 'Not assessed' },
];

export function AssessmentForm({
  responses,
  onChange,
  readOnly,
  invalidIds,
  defaultObserver,
  defaultTime,
}: {
  responses: Record<string, AssessmentItemResponse>;
  onChange: (id: string, r: AssessmentItemResponse) => void;
  readOnly?: boolean;
  invalidIds: Set<string>;
  defaultObserver: string;
  defaultTime: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-5">
      {DOMAINS.map((domain) => {
        const items = ASSESSMENT_ITEMS.filter((i) => i.domain === domain);
        const done = items.filter((i) => responses[i.id]?.answer).length;
        return (
          <fieldset key={domain} className="rounded-xl border border-line">
            <legend className="sr-only">{DOMAIN_LABEL[domain]}</legend>
            <div className="flex items-center justify-between border-b border-line bg-canvas/70 px-4 py-3">
              <h3 className="font-semibold">{DOMAIN_LABEL[domain]}</h3>
              <span className="text-xs text-ink-muted">{done}/{items.length} answered</span>
            </div>
            <div className="divide-y divide-line">
              {items.map((item) => {
                const r = responses[item.id] ?? { answer: null };
                const invalid = invalidIds.has(item.id);
                const name = `q-${item.id}`;
                return (
                  <div key={item.id} className={`px-4 py-3 ${invalid ? 'bg-urgent-soft/40' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p id={`${name}-label`} className="flex-1 text-[15px]">
                        {item.prompt}
                        {item.key && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 text-xs font-medium text-primary">
                            <Key size={11} aria-hidden="true" /> Key
                          </span>
                        )}
                      </p>
                      <div role="radiogroup" aria-labelledby={`${name}-label`} aria-invalid={invalid} className="flex overflow-hidden rounded-lg border border-line">
                        {OPTIONS.map((o) => {
                          const checked = r.answer === o.value;
                          return (
                            <label key={o.value} className={`flex min-h-[40px] cursor-pointer items-center border-l border-line px-3 text-sm font-medium first:border-l-0 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${checked ? (o.value === 'yes' ? 'bg-review-soft text-review-ink' : o.value === 'no' ? 'bg-primary-soft text-primary' : 'bg-slate-200 text-slate-800') : 'bg-white text-ink-muted hover:bg-canvas'} ${readOnly ? 'cursor-default' : ''}`}>
                              <input
                                type="radio"
                                name={name}
                                value={o.value}
                                checked={checked}
                                disabled={readOnly}
                                onChange={() => onChange(item.id, { ...r, answer: o.value, observer: r.observer ?? defaultObserver, eventTime: r.eventTime ?? defaultTime })}
                                className="sr-only"
                              />
                              {o.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    {invalid && <p className="mt-1 text-xs font-medium text-urgent-ink">Choose Yes, No or Not assessed.</p>}
                    <button
                      type="button"
                      onClick={() => setOpen((s) => ({ ...s, [item.id]: !s[item.id] }))}
                      aria-expanded={!!open[item.id]}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-primary"
                    >
                      <ChevronDown size={14} className={open[item.id] ? 'rotate-180' : ''} aria-hidden="true" />
                      Notes, event time & observer{r.note ? ' (note added)' : ''}
                    </button>
                    {open[item.id] && (
                      <div className="mt-2 grid gap-3 md:grid-cols-3">
                        <label className="text-xs font-medium text-ink-muted md:col-span-3">
                          Note (optional)
                          <textarea className="input mt-1 min-h-[64px] py-2" value={r.note ?? ''} disabled={readOnly} onChange={(e) => onChange(item.id, { ...r, note: e.target.value })} />
                        </label>
                        <label className="text-xs font-medium text-ink-muted">
                          Event time
                          <input type="datetime-local" className="input mt-1" disabled={readOnly} value={toInputValue(r.eventTime ?? defaultTime)} onChange={(e) => onChange(item.id, { ...r, eventTime: fromInputValue(e.target.value) })} />
                        </label>
                        <label className="text-xs font-medium text-ink-muted md:col-span-2">
                          Observer
                          <input className="input mt-1" disabled={readOnly} value={r.observer ?? defaultObserver} onChange={(e) => onChange(item.id, { ...r, observer: e.target.value })} />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
