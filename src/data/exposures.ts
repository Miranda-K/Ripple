// Synthetic shared exposures: dining seatings, activities, room changes and
// possible-contact events, with a resident attendance join table.
import type { Attendance, Exposure, ResidentExposure } from '@/types';
import { at } from '@/lib/time';
import { rand, seededShuffle } from '@/lib/random';
import { RESIDENTS, STORY } from './residents';

export const HARVEST_LUNCH_ID = 'x-meal-d-2-lunch-A';

const DAYS = [-5, -4, -3, -2, -1];

function mealExposures(): Exposure[] {
  const out: Exposure[] = [];
  for (const d of DAYS) {
    for (const seating of ['A', 'B'] as const) {
      out.push({
        id: `x-meal-d${d}-lunch-${seating}`,
        type: 'meal',
        name: d === -2 && seating === 'A' ? 'Harvest Lunch — Seating A' : `Lunch — Seating ${seating}`,
        start: at(d, seating === 'A' ? '11:45' : '13:00'),
        end: at(d, seating === 'A' ? '12:45' : '14:00'),
        location: 'Main Dining Room',
        detail: d === -2 && seating === 'A' ? 'Special menu: roast turkey, mashed potato, cream sauce, pumpkin custard' : 'Regular menu',
      });
      out.push({
        id: `x-meal-d${d}-dinner-${seating}`,
        type: 'meal',
        name: `Dinner — Seating ${seating}`,
        start: at(d, seating === 'A' ? '17:00' : '18:00'),
        end: at(d, seating === 'A' ? '17:50' : '18:50'),
        location: 'Main Dining Room',
        detail: 'Regular menu',
      });
    }
  }
  return out;
}

const OTHER_EXPOSURES: Exposure[] = [
  { id: 'x-act-music', type: 'activity', name: 'Music Circle', start: at(-4, '14:00'), end: at(-4, '15:00'), location: 'Unit B Lounge' },
  { id: 'x-act-yoga', type: 'activity', name: 'Chair Yoga', start: at(-3, '10:00'), end: at(-3, '10:45'), location: 'Activity Room' },
  { id: 'x-act-bingo', type: 'activity', name: 'Bingo Afternoon', start: at(-2, '14:30'), end: at(-2, '15:30'), location: 'Main Lounge' },
  { id: 'x-act-pets', type: 'activity', name: 'Pet Therapy Visit', start: at(-1, '11:00'), end: at(-1, '11:45'), location: 'Garden Room' },
  { id: 'x-act-movie', type: 'activity', name: 'Family Movie Night', start: at(-5, '19:00'), end: at(-5, '21:00'), location: 'Main Lounge' },
  { id: 'x-room-george', type: 'room_change', name: 'Room move: 211 → 209', start: at(-5, '10:00'), end: at(-5, '11:00'), location: 'Unit B', detail: 'Planned move closer to nursing station' },
  { id: 'x-contact-bath', type: 'contact', name: 'Shared bathroom (Rooms 203 & 204)', start: at(-30, '00:00'), end: at(0, '08:00'), location: 'Unit B', detail: 'Ongoing shared facility' },
  { id: 'x-contact-visitor', type: 'contact', name: 'Visitor with cold symptoms (self-reported)', start: at(-4, '15:00'), end: at(-4, '16:30'), location: 'Unit B, Room 206', detail: 'Visitor mentioned a cold; no visitor log of symptoms' },
];

export const EXPOSURES: Exposure[] = [...mealExposures(), ...OTHER_EXPOSURES].sort((a, b) => a.start.localeCompare(b.start));

export const EXPOSURE_BY_ID: Record<string, Exposure> = Object.fromEntries(EXPOSURES.map((e) => [e.id, e]));

function build(): ResidentExposure[] {
  const out: ResidentExposure[] = [];
  const push = (exposureId: string, residentId: string, attendance: Attendance, source: ResidentExposure['source']) =>
    out.push({ id: `re-${exposureId}-${residentId}`, exposureId, residentId, attendance, source });

  // Usual seating: deterministic half/half, with story residents mixed across seatings.
  const usual = new Map<string, 'A' | 'B'>();
  RESIDENTS.forEach((r) => usual.set(r.id, rand(`${r.id}:seat`) < 0.5 ? 'A' : 'B'));
  usual.set('R-1007', 'A');
  usual.set('R-1026', 'B');
  usual.set('R-1030', 'A');
  usual.set('R-1038', 'B');
  usual.set('R-1043', 'B');

  // Harvest Lunch Seating A: exactly 20 attendees (4 later symptomatic), 2 unknown, 26 absent.
  const unknown = new Set<string>(STORY.unknownAttendance);
  const fixed = new Set<string>(STORY.giAttendees);
  const pool = seededShuffle(
    RESIDENTS.map((r) => r.id).filter((id) => !unknown.has(id) && !fixed.has(id) && !(STORY.gi as readonly string[]).includes(id)),
    'harvest-lunch',
  );
  const harvestA = new Set<string>([...fixed, ...pool.slice(0, 16)]);

  for (const d of DAYS) {
    for (const meal of ['lunch', 'dinner'] as const) {
      for (const r of RESIDENTS) {
        const k = `${r.id}:${d}:${meal}`;
        let seat: 'A' | 'B' | 'tray' | 'unknown';
        if (d === -2 && meal === 'lunch') {
          seat = unknown.has(r.id) ? 'unknown' : harvestA.has(r.id) ? 'A' : r.id === STORY.giNonAttendee ? 'tray' : 'B';
        } else {
          const roll = rand(k);
          // Story residents keep their usual seating so only the Harvest Lunch stands out.
          if ((STORY.gi as readonly string[]).includes(r.id)) seat = usual.get(r.id)!;
          else if (roll < 0.04) seat = 'unknown';
          else if (roll < 0.1) seat = 'tray';
          else if (roll < 0.17) seat = usual.get(r.id) === 'A' ? 'B' : 'A';
          else seat = usual.get(r.id)!;
        }
        for (const s of ['A', 'B'] as const) {
          const attendance: Attendance = seat === 'unknown' ? 'unknown' : seat === s ? 'attended' : 'absent';
          push(`x-meal-d${d}-${meal}-${s}`, r.id, attendance, 'dining_log');
        }
      }
    }
  }

  // Activities
  const activity = (exposureId: string, attendees: string[], unknownIds: string[] = []) => {
    const a = new Set(attendees);
    const u = new Set(unknownIds);
    RESIDENTS.forEach((r) => push(exposureId, r.id, u.has(r.id) ? 'unknown' : a.has(r.id) ? 'attended' : 'absent', 'activity_log'));
  };
  activity('x-act-music', ['R-1015', 'R-1018', 'R-1013', 'R-1016', 'R-1019', 'R-1023', 'R-1024', 'R-1004', 'R-1001'], ['R-1022']);
  const pick = (seed: string, n: number, extra: string[] = []) =>
    [...extra, ...seededShuffle(RESIDENTS.map((r) => r.id).filter((id) => !extra.includes(id)), seed).slice(0, n - extra.length)];
  activity('x-act-yoga', pick('yoga', 14, ['R-1001', 'R-1007']));
  activity('x-act-bingo', pick('bingo', 18, ['R-1026', 'R-1043', 'R-1018']), ['R-1035']);
  activity('x-act-pets', pick('pets', 10, ['R-1021']));
  activity('x-act-movie', pick('movie', 16, ['R-1004', 'R-1030']), ['R-1012', 'R-1044']);
  // Room change & contacts only list involved residents (attended); everyone else absent.
  activity('x-room-george', ['R-1021']);
  activity('x-contact-bath', ['R-1015', 'R-1016']);
  activity('x-contact-visitor', ['R-1018']);
  return out;
}

export const RESIDENT_EXPOSURES: ResidentExposure[] = build();
