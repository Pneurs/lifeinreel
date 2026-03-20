import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Play, Pause, SkipForward, SkipBack, Download, List, Layers, ChevronUp, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { VideoClip } from '@/types/journey';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { toast } from 'sonner';

type ViewMode = 'sequential' | 'scroll';

interface PlayAllViewerProps {
  clips: VideoClip[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journeyName: string;
  getDayNumber?: (capturedAt: string) => number | undefined;
}

export const PlayAllViewer: React.FC<PlayAllViewerProps> = ({
  clips,
  open,
  onOpenChange,
  journeyName,
  getDayNumber,
}) => {
  const [mode, setMode] = useState<ViewMode>('sequential');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);

  const currentClip = clips[currentIndex];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setIsPlaying(false);
      setIsMuted(false);
      setActiveScrollIndex(0);
    }
  }, [open]);

  // Auto-play current clip in sequential mode
  useEffect(() => {
    if (!open || mode !== 'sequential' || !videoRef.current || !currentClip) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [open, mode, currentIndex, currentClip]);

  // Handle video ended - auto advance
  const handleEnded = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, clips.length]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const goNext = () => {
    if (currentIndex < clips.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  // Scroll mode: IntersectionObserver for autoplay
  useEffect(() => {
    if (mode !== 'scroll' || !open) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute('data-index'));
          const video = scrollVideoRefs.current[index];
          if (!video) return;

          if (entry.isIntersecting) {
            setActiveScrollIndex(index);
            video.muted = true;
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    const items = container.querySelectorAll('[data-index]');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [mode, open, clips.length]);

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const response = await fetch(clip.uri);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dayNum = getDayNumber?.(clip.capturedAt);
        a.download = `${journeyName}_${dayNum ? `Day${dayNum}` : `clip${i + 1}`}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // Small delay between downloads
        if (i < clips.length - 1) await new Promise(r => setTimeout(r, 300));
      }
      toast.success(`Downloaded ${clips.length} clips`);
    } catch {
      toast.error('Download failed');
    }
    setIsDownloading(false);
  };

  const handleDownloadCurrent = async (clip: VideoClip) => {
    try {
      const response = await fetch(clip.uri);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dayNum = getDayNumber?.(clip.capturedAt);
      a.download = `${journeyName}_${dayNum ? `Day${dayNum}` : 'clip'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  if (clips.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full h-[95vh] p-0 bg-background border-none overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Play All Clips</DialogTitle>
        </VisuallyHidden>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-background/80 to-transparent">
          <button
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <button
              onClick={() => setMode(mode === 'sequential' ? 'scroll' : 'sequential')}
              className="h-9 px-3 rounded-full bg-card/80 backdrop-blur-sm flex items-center gap-1.5 border border-border/50"
            >
              {mode === 'sequential' ? (
                <>
                  <Layers className="w-4 h-4 text-foreground" />
                  <span className="text-xs font-medium text-foreground">Scroll</span>
                </>
              ) : (
                <>
                  <List className="w-4 h-4 text-foreground" />
                  <span className="text-xs font-medium text-foreground">Player</span>
                </>
              )}
            </button>

            {/* Download all */}
            <button
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Sequential mode */}
        {mode === 'sequential' && currentClip && (
          <div className="relative w-full h-full flex flex-col">
            {/* Video */}
            <div className="flex-1 relative flex items-center justify-center bg-background" onClick={togglePlay}>
              <video
                ref={videoRef}
                src={currentClip.uri}
                playsInline
                controls={false}
                onEnded={handleEnded}
                className="w-full h-full object-contain"
              />

              {/* Day number badge */}
              {getDayNumber && getDayNumber(currentClip.capturedAt) && (
                <div className="absolute top-16 left-4 z-20">
                  <span className="font-handwritten font-bold text-2xl text-primary bg-background/40 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    Day {getDayNumber(currentClip.capturedAt)}
                  </span>
                </div>
              )}

              {/* Play/Pause overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center">
                    <Play className="w-7 h-7 text-primary-foreground ml-1" />
                  </div>
                </div>
              )}

              {/* Mute button */}
              <button
                onClick={toggleMute}
                className="absolute top-16 right-4 z-20 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-foreground" /> : <Volume2 className="w-5 h-5 text-foreground" />}
              </button>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4 pb-6">
              {/* Progress indicator */}
              <div className="flex gap-1 mb-3">
                {clips.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors cursor-pointer',
                      i === currentIndex ? 'bg-primary' : i < currentIndex ? 'bg-primary/40' : 'bg-muted'
                    )}
                    onClick={() => setCurrentIndex(i)}
                  />
                ))}
              </div>

              {/* Info */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {format(parseISO(currentClip.capturedAt), 'EEEE, MMM d')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentIndex + 1} of {clips.length}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadCurrent(currentClip)}
                  className="w-9 h-9 rounded-full bg-card/80 flex items-center justify-center border border-border/50"
                >
                  <Download className="w-4 h-4 text-foreground" />
                </button>
              </div>

              {/* Playback controls */}
              <div className="flex items-center justify-center gap-8">
                <button onClick={goPrev} disabled={currentIndex === 0} className="disabled:opacity-30">
                  <SkipBack className="w-6 h-6 text-foreground" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-primary flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-primary-foreground" />
                  ) : (
                    <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                  )}
                </button>
                <button onClick={goNext} disabled={currentIndex === clips.length - 1} className="disabled:opacity-30">
                  <SkipForward className="w-6 h-6 text-foreground" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scroll mode */}
        {mode === 'scroll' && (
          <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
          >
            {clips.map((clip, index) => (
              <div
                key={clip.id}
                data-index={index}
                className="relative w-full h-full snap-start snap-always flex-shrink-0"
              >
                <video
                  ref={(el) => { scrollVideoRefs.current[index] = el; }}
                  src={clip.uri}
                  className="w-full h-full object-contain bg-background"
                  loop
                  playsInline
                  muted
                />

                {/* Day badge */}
                {getDayNumber && getDayNumber(clip.capturedAt) && (
                  <div className="absolute top-16 left-4 z-20">
                    <span className="font-handwritten font-bold text-2xl text-primary bg-background/40 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                      Day {getDayNumber(clip.capturedAt)}
                    </span>
                  </div>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-5 pb-8">
                  <p className="text-lg font-bold text-foreground mb-1">
                    {format(parseISO(clip.capturedAt), 'EEEE, MMM d')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {index + 1} of {clips.length} • {clip.duration.toFixed(1)}s
                  </p>
                </div>

                {/* Side actions */}
                <div className="absolute right-3 bottom-24 flex flex-col gap-4">
                  <button
                    onClick={() => handleDownloadCurrent(clip)}
                    className="w-11 h-11 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
                  >
                    <Download className="w-5 h-5 text-foreground" />
                  </button>
                </div>

                {/* Scroll hints */}
                {index > 0 && (
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 opacity-30">
                    <ChevronUp className="w-5 h-5 text-foreground animate-bounce" />
                  </div>
                )}
                {index < clips.length - 1 && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 opacity-30">
                    <ChevronDown className="w-5 h-5 text-foreground animate-bounce" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
