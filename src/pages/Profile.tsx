import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Crown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import DraftsSection from '@/components/profile/DraftsSection';
import { usePremium } from '@/hooks/usePremium';
import { useFreeTierLimits, FREE_JOURNEY_LIMIT, FREE_COMPILATIONS_PER_MONTH } from '@/hooks/useFreeTierLimits';

interface SettingItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon: Icon,
  label,
  description,
  onClick,
  trailing,
  danger = false,
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 py-4 px-1 border-b border-border/50 last:border-0"
  >
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center",
      danger ? "bg-destructive/10" : "bg-muted"
    )}>
      <Icon className={cn("w-5 h-5", danger ? "text-destructive" : "text-foreground")} />
    </div>
    <div className="flex-1 text-left">
      <p className={cn("font-medium", danger ? "text-destructive" : "text-foreground")}>
        {label}
      </p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {trailing || <ChevronRight className="w-5 h-5 text-muted-foreground" />}
  </button>
);

const Profile: React.FC = () => {
  const [dailyReminder, setDailyReminder] = React.useState(() => {
    return localStorage.getItem('dailyReminder') !== 'false';
  });
  const [weeklyReminder, setWeeklyReminder] = React.useState(() => {
    return localStorage.getItem('weeklyReminder') !== 'false';
  });
  const { user, signOut } = useAuth();
  const { isPremium } = usePremium();
  const { journeyCount, compilationsThisMonth } = useFreeTierLimits();

  const handleDailyToggle = (checked: boolean) => {
    setDailyReminder(checked);
    localStorage.setItem('dailyReminder', String(checked));
  };

  const handleWeeklyToggle = (checked: boolean) => {
    setWeeklyReminder(checked);
    localStorage.setItem('weeklyReminder', String(checked));
  };
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <>
      <MobileLayout>
        <AppHeader title="You" />
        {/* Profile header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Premium banner / usage */}
        <button
          onClick={() => navigate('/paywall')}
          className="w-full bg-gradient-to-r from-primary to-chart-4 rounded-2xl p-4 mb-8 flex items-center gap-4 active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <Crown className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1 text-left">
            {isPremium ? (
              <>
                <p className="font-semibold text-primary-foreground">Premium active</p>
                <p className="text-sm text-primary-foreground/80">Unlimited journeys & compilations</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-primary-foreground">Go Premium</p>
                <p className="text-sm text-primary-foreground/80">
                  {journeyCount}/{FREE_JOURNEY_LIMIT} journey · {compilationsThisMonth}/{FREE_COMPILATIONS_PER_MONTH} reels this month
                </p>
              </>
            )}
          </div>
        </button>

        {/* Draft videos */}
        <DraftsSection />

        {/* Settings sections */}
        <div className="space-y-6">
          {/* Notifications */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Notifications
            </h2>
            <div className="bg-card rounded-2xl px-4">
               <SettingItem
                icon={Bell}
                label="Daily reminder"
                description="Remind me to capture moments"
                trailing={
                  <Switch 
                    checked={dailyReminder} 
                    onCheckedChange={handleDailyToggle}
                  />
                }
              />
              <SettingItem
                icon={Bell}
                label="Weekly digest"
                description="Select weekly highlights"
                trailing={
                  <Switch 
                    checked={weeklyReminder} 
                    onCheckedChange={handleWeeklyToggle}
                  />
                }
              />
            </div>
          </div>

          {/* Support */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Support
            </h2>
            <div className="bg-card rounded-2xl px-4">
              <SettingItem
                icon={Shield}
                label="Privacy policy"
              />
              <SettingItem
                icon={HelpCircle}
                label="Help & support"
              />
            </div>
          </div>

          {/* Account */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Account
            </h2>
            <div className="bg-card rounded-2xl px-4">
              <SettingItem
                icon={LogOut}
                label="Sign out"
                onClick={handleSignOut}
                danger
              />
            </div>
          </div>
        </div>
      </MobileLayout>
      <BottomNav />
    </>
  );
};

export default Profile;
