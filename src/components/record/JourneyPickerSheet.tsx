import React from 'react';
import { Journey } from '@/types/journey';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface JourneyPickerSheetProps {
  open: boolean;
  journeys: Journey[];
  onSelect: (journeyId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export const JourneyPickerSheet: React.FC<JourneyPickerSheetProps> = ({
  open,
  journeys,
  onSelect,
  onCreateNew,
  onClose,
}) => {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">Record to Journey</SheetTitle>
        </SheetHeader>

        <div className="space-y-2 overflow-y-auto max-h-[50vh] pb-6">
          {journeys.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No journeys yet. Create one to start recording!
              </p>
              <button
                onClick={onCreateNew}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium"
              >
                <Plus className="w-5 h-5" />
                Create Journey
              </button>
            </div>
          ) : (
            journeys.map((journey) => (
              <button
                key={journey.id}
                onClick={() => onSelect(journey.id)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl transition-colors',
                  'bg-muted hover:bg-muted/80 active:scale-[0.98]'
                )}
              >
                {/* Journey icon */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-xl',
                    journey.type === 'child' && 'bg-primary/20',
                    journey.type === 'weightloss' && 'bg-destructive/20',
                    journey.type === 'pregnancy' && 'bg-secondary/20',
                    journey.type === 'custom' && 'bg-accent/20'
                  )}
                >
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
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
