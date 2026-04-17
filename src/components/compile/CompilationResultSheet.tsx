import React from 'react';
import { Download, Share2, BookmarkPlus, Instagram, Facebook, Music2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { IOSButton } from '@/components/ui/ios-button';
import {
  shareNative,
  shareToInstagram,
  shareToFacebook,
  shareToTikTok,
  downloadVideo,
} from '@/lib/share';

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
  const shareOpts = videoUrl
    ? { title: `compilation-${Date.now()}`, videoUrl, videoBlob }
    : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-foreground">Your Video is Ready!</SheetTitle>
        </SheetHeader>

        {videoUrl && (
          <div className="rounded-2xl overflow-hidden bg-muted mb-6 aspect-[9/16] max-h-[50vh] mx-auto">
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              controls
              playsInline
            />
          </div>
        )}

        <div className="space-y-3">
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

          <IOSButton
            variant="outline"
            fullWidth
            onClick={() => shareOpts && downloadVideo(shareOpts)}
            disabled={!shareOpts}
          >
            <Download className="w-5 h-5" />
            Download to Phone
          </IOSButton>

          <div className="grid grid-cols-3 gap-2">
            <IOSButton
              variant="soft"
              fullWidth
              onClick={() => shareOpts && shareToInstagram(shareOpts)}
              disabled={!shareOpts}
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </IOSButton>
            <IOSButton
              variant="soft"
              fullWidth
              onClick={() => shareOpts && shareToFacebook(shareOpts)}
              disabled={!shareOpts}
            >
              <Facebook className="w-5 h-5" />
              Facebook
            </IOSButton>
            <IOSButton
              variant="soft"
              fullWidth
              onClick={() => shareOpts && shareToTikTok(shareOpts)}
              disabled={!shareOpts}
            >
              <Music2 className="w-5 h-5" />
              TikTok
            </IOSButton>
          </div>

          <IOSButton
            variant="ghost"
            fullWidth
            onClick={() => shareOpts && shareNative(shareOpts)}
            disabled={!shareOpts}
          >
            <Share2 className="w-5 h-5" />
            More Sharing Options
          </IOSButton>
        </div>
      </SheetContent>
    </Sheet>
  );
};
