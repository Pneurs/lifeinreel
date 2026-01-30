import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Film, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Plus, label: 'Record', path: '/record', isMain: true },
  { icon: Film, label: 'Reels', path: '/timeline' },
  { icon: User, label: 'You', path: '/profile' },
];

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/95 backdrop-blur-lg border-t border-border pb-6 pt-2 px-4">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isMain) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative -mt-8 bg-primary text-primary-foreground w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Icon className="w-7 h-7" />
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-4 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
