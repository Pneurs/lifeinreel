import React from 'react';
import { 
  Bell, 
  Moon, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Crown
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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
  const [dailyReminder, setDailyReminder] = React.useState(true);
  const [weeklyReminder, setWeeklyReminder] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <>
      <MobileLayout>
        {/* Profile header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">M</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Mom</h1>
          <p className="text-sm text-muted-foreground">2 active journeys</p>
        </div>

        {/* Premium banner */}
        <div className="bg-gradient-to-r from-primary to-chart-4 rounded-2xl p-4 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <Crown className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-primary-foreground">Go Premium</p>
            <p className="text-sm text-primary-foreground/80">Unlock unlimited journeys</p>
          </div>
        </div>

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
                    onCheckedChange={setDailyReminder}
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
                    onCheckedChange={setWeeklyReminder}
                  />
                }
              />
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Preferences
            </h2>
            <div className="bg-card rounded-2xl px-4">
              <SettingItem
                icon={Moon}
                label="Dark mode"
                trailing={
                  <Switch 
                    checked={darkMode} 
                    onCheckedChange={setDarkMode}
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
