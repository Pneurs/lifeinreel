import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Crown, Check, X, Sparkles, Infinity as InfinityIcon, Music } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { usePremium } from '@/hooks/usePremium';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FEATURES = [
  { icon: InfinityIcon, label: 'Unlimited journeys', desc: 'Track every chapter of your life' },
  { icon: Sparkles, label: 'Unlimited compilations', desc: 'Create as many reels as you want' },
  { icon: Music, label: 'Premium music library', desc: 'Full access to all soundtracks' },
  { icon: Crown, label: 'Priority cloud rendering', desc: 'Faster compilation processing' },
];

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: '$4.99', period: '/month', badge: null },
  { id: 'yearly', label: 'Yearly', price: '$29.99', period: '/year', badge: 'Save 50%' },
  { id: 'lifetime', label: 'Lifetime', price: '$79.99', period: 'one-time', badge: 'Best value' },
];

const Paywall: React.FC = () => {
  const navigate = useNavigate();
  const { isPremium } = usePremium();
  const [selected, setSelected] = React.useState<string>('yearly');

  React.useEffect(() => {
    if (isPremium) {
      toast.success('You already have Premium!');
      navigate('/profile');
    }
  }, [isPremium, navigate]);

  const handlePurchase = () => {
    // Native purchase will be wired via RevenueCat SDK in the Capacitor build.
    // The webhook endpoint is already live and will sync state on completion.
    toast.info('Connect the RevenueCat SDK in the native app to complete purchase.');
  };

  return (
    <MobileLayout noPadding>
      <div className="relative min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
        {/* Close */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur flex items-center justify-center"
          aria-label="Close paywall"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>

        {/* Hero */}
        <div className="pt-20 pb-8 px-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-lg">
            <Crown className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Go Premium</h1>
          <p className="text-muted-foreground">Unlock the full LifeShots experience</p>
        </div>

        {/* Features */}
        <div className="px-6 mb-8 space-y-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-2xl bg-card/60">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
              <Check className="w-5 h-5 text-primary mt-2" />
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="px-6 mb-6 space-y-3">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={cn(
                'w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all',
                selected === plan.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card',
              )}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{plan.label}</p>
                  {plan.badge && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.period}</p>
              </div>
              <p className="text-xl font-bold text-foreground">{plan.price}</p>
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-12">
          <button
            onClick={handlePurchase}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-chart-4 text-primary-foreground font-semibold shadow-lg active:scale-[0.98] transition-transform"
          >
            Continue
          </button>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Cancel anytime. Restore purchases available in settings.
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Paywall;
