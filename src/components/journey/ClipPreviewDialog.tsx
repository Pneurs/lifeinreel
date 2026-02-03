import React, { useRef, useEffect } from 'react';
import { X, Star, Trash2 } from 'lucide-react';
import { VideoClip } from '@/types/journey';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { IOSButton } from '@/components/ui/ios-button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ClipPreviewDialogProps {
  clip: VideoClip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleHighlight?: (clipId: string) => void;
  onDelete?: (clipId: string) => Promise<boolean>;
  dayNumber?: number;
}

export const ClipPreviewDialog: React.FC<ClipPreviewDialogProps> = ({
  clip,
  open,
  onOpenChange,
  onToggleHighlight,
  onDelete,
  dayNumber,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Auto-play when dialog opens
  useEffect(() => {
    if (open && videoRef.current && clip) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's okay
      });
    }
  }, [open, clip]);

  const handleDelete = async () => {
    if (!clip || !onDelete) return;
    setIsDeleting(true);
    const success = await onDelete(clip.id);
    setIsDeleting(false);
    if (success) {
      onOpenChange(false);
    }
  };

  if (!clip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full h-[85vh] p-0 bg-black border-none overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Video Preview</DialogTitle>
        </VisuallyHidden>
        
        {/* Day number badge - top left corner */}
        {dayNumber && (
          <div className="absolute top-4 left-4 z-20">
            <span className="font-handwritten text-lg text-white bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm">
              Day {dayNumber}
            </span>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-5 h-5 text-accent" />
        </button>

        {/* Video player */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={clip.uri}
            controls
            playsInline
            autoPlay
            className="w-full h-full object-contain"
          />
        </div>

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
          {/* Clip info */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-accent font-medium">
                {format(parseISO(clip.capturedAt), 'EEEE, MMM d, yyyy')}
              </p>
              <p className="text-accent/60 text-sm">
                Week {clip.weekNumber} • {clip.duration.toFixed(1)}s
              </p>
            </div>
            
            {clip.isHighlight && (
              <div className="flex items-center gap-1 bg-primary/20 px-2 py-1 rounded-full">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-xs text-primary font-medium">Highlight</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {onToggleHighlight && (
              <IOSButton
                variant={clip.isHighlight ? "primary" : "soft"}
                size="sm"
                onClick={() => onToggleHighlight(clip.id)}
                className="flex-1"
              >
                <Star className={cn(
                  "w-4 h-4",
                  clip.isHighlight && "fill-current"
                )} />
                {clip.isHighlight ? 'Highlighted' : 'Add to Highlights'}
              </IOSButton>
            )}
            
            {onDelete && (
              <IOSButton
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </IOSButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
