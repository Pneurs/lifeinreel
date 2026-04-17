import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share as CapacitorShare } from '@capacitor/share';
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

const isNativePlatform = () => Capacitor.isNativePlatform();

const isUserDismissal = (err: unknown) => {
  if (!(err instanceof Error)) return false;

  const message = err.message.toLowerCase();
  return err.name === 'AbortError' || message.includes('abort') || message.includes('cancel');
};

const sanitizeFilename = (value: string) => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return normalized || 'reel';
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error ?? new Error('Failed to prepare video file.'));
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read video file.'));
        return;
      }

      const [, base64 = ''] = reader.result.split(',');
      resolve(base64);
    };

    reader.readAsDataURL(blob);
  });

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

const openNativeApp = async (appUrls: string[], fallbackWebUrl: string): Promise<boolean> => {
  if (!isNativePlatform()) {
    openDeepLink(appUrls[0] ?? fallbackWebUrl, fallbackWebUrl);
    return true;
  }

  for (const url of [...appUrls, fallbackWebUrl]) {
    try {
      await AppLauncher.openUrl({ url });
      return true;
    } catch {
      // Try next candidate
    }
  }

  return false;
};

export interface ShareOptions {
  title: string;
  videoUrl: string;
  /** Optional pre-fetched blob */
  videoBlob?: Blob | null;
}

type NativeShareResult = 'opened' | 'cancelled' | 'failed';

const createNativeVideoUri = async (opts: ShareOptions): Promise<string | null> => {
  const blob = opts.videoBlob ?? (await fetchVideoBlob(opts.videoUrl));
  if (!blob) return null;

  const path = `shared-videos/${sanitizeFilename(opts.title)}-${Date.now()}.mp4`;
  const data = await blobToBase64(blob);

  await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path,
    directory: Directory.Cache,
  });

  return uri;
};

const shareWithCapacitor = async (
  opts: ShareOptions,
  dialogTitle: string,
): Promise<NativeShareResult> => {
  try {
    const nativeUri = await createNativeVideoUri(opts);

    if (nativeUri) {
      await CapacitorShare.share({
        title: opts.title,
        text: opts.title,
        url: nativeUri,
        files: [nativeUri],
        dialogTitle,
      });
      return 'opened';
    }

    await CapacitorShare.share({
      title: opts.title,
      text: opts.title,
      url: opts.videoUrl,
      dialogTitle,
    });
    return 'opened';
  } catch (err) {
    return isUserDismissal(err) ? 'cancelled' : 'failed';
  }
};

/**
 * Native share sheet (shows Instagram, Facebook, WhatsApp, etc. on mobile).
 * Returns true if successful.
 */
export const shareNative = async (
  opts: ShareOptions,
  dialogTitle = 'Share video',
): Promise<boolean> => {
  if (isNativePlatform()) {
    const result = await shareWithCapacitor(opts, dialogTitle);
    return result !== 'failed';
  }

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

interface SocialShareTarget {
  label: string;
  appUrls: string[];
  fallbackWebUrl: string;
}

const shareToSocialApp = async (opts: ShareOptions, target: SocialShareTarget) => {
  if (isNativePlatform()) {
    const result = await shareWithCapacitor(opts, `Share to ${target.label}`);

    if (result !== 'failed') return;

    const opened = await openNativeApp(target.appUrls, target.fallbackWebUrl);
    if (!opened) {
      toast.error(`Couldn't open ${target.label}.`);
    }
    return;
  }

  const blob = opts.videoBlob ?? (await fetchVideoBlob(opts.videoUrl));
  downloadBlobOrUrl(blob, opts.videoUrl, `${opts.title}.mp4`);
  toast.info(`Video saved. Opening ${target.label}…`);
  await openNativeApp(target.appUrls, target.fallbackWebUrl);
};

/**
 * Share to Instagram: download video + open the Instagram app so user can post it.
 */
export const shareToInstagram = async (opts: ShareOptions) => {
  await shareToSocialApp(opts, {
    label: 'Instagram',
    appUrls: ['instagram://library', 'instagram://app'],
    fallbackWebUrl: 'https://www.instagram.com/',
  });
};

/**
 * Share to Facebook: download video + open the Facebook app.
 */
export const shareToFacebook = async (opts: ShareOptions) => {
  await shareToSocialApp(opts, {
    label: 'Facebook',
    appUrls: ['fb://facewebmodal/f?href=https://www.facebook.com/', 'fb://feed'],
    fallbackWebUrl: 'https://www.facebook.com/',
  });
};

/**
 * Share to TikTok: download + open the TikTok app.
 */
export const shareToTikTok = async (opts: ShareOptions) => {
  await shareToSocialApp(opts, {
    label: 'TikTok',
    appUrls: ['snssdk1233://', 'tiktok://'],
    fallbackWebUrl: 'https://www.tiktok.com/upload',
  });
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
