import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Film, Plus, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJourneys } from '@/hooks/useJourneys';
import { JourneyPickerSheet } from '@/components/record/JourneyPickerSheet';

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Film, label: 'Reels', path: '/reels' },
  { icon: Plus, label: 'Record', path: '/record', isMain: true },
  { icon: Calendar, label: 'Timeline', path: '/timeline' },
  { icon: User, label: 'You', path: '/profile' },
];

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { journeys } = useJourneys();
  const [showPicker, setShowPicker] = useState(false);

  const handleRecordClick = () => {
    // If no journeys, go to create journey
    if (journeys.length === 0) {
      navigate('/new-journey');
      return;
    }
    // Otherwise show picker
    setShowPicker(true);
  };

  const handleJourneySelect = (journeyId: string) => {
    setShowPicker(false);
    // Navigate to record with journey pre-selected
    navigate(`/record?journey=${journeyId}`);
  };

  const handleCreateNew = () => {
    setShowPicker(false);
    navigate('/new-journey');
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/95 backdrop-blur-lg border-t border-border pb-6 pt-2 px-4">
        <nav className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.isMain) {
              return (
                <button
                  key={item.path}
                  onClick={handleRecordClick}
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

      <JourneyPickerSheet
        open={showPicker}
        journeys={journeys}
        onSelect={handleJourneySelect}
        onCreateNew={handleCreateNew}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
};
