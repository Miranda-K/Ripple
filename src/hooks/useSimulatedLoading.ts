import { useEffect, useState } from 'react';

/** Short, deterministic loading state so skeletons are visible in the demo (no network involved). */
export function useSimulatedLoading(ms = 350): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return loading;
}
