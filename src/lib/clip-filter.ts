/**
 * Apply a CSS filter to a recorded video blob by playing it through a canvas
 * and re-recording with the filter baked in.
 *
 * Returns a new Blob with the filter applied. Original blob is returned if
 * filterCss is empty/'none' or processing fails.
 */

export interface FilterOption {
  id: string;
  label: string;
  css: string; // empty string = no filter
}

export const FILTER_OPTIONS: FilterOption[] = [
  { id: 'normal', label: 'Normal', css: '' },
  { id: 'bright', label: 'Bright', css: 'brightness(1.2)' },
  { id: 'warm', label: 'Warm', css: 'brightness(1.05) saturate(1.3) sepia(0.15)' },
  { id: 'cool', label: 'Cool', css: 'brightness(1.05) saturate(0.9) hue-rotate(15deg)' },
  { id: 'vivid', label: 'Vivid', css: 'contrast(1.15) saturate(1.4)' },
  { id: 'fade', label: 'Fade', css: 'contrast(0.9) brightness(1.1) saturate(0.8)' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1) contrast(1.1)' },
];

export async function applyFilterToClip(
  blob: Blob,
  filterCss: string,
): Promise<Blob> {
  // No-op for "Normal"
  if (!filterCss || filterCss.trim() === '' || filterCss === 'none') {
    return blob;
  }

  // Check Canvas filter support (Safari 16.4+, modern Chromium)
  const testCtx = document.createElement('canvas').getContext('2d') as
    | (CanvasRenderingContext2D & { filter?: string })
    | null;
  if (!testCtx || typeof testCtx.filter === 'undefined') {
    console.warn('[applyFilterToClip] Canvas filter unsupported, returning original');
    return blob;
  }

  const inputUrl = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true; // muted required for autoplay
  video.playsInline = true;
  video.preload = 'auto';
  video.src = inputUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load clip for filtering'));
      setTimeout(() => reject(new Error('Filter video load timeout')), 5000);
    });

    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D & { filter: string };

    const canvasStream = canvas.captureStream(30);

    // Determine output mime — try to match input
    const inputMime = blob.type || 'video/webm';
    let outputMime = inputMime;
    if (!MediaRecorder.isTypeSupported(outputMime)) {
      outputMime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    }

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: outputMime,
      videoBitsPerSecond: 4_000_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recorderDone = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: outputMime }));
    });

    recorder.start(100);
    await video.play();

    const drawFrame = () => {
      if (video.ended || video.paused) {
        if (recorder.state !== 'inactive') recorder.stop();
        return;
      }
      ctx.filter = filterCss;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    };
    requestAnimationFrame(drawFrame);

    video.onended = () => {
      if (recorder.state !== 'inactive') recorder.stop();
    };

    const filteredBlob = await recorderDone;
    return filteredBlob;
  } catch (err) {
    console.warn('[applyFilterToClip] Failed, returning original:', err);
    return blob;
  } finally {
    URL.revokeObjectURL(inputUrl);
  }
}
