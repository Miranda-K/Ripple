import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Table2, BarChart3 } from 'lucide-react';
import type { UnitId } from '@/types';
import { fmtDate } from '@/lib/time';

export const SERIES = { gi: '#2563EB', respiratory: '#D97706' };
const AXIS = { fontSize: 12, fill: '#64748B' };

function ViewToggle({ table, onToggle, label }: { table: boolean; onToggle: () => void; label: string }) {
  return (
    <button onClick={onToggle} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ink-muted hover:bg-primary-soft hover:text-primary" aria-pressed={table}>
      {table ? <BarChart3 size={16} aria-hidden="true" /> : <Table2 size={16} aria-hidden="true" />}
      {table ? `Show ${label} chart` : 'View as table'}
    </button>
  );
}

const shortDay = (k: string) => fmtDate(`${k}T12:00:00`).replace(/^\w+,\s*/, '');

interface OnsetRow {
  day: string;
  gi: number;
  respiratory: number;
}

export function OnsetChart({ data }: { data: OnsetRow[] }) {
  const [table, setTable] = useState(false);
  const rows = data.map((d) => ({ ...d, label: shortDay(d.day) }));
  const total = data.reduce((s, d) => s + d.gi + d.respiratory, 0);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-ink-muted">{total} new symptom onsets documented over 7 days</p>
        <ViewToggle table={table} onToggle={() => setTable((t) => !t)} label="onset" />
      </div>
      {table ? (
        <table className="w-full text-sm">
          <caption className="sr-only">New symptom onsets per day</caption>
          <thead>
            <tr className="border-b border-line">
              <th className="table-th">Day</th>
              <th className="table-th text-right">Gastrointestinal</th>
              <th className="table-th text-right">Respiratory</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day} className="border-b border-line last:border-0">
                <td className="table-td">{r.label}</td>
                <td className="table-td text-right tabular-nums">{r.gi}</td>
                <td className="table-td text-right tabular-nums">{r.respiratory}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-[220px]" role="img" aria-label={`Stacked bar chart of new symptom onsets per day: ${rows.map((r) => `${r.label} ${r.gi} GI, ${r.respiratory} respiratory`).join('; ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="#E2EAF3" />
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#EFF6FF' }}
                contentStyle={{ borderRadius: 10, border: '1px solid #E2EAF3', fontSize: 13, color: '#172B4D' }}
                formatter={(v: number, name: string) => [`${v} resident${v === 1 ? '' : 's'}`, name]}
              />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 13, color: '#172B4D' }} />
              <Bar dataKey="gi" name="Gastrointestinal" stackId="a" fill={SERIES.gi} stroke="#fff" strokeWidth={2} />
              <Bar dataKey="respiratory" name="Respiratory" stackId="a" fill={SERIES.respiratory} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const HEAT = ['#F7FAFE', '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8'];
function heatColor(v: number, max: number) {
  if (v === 0) return HEAT[0];
  const i = Math.min(HEAT.length - 1, 1 + Math.floor(((v - 1) / Math.max(1, max - 1)) * (HEAT.length - 2) + 0.0001));
  return HEAT[i];
}

export function UnitHeatmap({ dayKeys, cells }: { dayKeys: string[]; cells: Record<UnitId, number[]> }) {
  const max = Math.max(1, ...Object.values(cells).flat());
  const units = Object.keys(cells) as UnitId[];
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-[3px] text-sm">
          <caption className="sr-only">Documented changes from baseline per unit per day</caption>
          <thead>
            <tr>
              <th className="w-16 text-left text-xs font-medium text-ink-muted" scope="col">
                Unit
              </th>
              {dayKeys.map((k) => (
                <th key={k} scope="col" className="text-center text-xs font-medium text-ink-muted">
                  {shortDay(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u}>
                <th scope="row" className="text-left text-sm font-medium">
                  Unit {u}
                </th>
                {cells[u].map((v, i) => (
                  <td
                    key={i}
                    title={`Unit ${u}, ${shortDay(dayKeys[i])}: ${v} documented change${v === 1 ? '' : 's'}`}
                    className={`h-10 rounded-md text-center text-xs font-semibold tabular-nums ${v >= max * 0.6 && v > 0 ? 'text-white' : 'text-ink'}`}
                    style={{ background: heatColor(v, max), boxShadow: v === 0 ? 'inset 0 0 0 1px #E2EAF3' : undefined }}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <span>Fewer</span>
        {HEAT.map((c) => (
          <span key={c} className="h-3 w-6 rounded-sm" style={{ background: c, boxShadow: 'inset 0 0 0 1px #E2EAF3' }} aria-hidden="true" />
        ))}
        <span>More documented changes</span>
      </div>
    </div>
  );
}
