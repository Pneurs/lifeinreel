import { toast } from 'sonner';

/**
 * Try to fetch a remote video URL as a Blob (needed for navigator.share with files).
 * Returns null if CORS blocks it.
 */
export const fetchVideoBlob = async (url: string): Promise<Blob | null> => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
};

const downloadBlobOrUrl = (blob: Blob | null, url: string, filename: string) => {
  const href = blob ? URL.createObjectURL(blob) : url;
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (blob) setTimeout(() => URL.revokeObjectURL(href), 5000);
};

const openDeepLink = (appUrl: string, fallbackWebUrl: string) => {
  // Try opening native app, fall back to web after a short delay
  const start = Date.now();
  const timer = setTimeout(() => {
    if (Date.now() - start < 2000) {
      window.location.href = fallbackWebUrl;
    }
  }, 1200);
  window.location.href = appUrl;
  // If the page becomes hidden (app opened), cancel fallback
  const onHide = () => {
    if (document.hidden) clearTimeout(timer);
  };
  document.addEventListener('visibilitychange', onHide, { once: true });
};

export interface ShareOptions {
  title: string;
  videoUrl: string;
  /** Optional pre-fetched blob */
  videoBlob?: Blob | null;
}

/**
 * Native share sheet (shows Instagram, Facebook, WhatsApp, etc. on mobile).
 * Returns true if successful.
 */
export const shareNative = async (opts: ShareOptions): Promise<boolean> => {
  if (!navigator.share) return false;

  try {
    // Try sharing the file first (best UX on mobile — lets Instagram/FB receive it)
    const blob = opts.videoBlob ?? (await fetchVideoBlob(opts.videoUrl));
    if (blob && navigator.canShare) {
      const file = new File([blob], `${opts.title}.mp4`, { type: 'video/mp4' });
      const shareData = { files: [file], title: opts.title };
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return true;
      }
    }

    // Fallback: share URL only
    await navigator.share({ title: opts.title, url: opts.videoUrl });
    return true;
  } catch (err) {
    if ((err as Error).name === 'AbortError') return true; // user cancelled
    return false;
  }
};

/**
 * Share to Instagram: download video + open the Instagram app so user can post it.
 */
export const shareToInstagram = async (opts: ShareOptions) => {
  const blob = opts.videoBlob ?? (await fetchVideoBlob(opts.videoUrl));
  downloadBlobOrUrl(blob, opts.videoUrl, `${opts.title}.mp4`);
  toast.info('Video saved. Opening Instagram…');
  openDeepLink('instagram://library', 'https://www.instagram.com/');
};

/**
 * Share to Facebook: download video + open the Facebook app.
 */
export const shareToFacebook = async (opts: ShareOptions) => {
  const blob = opts.videoBlob ?? (await fetchVideoBlob(opts.videoUrl));
  downloadBlobOrUrl(blob, opts.videoUrl, `${opts.title}.mp4`);
  toast.info('Video saved. Opening Facebook…');
  openDeepLink('fb://feed', 'https://www.facebook.com/');
};

/**
 * Share to TikTok: download + open the TikTok app.
 */
export const shareToTikTok = async (opts: ShareOptions) => {
  const blob = opts.videoBlob ?? (await fetchVideoBlob(opts.videoUrl));
  downloadBlobOrUrl(blob, opts.videoUrl, `${opts.title}.mp4`);
  toast.info('Video saved. Opening TikTok…');
  openDeepLink('snssdk1233://', 'https://www.tiktok.com/upload');
};

/**
 * WhatsApp: uses wa.me which works for text/URL only on web.
 * For video, falls back to native share or download.
 */
export const shareToWhatsApp = async (opts: ShareOptions) => {
  const ok = await shareNative(opts);
  if (ok) return;
  const text = encodeURIComponent(`${opts.title}\n${opts.videoUrl}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
};

/**
 * Just download the video to phone/computer.
 */
export const downloadVideo = async (opts: ShareOptions) => {
  const blob = opts.videoBlob ?? (await fetchVideoBlob(opts.videoUrl));
  downloadBlobOrUrl(blob, opts.videoUrl, `${opts.title}.mp4`);
  toast.success('Video downloaded!');
};
