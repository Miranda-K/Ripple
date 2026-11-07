import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'blue' | 'review' | 'urgent' | 'ok' | 'navy' | 'outline';

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-primary-soft text-primary border-blue-200',
  review: 'bg-review-soft text-review-ink border-amber-200',
  urgent: 'bg-urgent-soft text-urgent-ink border-red-200',
  ok: 'bg-ok-soft text-ok border-emerald-200',
  navy: 'bg-navy text-white border-navy',
  outline: 'bg-white text-ink-muted border-line',
};

export function Badge({ tone = 'neutral', icon, children, className = '' }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 ${tones[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
