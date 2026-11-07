import { FileSearch, Lightbulb } from 'lucide-react';
import type { ExposureComparison } from '@/types';
import { fmtDateTime } from '@/lib/time';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Caveat } from '../ui/misc';

const pct = (r: number | null) => (r === null ? '—' : `${(r * 100).toFixed(1).replace(/\.0$/, '')}%`);

function RateBar({ label, num, den, rate, color }: { label: string; num: number; den: number; rate: number | null; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          <strong>{pct(rate)}</strong> <span className="text-ink-muted">({num} of {den})</span>
        </span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${Math.max(rate ? 2 : 0, (rate ?? 0) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

export function ExposureComparisonView({
  comparisons,
  focusId,
  onFocus,
  onViewSources,
  domainLabel,
}: {
  comparisons: ExposureComparison[];
  focusId?: string;
  onFocus: (id: string) => void;
  onViewSources: (c: ExposureComparison) => void;
  domainLabel: string;
}) {
  if (!comparisons.length) return <p className="text-sm text-ink-muted">No shared exposures with symptomatic attendees were recorded in the 72 h before the first onset.</p>;
  const c = comparisons.find((x) => x.exposure.id === focusId) ?? comparisons[0];
  const cell = 'px-3 py-2.5 text-right tabular-nums';
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label">Focus exposure</p>
            <h3 className="mt-1 text-lg font-semibold">{c.exposure.name}</h3>
            <p className="text-sm text-ink-muted">
              {fmtDateTime(c.exposure.start)} · {c.exposure.location}
              {c.exposure.detail ? ` · ${c.exposure.detail}` : ''}
            </p>
          </div>
          <Button size="sm" variant="secondary" icon={<FileSearch size={16} aria-hidden="true" />} onClick={() => onViewSources(c)}>
            View source records
          </Button>
        </div>

        <div className="mt-5 grid gap-6 2xl:grid-cols-[1.2fr_1fr]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <caption className="mb-2 text-left text-xs text-ink-muted">Residents with a new {domainLabel} symptom (symptomatic) vs. not, by documented attendance</caption>
              <thead className="border-b border-line">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted" scope="col">Attendance</th>
                  <th className={`${cell} text-xs font-semibold uppercase tracking-wider text-ink-muted`} scope="col">Symptomatic</th>
                  <th className={`${cell} text-xs font-semibold uppercase tracking-wider text-ink-muted`} scope="col">Not symptomatic</th>
                  <th className={`${cell} text-xs font-semibold uppercase tracking-wider text-ink-muted`} scope="col">Total</th>
                  <th className={`${cell} text-xs font-semibold uppercase tracking-wider text-ink-muted`} scope="col">Symptom rate</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line bg-primary-soft/50">
                  <th scope="row" className="px-3 py-2.5 text-left font-medium">Attended</th>
                  <td className={`${cell} font-semibold`}>{c.exposedSymptomatic}</td>
                  <td className={cell}>{c.exposedTotal - c.exposedSymptomatic}</td>
                  <td className={cell}>{c.exposedTotal}</td>
                  <td className={`${cell} font-semibold`}>{pct(c.exposedRate)}</td>
                </tr>
                <tr className="border-b border-line">
                  <th scope="row" className="px-3 py-2.5 text-left font-medium">Did not attend</th>
                  <td className={`${cell} font-semibold`}>{c.unexposedSymptomatic}</td>
                  <td className={cell}>{c.unexposedTotal - c.unexposedSymptomatic}</td>
                  <td className={cell}>{c.unexposedTotal}</td>
                  <td className={`${cell} font-semibold`}>{pct(c.unexposedRate)}</td>
                </tr>
                <tr className="text-ink-muted">
                  <th scope="row" className="px-3 py-2.5 text-left font-medium">Unknown (excluded)</th>
                  <td className={cell}>{c.unknownSymptomatic}</td>
                  <td className={cell}>{c.unknownTotal - c.unknownSymptomatic}</td>
                  <td className={cell}>{c.unknownTotal}</td>
                  <td className={cell}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-4">
            <RateBar label="Attended" num={c.exposedSymptomatic} den={c.exposedTotal} rate={c.exposedRate} color="#2563EB" />
            <RateBar label="Did not attend" num={c.unexposedSymptomatic} den={c.unexposedTotal} rate={c.unexposedRate} color="#94A3B8" />
            <p className="text-sm text-ink-muted">
              Rate ratio: <strong className="text-ink">{c.rateRatio === null ? 'not calculable' : `${c.rateRatio.toFixed(1)}×`}</strong>
              {c.rateRatio !== null && ' (descriptive only; no confidence interval at this sample size)'}
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3 rounded-lg border border-blue-200 bg-primary-soft p-4">
          <Lightbulb size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-navy">Hypothesis for review — not a cause</p>
            <p className="mt-1">
              {c.exposedSymptomatic} of {c.exposedSymptomatic + c.unexposedSymptomatic + c.unknownSymptomatic} symptomatic residents attended {c.exposure.name}. Among all attendees the documented symptom rate was {pct(c.exposedRate)}, compared with{' '}
              {pct(c.unexposedRate)} among residents who did not attend. This is an association in a small group; it does not establish that the exposure caused symptoms. Consider it alongside clinical assessment and local infection-prevention guidance.
            </p>
          </div>
        </div>
        {c.caveats.length > 0 && (
          <div className="mt-3 space-y-2">
            {c.caveats.map((t) => (
              <Caveat key={t}>{t}</Caveat>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">All shared exposures in the 72 h before first onset ({comparisons.length})</h3>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line bg-canvas/70">
              <tr>
                <th className="table-th">Exposure</th>
                <th className="table-th text-right">Attendees symptomatic</th>
                <th className="table-th text-right">Non-attendees symptomatic</th>
                <th className="table-th text-right">Unknown</th>
                <th className="table-th"><span className="sr-only">Select</span></th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((x) => (
                <tr key={x.exposure.id} className={`border-b border-line last:border-0 ${x.exposure.id === c.exposure.id ? 'bg-primary-soft/50' : ''}`}>
                  <td className="table-td">
                    <span className="font-medium">{x.exposure.name}</span>
                    <span className="block text-xs text-ink-muted">{fmtDateTime(x.exposure.start)} · {x.exposure.type.replace('_', ' ')}</span>
                  </td>
                  <td className="table-td text-right tabular-nums">{x.exposedSymptomatic}/{x.exposedTotal} <span className="text-ink-muted">({pct(x.exposedRate)})</span></td>
                  <td className="table-td text-right tabular-nums">{x.unexposedSymptomatic}/{x.unexposedTotal} <span className="text-ink-muted">({pct(x.unexposedRate)})</span></td>
                  <td className="table-td text-right tabular-nums">{x.unknownTotal}</td>
                  <td className="table-td text-right">
                    {x.exposure.id === c.exposure.id ? (
                      <Badge tone="blue">In focus</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => onFocus(x.exposure.id)}>Focus</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
