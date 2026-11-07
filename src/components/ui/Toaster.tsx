import { Link } from 'react-router-dom';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useToasts } from '@/store/toast';

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.tone === 'warning' ? TriangleAlert : t.tone === 'info' ? Info : CheckCircle2;
        const color = t.tone === 'warning' ? 'text-review' : t.tone === 'info' ? 'text-primary' : 'text-ok';
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-white p-4 shadow-pop">
            <Icon size={20} className={`mt-0.5 shrink-0 ${color}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.body && <p className="mt-0.5 text-sm text-ink-muted">{t.body}</p>}
              {t.link && (
                <Link to={t.link.to} onClick={() => dismiss(t.id)} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                  {t.link.label} →
                </Link>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} className="-m-1 rounded-md p-1.5 text-ink-faint hover:text-ink" aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
