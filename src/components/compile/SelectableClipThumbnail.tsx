import React from 'react';
import { VideoClip } from '@/types/journey';
import { Check, Calendar, CalendarDays, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface SelectableClipThumbnailProps {
  clip: VideoClip;
  selected: boolean;
  onToggle: () => void;
}

export const SelectableClipThumbnail: React.FC<SelectableClipThumbnailProps> = ({
  clip,
  selected,
  onToggle,
}) => {
  const hasBestOfBadges = clip.isBestOfDay || clip.isBestOfWeek || clip.isBestOfMonth;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-full aspect-square rounded-xl overflow-hidden bg-muted transition-all',
        selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-60'
      )}
    >
      {/* Video thumbnail */}
      {clip.uri ? (
        <video
          src={clip.uri}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
      )}

      {/* Selection checkbox */}
      <div
        className={cn(
          'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors',
          selected ? 'bg-primary' : 'bg-background/60 backdrop-blur-sm border border-border'
        )}
      >
        {selected && <Check className="w-4 h-4 text-primary-foreground" />}
      </div>

      {/* Best-of badges */}
      {hasBestOfBadges && (
        <div className="absolute top-2 left-2 flex gap-1">
          {clip.isBestOfDay && (
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <Calendar className="w-3 h-3 text-white" />
            </div>
          )}
          {clip.isBestOfWeek && (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <CalendarDays className="w-3 h-3 text-white" />
            </div>
          )}
          {clip.isBestOfMonth && (
            <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
          )}
        </div>
      )}

      {/* Day number badge - centered, handwritten style */}
      {clip.dayNumber && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-handwritten font-bold text-2xl text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            Day {clip.dayNumber}
          </span>
        </div>
      )}

      {/* Duration & date */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
        <div className="flex justify-between items-end text-[10px] text-white">
          <span>{format(parseISO(clip.capturedAt), 'MMM d')}</span>
          <span className="bg-foreground/70 text-background px-1.5 py-0.5 rounded">
            {clip.duration.toFixed(1)}s
          </span>
        </div>
      </div>
    </button>
  );
};
