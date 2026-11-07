import type { ExposureComparison, PatternCluster, ResidentExposure } from '@/types';
import { RESIDENT_BY_ID, residentName } from '@/data/residents';
import { fmtDateTime } from '@/lib/time';

export type GraphSelection = { kind: 'resident' | 'exposure'; id: string } | null;

const W = 800;
const ROW_HEIGHT = 68;
const EVENT_BOX = { x: 24, width: 290, height: 142 };
const RESIDENT_BOX = { x: 500, width: 276, height: 50 };

function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function ExposureGraph({
  cluster,
  comparison,
  residentExposures,
  selection,
  onSelect,
}: {
  cluster: PatternCluster;
  comparison: ExposureComparison | undefined;
  residentExposures: ResidentExposure[];
  selection: GraphSelection;
  onSelect: (selection: GraphSelection) => void;
}) {
  if (!comparison) {
    return <p className="text-sm text-ink-muted">No shared event with documented attendees was found for this pattern.</p>;
  }

  const residents = cluster.residentIds;
  const H = Math.max(240, residents.length * ROW_HEIGHT + 24);
  const eventY = H / 2 - EVENT_BOX.height / 2;
  const eventCenterY = H / 2;
  const nameLines = wrapText(comparison.exposure.name, 30);
  const attendanceByResident = new Map(
    residentExposures
      .filter((record) => record.exposureId === comparison.exposure.id)
      .map((record) => [record.residentId, record.attendance]),
  );
  const isSelected = (kind: 'resident' | 'exposure', id: string) => selection?.kind === kind && selection.id === id;
  const eventSelected = isSelected('exposure', comparison.exposure.id);
  const attendedCount = residents.filter((id) => attendanceByResident.get(id) === 'attended').length;
  const toggleEvent = () => onSelect(eventSelected ? null : { kind: 'exposure', id: comparison.exposure.id });

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[640px]"
          role="group"
          aria-label={`Affected residents and attendance at ${comparison.exposure.name}, ${comparison.exposure.location}`}
        >
          {residents.map((id, index) => {
            if (attendanceByResident.get(id) !== 'attended') return null;
            const centerY = 12 + index * ROW_HEIGHT + RESIDENT_BOX.height / 2;
            return (
              <path
                key={`link-${id}`}
                d={`M ${EVENT_BOX.x + EVENT_BOX.width} ${eventCenterY} C 390 ${eventCenterY}, 420 ${centerY}, ${RESIDENT_BOX.x} ${centerY}`}
                fill="none"
                stroke="#60A5FA"
                strokeWidth={2}
              />
            );
          })}

          <g
            role="button"
            tabIndex={0}
            aria-pressed={eventSelected}
            aria-label={`${comparison.exposure.name} at ${comparison.exposure.location}. ${attendedCount} of ${residents.length} affected residents attended. Activate to filter evidence.`}
            onClick={toggleEvent}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleEvent();
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>.focus-ring]:opacity-100"
          >
            <rect
              className="focus-ring"
              x={EVENT_BOX.x - 3}
              y={eventY - 3}
              width={EVENT_BOX.width + 6}
              height={EVENT_BOX.height + 6}
              rx={16}
              fill="none"
              stroke="#172B4D"
              strokeWidth={2}
              opacity={eventSelected ? 1 : 0}
            />
            <rect
              x={EVENT_BOX.x}
              y={eventY}
              width={EVENT_BOX.width}
              height={EVENT_BOX.height}
              rx={14}
              fill={eventSelected ? '#DBEAFE' : '#EFF6FF'}
              stroke="#2563EB"
              strokeWidth={eventSelected ? 3 : 2}
            />
            <text x={EVENT_BOX.x + 18} y={eventY + 25} fontSize={11} fontWeight={700} letterSpacing={1} fill="#1D4ED8">
              SHARED EVENT
            </text>
            {nameLines.map((line, index) => (
              <text key={`${index}-${line}`} x={EVENT_BOX.x + 18} y={eventY + 51 + index * 19} fontSize={14} fontWeight={600} fill="#172B4D">
                {line}
              </text>
            ))}
            <text x={EVENT_BOX.x + 18} y={eventY + 111} fontSize={12} fill="#475569">
              {comparison.exposure.location}
            </text>
            <text x={EVENT_BOX.x + 18} y={eventY + 129} fontSize={11} fill="#64748B">
              {fmtDateTime(comparison.exposure.start)}
            </text>
          </g>

          {residents.map((id, index) => {
            const resident = RESIDENT_BY_ID[id];
            const centerY = 12 + index * ROW_HEIGHT + RESIDENT_BOX.height / 2;
            const attendance = attendanceByResident.get(id) ?? 'unknown';
            const selected = isSelected('resident', id);
            const toggleResident = () => onSelect(selected ? null : { kind: 'resident', id });
            const status = attendance === 'attended'
              ? 'Attended'
              : attendance === 'absent'
                ? 'Did not attend'
                : 'Attendance unknown';
            const statusColor = attendance === 'attended' ? '#1D4ED8' : attendance === 'absent' ? '#64748B' : '#B45309';

            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${residentName(id)}, Room ${resident.room}. ${status}. Activate to filter evidence.`}
                onClick={toggleResident}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleResident();
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>.focus-ring]:opacity-100"
              >
                <rect
                  className="focus-ring"
                  x={RESIDENT_BOX.x - 3}
                  y={centerY - RESIDENT_BOX.height / 2 - 3}
                  width={RESIDENT_BOX.width + 6}
                  height={RESIDENT_BOX.height + 6}
                  rx={12}
                  fill="none"
                  stroke="#172B4D"
                  strokeWidth={2}
                  opacity={selected ? 1 : 0}
                />
                <rect
                  x={RESIDENT_BOX.x}
                  y={centerY - RESIDENT_BOX.height / 2}
                  width={RESIDENT_BOX.width}
                  height={RESIDENT_BOX.height}
                  rx={10}
                  fill={selected ? '#DBEAFE' : '#FFFFFF'}
                  stroke={selected ? '#2563EB' : '#CBD5E1'}
                  strokeWidth={selected ? 2 : 1}
                />
                <text x={RESIDENT_BOX.x + 16} y={centerY - 2} fontSize={14} fontWeight={600} fill="#172B4D">
                  {residentName(id)}
                </text>
                <text x={RESIDENT_BOX.x + 16} y={centerY + 15} fontSize={11} fill={statusColor}>
                  Room {resident.room} · {status}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Lines connect residents documented as attending this event ({attendedCount} of {residents.length}). The event is a hypothesis for review, not evidence of cause. Select a resident or the event to filter the evidence panel.
      </p>
    </div>
  );
}
