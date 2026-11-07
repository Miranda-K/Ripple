import { NavLink } from 'react-router-dom';
import { Bell, ClipboardCheck, FlaskConical, LayoutDashboard, NotebookPen, Users, Waves, X } from 'lucide-react';
import { Logo, TAGLINE } from './Logo';
import { useRippleStore } from '@/store/useRippleStore';
import { useVisibleAlerts } from '@/store/selectors';
import { DEMO_MODE } from '@/lib/config';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/residents', label: 'Residents', icon: Users },
  { to: '/patterns', label: 'Pattern Explorer', icon: Waves },
  { to: '/assessments', label: 'Assessments', icon: ClipboardCheck },
  { to: '/notes', label: 'Care Notes', icon: NotebookPen },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  ...(DEMO_MODE ? [{ to: '/demo', label: 'Demo Controls', icon: FlaskConical }] : []),
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const alerts = useVisibleAlerts();
  const assessments = useRippleStore((s) => s.assessments);
  const newAlerts = alerts.filter((a) => a.status === 'new').length;
  const pending = assessments.filter((a) => a.status !== 'completed').length;
  const counts: Record<string, number> = { '/alerts': newAlerts, '/assessments': pending };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy/40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-navy-sidebar text-blue-100 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <NavLink to="/" onClick={onClose} aria-label="ripple. home" className="rounded-lg">
            <Logo light />
          </NavLink>
          <button className="rounded-lg p-2 text-blue-200 hover:bg-navy-hover lg:hidden" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'text-blue-100/85 hover:bg-navy-hover hover:text-white'
                }`
              }
            >
              <Icon size={19} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {counts[to] ? (
                <span className="rounded-full bg-white/15 px-2 text-xs font-semibold text-white" aria-label={`${counts[to]} open`}>
                  {counts[to]}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-xl bg-navy/60 p-4 text-xs leading-relaxed text-blue-200/80">
          <p className="font-medium text-blue-100">{TAGLINE}</p>
          <p className="mt-2">Decision support only — not a diagnostic tool. All data shown is synthetic.</p>
        </div>
      </aside>
    </>
  );
}
