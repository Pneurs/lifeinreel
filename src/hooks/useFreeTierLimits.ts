import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from './usePremium';

export const FREE_JOURNEY_LIMIT = 1;
export const FREE_COMPILATIONS_PER_MONTH = 3;

export interface FreeTierUsage {
  journeyCount: number;
  compilationsThisMonth: number;
  canCreateJourney: boolean;
  canCreateCompilation: boolean;
  isPremium: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Free-tier gating. Premium users always pass.
 * - Free: 1 journey total, 3 compilations per calendar month
 */
export function useFreeTierLimits(): FreeTierUsage {
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const [journeyCount, setJourneyCount] = useState(0);
  const [compilationsThisMonth, setCompilationsThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setJourneyCount(0);
      setCompilationsThisMonth(0);
      setLoading(false);
      return;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ count: jCount }, { count: cCount }] = await Promise.all([
      supabase
        .from('journeys')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('compilations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_draft', false)
        .gte('created_at', startOfMonth.toISOString()),
    ]);

    setJourneyCount(jCount ?? 0);
    setCompilationsThisMonth(cCount ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    journeyCount,
    compilationsThisMonth,
    canCreateJourney: isPremium || journeyCount < FREE_JOURNEY_LIMIT,
    canCreateCompilation: isPremium || compilationsThisMonth < FREE_COMPILATIONS_PER_MONTH,
    isPremium,
    loading: loading || premiumLoading,
    refresh: load,
  };
}
