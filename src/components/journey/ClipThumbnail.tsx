import React from 'react';
import { VideoClip } from '@/types/journey';
import { Star, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface ClipThumbnailProps {
  clip: VideoClip;
  onSelect?: () => void;
  selectable?: boolean;
  showDate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ClipThumbnail: React.FC<ClipThumbnailProps> = ({
  clip,
  onSelect,
  selectable = false,
  showDate = false,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-full aspect-square',
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative rounded-xl overflow-hidden bg-muted',
        sizeClasses[size],
        selectable && 'ring-2 ring-offset-2 ring-offset-background',
        clip.isHighlight ? 'ring-primary' : 'ring-transparent'
      )}
    >
      {/* Placeholder gradient for demo */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
      
      {/* Play indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
          <Play className="w-4 h-4 text-foreground ml-0.5" />
        </div>
      </div>

      {/* Highlight star */}
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
