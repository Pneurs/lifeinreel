import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PremiumStatus {
  isPremium: boolean;
  lifetime: boolean;
  expiresAt: string | null;
  productId: string | null;
  loading: boolean;
}

export function usePremium(): PremiumStatus {
  const { user } = useAuth();
  const [state, setState] = useState<PremiumStatus>({
    isPremium: false,
    lifetime: false,
    expiresAt: null,
    productId: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ isPremium: false, lifetime: false, expiresAt: null, productId: null, loading: false });
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_premium, lifetime_purchase, premium_expires_at, active_product_id')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const expired = data?.premium_expires_at
        ? new Date(data.premium_expires_at).getTime() < Date.now()
        : false;

      setState({
        isPremium: !!data?.is_premium && (!expired || !!data?.lifetime_purchase),
        lifetime: !!data?.lifetime_purchase,
        expiresAt: data?.premium_expires_at ?? null,
        productId: data?.active_product_id ?? null,
        loading: false,
      });
    };

    load();

    // Realtime subscription so paywall closes immediately after webhook fires
    const channel = supabase
      .channel(`profile-premium-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return state;
}
