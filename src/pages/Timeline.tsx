import React from 'react';
import { Calendar } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/navigation/BottomNav';
import { useJourneys } from '@/hooks/useJourneys';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Timeline: React.FC = () => {
  const { journeys } = useJourneys();
  const navigate = useNavigate();

  // Mock calendar data showing which days have clips
  const daysWithClips = [21, 22, 23, 24, 25, 26];
  const currentDay = 27;

  return (
    <>
      <MobileLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Timeline</h1>
          <p className="text-muted-foreground">January 2024</p>
        </div>

        {/* Calendar view */}
        <div className="bg-card rounded-2xl p-4 mb-6 border border-border/50">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const hasClip = daysWithClips.includes(day);
              const isToday = day === currentDay;
              const isPast = day < currentDay;

              return (
                <button
                  key={day}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-sm transition-colors relative",
                    hasClip && "bg-primary/10 text-primary font-semibold",
                    isToday && "ring-2 ring-primary",
                    !hasClip && isPast && "text-muted-foreground",
                    !hasClip && !isPast && !isToday && "text-foreground"
                  )}
                >
                  {day}
                  {hasClip && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Journey summaries */}
        <div>
          <h2 className="font-semibold text-foreground mb-4">This Week</h2>
          <div className="space-y-3">
            {journeys.map((journey) => (
              <button
                key={journey.id}
                onClick={() => navigate(`/journey/${journey.id}`)}
                className="w-full bg-card rounded-xl p-4 border border-border/50 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{journey.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {Math.min(journey.clipCount, 7)} clips this week
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-lg bg-muted border-2 border-card"
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </MobileLayout>
      <BottomNav />
    </>
  );
};

export default Timeline;
