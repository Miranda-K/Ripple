import type { Exposure, Observation, PatternCluster } from '@/types';
import { residentName, RESIDENT_BY_ID } from '@/data/residents';
import { fmtDate, fmtDateTime, fmtTime, parse, at } from '@/lib/time';
import { CATEGORY_LABEL } from '@/lib/analytics';

const W = 760;
const ROW = 46;
const LEFT = 150;
const RIGHT = 20;

export function PatternTimeline({ cluster, observations, focusExposure, onSelectResident }: { cluster: PatternCluster; observations: Observation[]; focusExposure?: Exposure; onSelectResident: (id: string) => void }) {
  const start = Math.min(parse(cluster.firstOnset) - 72 * 3_600_000, focusExposure ? parse(focusExposure.start) - 6 * 3_600_000 : Infinity);
  const end = parse(at(0, '08:00'));
  const x = (iso: string) => LEFT + ((parse(iso) - start) / (end - start)) * (W - LEFT - RIGHT);
  const rows = [...cluster.onsets];
  const H = 40 + rows.length * ROW + 30;
  const dayTicks: string[] = [];
  for (let d = -10; d <= 0; d++) {
    const t = at(d, '00:00');
    if (parse(t) >= start) dayTicks.push(t);
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[620px]" role="img" aria-label={`Onset timeline for ${rows.length} residents`}>
          {dayTicks.map((d) => (
            <g key={d}>
              <line x1={x(d)} x2={x(d)} y1={28} y2={H - 26} stroke="#E2EAF3" />
              <text x={x(d) + 4} y={20} fontSize={11} fill="#64748B">
                {fmtDate(d)}
              </text>
            </g>
          ))}
          {focusExposure && (
            <g>
              <rect x={x(focusExposure.start)} y={28} width={Math.max(3, x(focusExposure.end) - x(focusExposure.start))} height={H - 54} fill="#FEF3C7" />
              <line x1={x(focusExposure.start)} x2={x(focusExposure.start)} y1={28} y2={H - 26} stroke="#D97706" strokeWidth={2} strokeDasharray="4 3" />
              <text x={x(focusExposure.start) + 5} y={H - 10} fontSize={11} fill="#92400E" fontWeight={600}>
                {focusExposure.name} · {fmtTime(focusExposure.start)}
              </text>
            </g>
          )}
          {rows.map((o, i) => {
            const y = 40 + i * ROW + ROW / 2;
            const r = RESIDENT_BY_ID[o.residentId];
            const events = observations.filter((ob) => ob.residentId === o.residentId && (ob.category === cluster.domain || ob.category === 'fever') && ob.flag === 'change');
            return (
              <g key={o.residentId}>
                <line x1={LEFT} x2={W - RIGHT} y1={y} y2={y} stroke="#EFF6FF" strokeWidth={10} strokeLinecap="round" />
                <text x={8} y={y - 3} fontSize={13} fill="#172B4D" fontWeight={600}>
                  {residentName(o.residentId)}
                </text>
                <text x={8} y={y + 13} fontSize={11} fill="#64748B">
                  Room {r.room} · Unit {r.unit}
                </text>
                {events.map((ev) => {
                  const isOnset = ev.id === o.observationId;
                  return (
                    <g
                      key={ev.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${residentName(o.residentId)}: ${ev.value}, ${fmtDateTime(ev.observedAt)}${isOnset ? ' (onset)' : ''}`}
                      onClick={() => onSelectResident(o.residentId)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectResident(o.residentId)}
                      className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[#172B4D]"
                    >
                      <title>{`${CATEGORY_LABEL[ev.category]}: ${ev.value} — ${fmtDateTime(ev.observedAt)}`}</title>
                      <circle cx={x(ev.observedAt)} cy={y} r={14} fill="transparent" />
                      {ev.category === 'fever' ? (
                        <rect x={x(ev.observedAt) - 5} y={y - 5} width={10} height={10} transform={`rotate(45 ${x(ev.observedAt)} ${y})`} fill="#fff" stroke="#2563EB" strokeWidth={2} />
                      ) : (
                        <circle cx={x(ev.observedAt)} cy={y} r={isOnset ? 8 : 5.5} fill={isOnset ? '#2563EB' : '#93C5FD'} stroke="#fff" strokeWidth={2} />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-primary" aria-hidden="true" /> First documented onset</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-300" aria-hidden="true" /> Later symptom record</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 border-2 border-primary bg-white" aria-hidden="true" /> Temperature record</span>
        {focusExposure && <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-dashed border-review bg-review-soft" aria-hidden="true" /> Focus exposure</span>}
      </div>
    </div>
  );
}
