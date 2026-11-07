export function RippleMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="#2563EB" />
      <circle cx="16" cy="16" r="3" fill="#fff" />
      <circle cx="16" cy="16" r="7.5" stroke="#fff" strokeWidth="2" opacity=".85" />
      <circle cx="16" cy="16" r="12" stroke="#fff" strokeWidth="2" opacity=".4" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <RippleMark />
      <span className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-navy'}`}>
        ripple<span className="text-primary">.</span>
      </span>
    </span>
  );
}

export const TAGLINE = 'Small changes ripple. We catch them first.';
