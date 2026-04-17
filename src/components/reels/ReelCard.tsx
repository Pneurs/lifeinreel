import React, { useRef, useEffect, useState } from 'react';
import { Play, Trash2, Share2, Download, Volume2, VolumeX, Instagram, Facebook, Music2, MoreHorizontal } from 'lucide-react';
import { Compilation } from '@/types/journey';
import { format, parseISO } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { IOSButton } from '@/components/ui/ios-button';
import {
  shareNative,
  shareToInstagram,
  shareToFacebook,
  shareToTikTok,
  downloadVideo,
} from '@/lib/share';

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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = false;
      video.play().then(() => setIsPlaying(true)).catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
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
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const shareOpts = { title: compilation.title, videoUrl: compilation.videoUrl };

  return (
    <div className="relative w-full h-full bg-background snap-start snap-always flex-shrink-0">
      <video
        ref={videoRef}
        src={compilation.videoUrl}
        className="w-full h-full object-contain bg-background"
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />

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

      {isActive && (
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-foreground" />
          ) : (
            <Volume2 className="w-5 h-5 text-foreground" />
          )}
        </button>
      )}

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

      <div className="absolute right-3 bottom-28 flex flex-col gap-4">
        <button
          onClick={() => setShareOpen(true)}
          className="w-11 h-11 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => downloadVideo(shareOpts)}
          className="w-11 h-11 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
          aria-label="Download"
        >
          <Download className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => onDelete?.(compilation.id)}
          className="w-11 h-11 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50"
          aria-label="Delete"
        >
          <Trash2 className="w-5 h-5 text-destructive" />
        </button>
      </div>

      {/* Share sheet */}
      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-foreground">Share Reel</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3">
            <IOSButton variant="soft" fullWidth onClick={() => { setShareOpen(false); shareToInstagram(shareOpts); }}>
              <Instagram className="w-5 h-5" /> Instagram
            </IOSButton>
            <IOSButton variant="soft" fullWidth onClick={() => { setShareOpen(false); shareToFacebook(shareOpts); }}>
              <Facebook className="w-5 h-5" /> Facebook
            </IOSButton>
            <IOSButton variant="soft" fullWidth onClick={() => { setShareOpen(false); shareToTikTok(shareOpts); }}>
              <Music2 className="w-5 h-5" /> TikTok
            </IOSButton>
            <IOSButton variant="soft" fullWidth onClick={() => { setShareOpen(false); downloadVideo(shareOpts); }}>
              <Download className="w-5 h-5" /> Download
            </IOSButton>
          </div>
          <IOSButton
            variant="ghost"
            fullWidth
            className="mt-3"
            onClick={async () => { setShareOpen(false); await shareNative(shareOpts); }}
          >
            <MoreHorizontal className="w-5 h-5" /> More options
          </IOSButton>
        </SheetContent>
      </Sheet>
    </div>
  );
};
