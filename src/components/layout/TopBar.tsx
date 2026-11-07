import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, Waves } from 'lucide-react';
import { useRippleStore } from '@/store/useRippleStore';
import { useAnalysis, useCurrentUser, useVisibleAlerts } from '@/store/selectors';
import { RESIDENTS } from '@/data/residents';
import { ROLE_LABEL } from '@/data/staff';
import { FACILITY_NAME } from '@/lib/config';
import { relative } from '@/lib/time';
import type { UserRole } from '@/types';
import { AlertTypeBadge, DemoDataBadge, ResidentAvatar } from '../badges';

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { clusters } = useAnalysis();
  const wrap = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const res = RESIDENTS.filter((r) =>
      `${r.firstName} ${r.lastName} ${r.preferredName ?? ''} ${r.id} room ${r.room} unit ${r.unit}`.toLowerCase().includes(t),
    )
      .slice(0, 6)
      .map((r) => ({ id: r.id, label: `${r.firstName} ${r.lastName}`, sub: `${r.id} · Room ${r.room} · Unit ${r.unit}`, to: `/residents/${r.id}`, resident: r }));
    const pats = clusters
      .filter((c) => c.title.toLowerCase().includes(t) || c.domain.includes(t))
      .map((c) => ({ id: c.id, label: c.title, sub: 'Pattern', to: `/patterns?pattern=${c.id}`, resident: undefined }));
    return [...res, ...pats];
  }, [q, clusters]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (to: string) => {
    navigate(to);
    setQ('');
    setOpen(false);
  };

  return (
    <div ref={wrap} className="relative w-full max-w-md">
      <label className="relative block">
        <span className="sr-only">Search residents and patterns</span>
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="global-search-list"
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `gs-${results[active].id}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              if (results[active]) go(results[active].to);
              else if (q.trim()) go(`/residents?q=${encodeURIComponent(q.trim())}`);
            } else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search residents, rooms, patterns…"
          className="input h-11 bg-canvas pl-10"
        />
      </label>
      {open && q.trim() && (
        <ul id="global-search-list" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-pop">
          {results.length === 0 && <li className="px-3 py-3 text-sm text-ink-muted">No matches for “{q}”.</li>}
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`gs-${r.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(r.to);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${i === active ? 'bg-primary-soft' : ''}`}
            >
              {r.resident ? <ResidentAvatar resident={r.resident} size={30} /> : <Waves size={18} className="mx-1.5 text-primary" aria-hidden="true" />}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.label}</span>
                <span className="block text-xs text-ink-muted">{r.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const alerts = useVisibleAlerts();
  const clear = useRippleStore((s) => s.clearNotifications);
  const markRead = useRippleStore((s) => s.markAlertRead);
  const now = useRippleStore((s) => s.now)();
  const unread = alerts.filter((a) => !a.read && a.status !== 'resolved');
  const recent = alerts.filter((a) => a.status !== 'resolved').slice(0, 6);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications, ${unread.length} unread`}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-primary-soft hover:text-primary"
      >
        <Bell size={20} />
        {unread.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(400px,calc(100vw-2rem))] rounded-xl border border-line bg-white shadow-pop" role="region" aria-label="Recent alerts">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">Recent alerts</p>
            <button onClick={clear} className="rounded px-2 py-1 text-sm font-medium text-primary hover:bg-primary-soft disabled:text-ink-faint" disabled={!unread.length}>
              Mark all read
            </button>
          </div>
          <ul className="max-h-[420px] overflow-y-auto">
            {recent.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-muted">You’re all caught up.</li>}
            {recent.map((a) => (
              <li key={a.id} className="border-b border-line last:border-0">
                <Link
                  to={`/alerts?id=${a.id}`}
                  onClick={() => {
                    markRead(a.id);
                    setOpen(false);
                  }}
                  className="flex gap-3 px-4 py-3 hover:bg-canvas"
                >
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${a.read ? 'bg-transparent' : 'bg-primary'}`} aria-label={a.read ? undefined : 'Unread'} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug">{a.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <AlertTypeBadge type={a.type} />
                      {relative(a.createdAt, now)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/alerts" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-medium text-primary hover:bg-primary-soft">
            View all alerts
          </Link>
        </div>
      )}
    </div>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { role, user } = useCurrentUser();
  const setRole = useRippleStore((s) => s.setRole);
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <button onClick={onMenu} className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-primary-soft lg:hidden" aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <div className="hidden min-w-0 xl:block">
          <p className="truncate text-sm font-semibold text-navy">{FACILITY_NAME}</p>
          <p className="text-xs text-ink-muted">Sat, Nov 7 · Day shift</p>
        </div>
        <div className="flex flex-1 justify-center px-2">
          <GlobalSearch />
        </div>
        <div className="hidden sm:block">
          <DemoDataBadge />
        </div>
        <label className="hidden items-center gap-2 md:flex">
          <span className="text-xs font-medium text-ink-muted">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input h-11 w-auto py-0 pr-8 text-sm font-medium" aria-label="Switch role">
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <Notifications />
        <div className="hidden items-center gap-2 lg:flex" title={`${user.name} — ${user.title}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white" aria-hidden="true">
            {user.name
              .split(' ')
              .map((p) => p[0])
              .join('')}
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-ink-muted">{user.title}</span>
          </span>
        </div>
        <span className="sr-only">Signed in as {user.name}, {ROLE_LABEL[role]}</span>
      </div>
      {/* Role switcher for small screens */}
      <div className="flex items-center gap-2 border-t border-line px-4 py-2 md:hidden">
        <DemoDataBadge />
        <label className="ml-auto flex items-center gap-2">
          <span className="text-xs font-medium text-ink-muted">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input h-10 w-auto py-0 pr-8 text-sm" aria-label="Switch role">
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
