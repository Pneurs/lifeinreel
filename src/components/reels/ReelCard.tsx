import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Trash2, Share2, Download, Volume2, VolumeX } from 'lucide-react';
import { Compilation } from '@/types/journey';
import { format, parseISO } from 'date-fns';

interface ReelCardProps {
  compilation: Compilation;
  isActive: boolean;
  onDelete?: (id: string) => void;
  onShare?: (compilation: Compilation) => void;
}

export const ReelCard: React.FC<ReelCardProps> = ({
  compilation,
  isActive,
  onDelete,
  onShare,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = true; // Always start muted for autoplay compatibility
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
      setIsMuted(true); // Reset mute state when scrolling away
    }
  }, [isActive]);

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
    e.stopPropagation(); // Prevent triggering play/pause
    const video = videoRef.current;
    if (!video) return;

    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = compilation.videoUrl;
    a.download = `${compilation.title}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full bg-background snap-start snap-always flex-shrink-0">
      {/* Video */}
      <video
        ref={videoRef}
        src={compilation.videoUrl}
        className="w-full h-full object-contain bg-background"
        loop
        playsInline
        muted
        onClick={togglePlay}
      />

      {/* Play/Pause overlay */}
      {!isPlaying && isActive && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-background/20"
        >
          <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center">
            <Play className="w-7 h-7 text-primary-foreground ml-1" />
          </div>
        </button>
      )}

      {/* Mute/Unmute button */}
      {isActive && (
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-foreground" />
          ) : (
            <Volume2 className="w-5 h-5 text-foreground" />
          )}
        </button>
      )}

      {/* Info overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent p-5 pb-8">
        <h3 className="text-lg font-bold text-foreground mb-1">{compilation.title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{compilation.clipCount} clips</span>
          <span>•</span>
          <span>{formatDuration(compilation.duration)}</span>
          <span>•</span>
          <span>{format(parseISO(compilation.createdAt), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Side actions */}
      <div className="absolute right-3 bottom-28 flex flex-col gap-4">
        <button
          onClick={() => onShare?.(compilation)}
          className="w-11 h-11 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
        >
          <Share2 className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={handleDownload}
          className="w-11 h-11 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
        >
          <Download className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => onDelete?.(compilation.id)}
          className="w-11 h-11 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
        >
          <Trash2 className="w-5 h-5 text-destructive" />
        </button>
      </div>
    </div>
  );
};