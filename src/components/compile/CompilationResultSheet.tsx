import React, { useState } from 'react';
import { Download, Share2, BookmarkPlus, X, Instagram, Music2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { IOSButton } from '@/components/ui/ios-button';
import { toast } from 'sonner';

interface CompilationResultSheetProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string | null;
  videoBlob: Blob | null;
  onSaveToApp: () => Promise<void>;
  isSaving: boolean;
  isSaved: boolean;
}

export const CompilationResultSheet: React.FC<CompilationResultSheetProps> = ({
  open,
  onClose,
  videoUrl,
  videoBlob,
  onSaveToApp,
  isSaving,
  isSaved,
}) => {
  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `compilation-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Video downloaded!');
  };

  const handleShare = async (platform?: string) => {
    if (!videoBlob || !videoUrl) return;

    // Try native share API first
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([videoBlob], 'compilation.mp4', { type: 'video/mp4' });
        const shareData = { files: [file], title: 'My Compilation' };
        
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success('Shared successfully!');
          return;
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: copy URL or download
    if (platform === 'instagram') {
      // Instagram doesn't have a direct share URL, download first
      handleDownload();
      toast.info('Video downloaded. Open Instagram to share it.');
    } else if (platform === 'tiktok') {
      handleDownload();
      toast.info('Video downloaded. Open TikTok to upload it.');
    } else {
      handleDownload();
      toast.info('Video downloaded. Share it from your device.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-foreground">Your Video is Ready!</SheetTitle>
        </SheetHeader>

        {/* Preview */}
        {videoUrl && (
          <div className="rounded-2xl overflow-hidden bg-muted mb-6 aspect-video">
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              controls
              playsInline
            />
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Save to App */}
          <IOSButton
            variant="primary"
            fullWidth
            onClick={onSaveToApp}
            disabled={isSaving || isSaved}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <BookmarkPlus className="w-5 h-5" />
            )}
            {isSaved ? 'Saved to Reels' : 'Save to Reels'}
          </IOSButton>

          {/* Download */}
          <IOSButton variant="outline" fullWidth onClick={handleDownload}>
            <Download className="w-5 h-5" />
            Download to Phone
          </IOSButton>

          {/* Share to Social */}
          <div className="flex gap-3">
            <IOSButton
              variant="soft"
              fullWidth
              onClick={() => handleShare('instagram')}
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </IOSButton>
            <IOSButton
              variant="soft"
              fullWidth
              onClick={() => handleShare('tiktok')}
            >
              <Music2 className="w-5 h-5" />
              TikTok
            </IOSButton>
          </div>

          {/* General Share */}
          <IOSButton
            variant="ghost"
            fullWidth
            onClick={() => handleShare()}
          >
            <Share2 className="w-5 h-5" />
            More Sharing Options
          </IOSButton>
        </div>
      </SheetContent>
    </Sheet>
  );
};
