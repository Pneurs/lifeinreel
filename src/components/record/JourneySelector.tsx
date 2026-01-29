import React from 'react';
import { Journey } from '@/types/journey';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface JourneySelectorProps {
  journeys: Journey[];
  selectedId: string | null;
  onSelect: (journeyId: string) => void;
  onClose: () => void;
}

export const JourneySelector: React.FC<JourneySelectorProps> = ({
  journeys,
  selectedId,
  onSelect,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="relative w-full max-w-md bg-card rounded-t-3xl overflow-hidden animate-slide-up">
        <div className="p-6">
          {/* Handle */}
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />
          
          <h2 className="text-xl font-bold text-foreground mb-2">
            Save to Journey
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Select which journey to save this clip to
          </p>
          
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {journeys.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No journeys yet. Create one first!
              </p>
            ) : (
              journeys.map((journey) => (
                <button
                  key={journey.id}
                  onClick={() => onSelect(journey.id)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl transition-colors',
                    selectedId === journey.id
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted border-2 border-transparent'
                  )}
                >
                  {/* Journey icon */}
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-xl',
                    journey.type === 'child' && 'bg-primary/20',
                    journey.type === 'weightloss' && 'bg-destructive/20',
                    journey.type === 'pregnancy' && 'bg-secondary/20',
                    journey.type === 'custom' && 'bg-accent/20'
                  )}>
                    {journey.type === 'child' && '👶'}
                    {journey.type === 'weightloss' && '💪'}
                    {journey.type === 'pregnancy' && '🤰'}
                    {journey.type === 'custom' && '🎯'}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-foreground">{journey.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {journey.clipCount} clips
                    </p>
                  </div>
                  
                  {selectedId === journey.id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
