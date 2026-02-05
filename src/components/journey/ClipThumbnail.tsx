import React, { useState } from 'react';
import { VideoClip } from '@/types/journey';
import { Star, Play, Calendar, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface ClipThumbnailProps {
  clip: VideoClip;
  onSelect?: () => void;
  onPlay?: () => void;
  selectable?: boolean;
  showDate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  dayNumber?: number;
}

export const ClipThumbnail: React.FC<ClipThumbnailProps> = ({
  clip,
  onSelect,
  onPlay,
  selectable = false,
  showDate = false,
  size = 'md',
  dayNumber,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-full aspect-square',
  };

  const handleClick = () => {
    if (onPlay) {
      onPlay();
    } else if (onSelect) {
      onSelect();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const hasBestOfBadges = clip.isBestOfDay || clip.isBestOfWeek || clip.isBestOfMonth;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative rounded-xl overflow-hidden bg-muted',
        sizeClasses[size],
        selectable && 'ring-2 ring-offset-2 ring-offset-background',
        clip.isHighlight ? 'ring-primary' : 'ring-transparent'
      )}
    >
      {/* Video element or poster */}
      {clip.uri ? (
        isPlaying ? (
          <video
            src={clip.uri}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <video
            src={clip.uri}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
          />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
      )}
      
      {/* Day number badge - centered, handwritten style */}
      {dayNumber && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-handwritten font-bold text-2xl text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            Day {dayNumber}
          </span>
        </div>
      )}

      {/* Play indicator (hidden when playing) */}
      {!isPlaying && !dayNumber && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
            <Play className="w-4 h-4 text-foreground ml-0.5" />
          </div>
        </div>
      )}

      {/* Best-of badges - top left corner */}
      {hasBestOfBadges && (
        <div className="absolute top-1.5 left-1.5 flex gap-1">
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

      {/* Highlight star - top right */}
      {clip.isHighlight && (
        <div className="absolute top-1.5 right-1.5">
          <Star className="w-4 h-4 text-primary fill-primary" />
        </div>
      )}

      {/* Duration badge */}
      <div className="absolute bottom-1.5 right-1.5 bg-foreground/70 text-background px-1.5 py-0.5 rounded text-[10px] font-medium">
        {clip.duration.toFixed(1)}s
      </div>

      {/* Date */}
      {showDate && (
        <div className="absolute bottom-1.5 left-1.5 text-[10px] text-background font-medium">
          {format(parseISO(clip.capturedAt), 'MMM d')}
        </div>
      )}
    </button>
  );
};
