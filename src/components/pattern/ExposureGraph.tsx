import type { ExposureComparison, PatternCluster, ResidentExposure } from '@/types';
import { RESIDENT_BY_ID, residentName } from '@/data/residents';

export type GraphSelection = { kind: 'resident' | 'exposure' | 'room'; id: string } | null;

const W = 760;

/** Deterministic three-column relationship graph: rooms/units ← residents → shared exposures. */
export function ExposureGraph({
  cluster,
  comparisons,
  residentExposures,
  selection,
  onSelect,
}: {
  cluster: PatternCluster;
  comparisons: ExposureComparison[];
  residentExposures: ResidentExposure[];
  selection: GraphSelection;
  onSelect: (s: GraphSelection) => void;
}) {
  const residents = cluster.residentIds;
  const exposures = comparisons.filter((c) => c.exposedSymptomatic >= 2).slice(0, 6).map((c) => c.exposure);
  const rooms = [...new Set(residents.map((id) => `Unit ${RESIDENT_BY_ID[id].unit}`))].sort();
  const rows = Math.max(residents.length, exposures.length, rooms.length);
  const H = Math.max(280, rows * 84 + 50);
  const colX = { room: 110, resident: 330, exposure: 540 };
  const yFor = (i: number, n: number) => 34 + ((i + 0.5) * (H - 80)) / n;

  const rPos = new Map(residents.map((id, i) => [id, yFor(i, residents.length)]));
  const ePos = new Map(exposures.map((e, i) => [e.id, yFor(i, exposures.length)]));
  const uPos = new Map(rooms.map((u, i) => [u, yFor(i, rooms.length)]));

  const attended = new Set(residentExposures.filter((re) => re.attendance === 'attended').map((re) => `${re.exposureId}|${re.residentId}`));
  const isSel = (kind: string, id: string) => selection?.kind === kind && selection.id === id;
  const linkedToSel = (rid: string, other: { kind: string; id: string }) => {
    if (!selection) return true;
    if (selection.kind === 'resident') return selection.id === rid;
    return selection.kind === other.kind && selection.id === other.id;
  };

  const renderNode = ({ kind, id, x, y, label, sub, shape }: { kind: 'resident' | 'exposure' | 'room'; id: string; x: number; y: number; label: string; sub?: string; shape: 'circle' | 'rect' | 'pill' }) => {
    const sel = isSel(kind, id);
    const toggle = () => onSelect(sel ? null : { kind, id });
    const fill = kind === 'resident' ? '#2563EB' : kind === 'exposure' ? '#FEF3C7' : '#EFF6FF';
    const stroke = kind === 'exposure' ? '#D97706' : '#2563EB';
    const anchor = kind === 'room' ? 'end' : kind === 'resident' ? 'middle' : 'start';
    const tx = kind === 'room' ? x - 22 : kind === 'resident' ? x : x + 22;
    const ly = kind === 'resident' ? y + 32 : sub ? y - 2 : y + 4;
    return (
      <g
        key={`${kind}-${id}`}
        role="button"
        tabIndex={0}
        aria-pressed={sel}
        aria-label={`${label}${sub ? `, ${sub}` : ''}. ${sel ? 'Selected. Activate to clear filter.' : 'Activate to filter evidence.'}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        className="cursor-pointer outline-none [&:focus-visible>.ring]:opacity-100"
      >
        <circle className="ring" cx={x} cy={y} r={20} fill="none" stroke="#172B4D" strokeWidth={2} opacity={sel ? 1 : 0} />
        {shape === 'circle' && <circle cx={x} cy={y} r={14} fill={fill} stroke="#fff" strokeWidth={3} />}
        {shape === 'rect' && <rect x={x - 13} y={y - 13} width={26} height={26} rx={6} fill={fill} stroke={stroke} strokeWidth={2} />}
        {shape === 'pill' && <rect x={x - 14} y={y - 11} width={28} height={22} rx={11} fill={fill} stroke={stroke} strokeWidth={2} />}
        <text x={tx} y={ly} textAnchor={anchor} fontSize={13} fontWeight={600} fill="#172B4D">
          {label}
        </text>
        {sub && (
          <text x={tx} y={kind === 'resident' ? ly + 14 : y + 14} textAnchor={anchor} fontSize={11} fill="#64748B">
            {sub}
          </text>
        )}
      </g>
    );
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" role="group" aria-label="Relationship graph of affected residents, their units and shared exposures">
          <text x={colX.room} y={16} textAnchor="middle" fontSize={11} fill="#64748B" fontWeight={600} letterSpacing={1}>UNITS</text>
          <text x={colX.resident} y={16} textAnchor="middle" fontSize={11} fill="#64748B" fontWeight={600} letterSpacing={1}>RESIDENTS</text>
          <text x={colX.exposure + 90} y={16} textAnchor="middle" fontSize={11} fill="#64748B" fontWeight={600} letterSpacing={1}>SHARED EXPOSURES</text>
          {residents.map((rid) => {
            const u = `Unit ${RESIDENT_BY_ID[rid].unit}`;
            const on = linkedToSel(rid, { kind: 'room', id: u });
            return <line key={`u-${rid}`} x1={colX.room} y1={uPos.get(u)} x2={colX.resident} y2={rPos.get(rid)} stroke={on ? '#93C5FD' : '#E2EAF3'} strokeWidth={on ? 2 : 1.5} />;
          })}
          {residents.flatMap((rid) =>
            exposures
              .filter((e) => attended.has(`${e.id}|${rid}`))
              .map((e) => {
                const on = linkedToSel(rid, { kind: 'exposure', id: e.id });
                return <line key={`e-${rid}-${e.id}`} x1={colX.resident} y1={rPos.get(rid)} x2={colX.exposure} y2={ePos.get(e.id)} stroke={on ? '#D97706' : '#E2EAF3'} strokeWidth={on ? 2 : 1.5} opacity={on ? 0.8 : 1} />;
              }),
          )}
          {rooms.map((u) => (
            renderNode({ kind: 'room', id: u, x: colX.room, y: uPos.get(u)!, label: u, shape: 'pill' })
          ))}
          {residents.map((rid) => (
            renderNode({ kind: 'resident', id: rid, x: colX.resident, y: rPos.get(rid)!, label: residentName(rid), sub: `Room ${RESIDENT_BY_ID[rid].room}`, shape: 'circle' })
          ))}
          {exposures.map((e) => {
            const c = comparisons.find((x) => x.exposure.id === e.id)!;
            return renderNode({ kind: 'exposure', id: e.id, x: colX.exposure, y: ePos.get(e.id)!, label: e.name.length > 24 ? `${e.name.slice(0, 23)}…` : e.name, sub: `${c.exposedSymptomatic} of ${c.exposedTotal} attendees symptomatic`, shape: 'rect' });
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Shows exposures attended by 2 or more affected residents. Select any node to filter the evidence panel; select it again to clear. Lines show documented attendance or unit residence — not transmission.
      </p>
    </div>
  );
}
