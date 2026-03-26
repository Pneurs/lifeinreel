import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

export interface ClipMeta {
  url: string;
  dayNumber?: number;
}

export type CompilationStage = 'idle' | 'loading' | 'processing' | 'finalizing' | 'done' | 'error';

export interface CompilationProgress {
  stage: CompilationStage;
  currentClip: number;
  totalClips: number;
  percent: number;
  message: string;
}

type ProgressCallback = (progress: CompilationProgress) => void;

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

const CORE_VERSION = '0.12.9';
const CORE_CDN_BASE_URLS = [
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
];

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
};

async function loadCore(ffmpeg: FFmpeg): Promise<void> {
  const attempts: string[] = [];
  try {
    await ffmpeg.load({ coreURL, wasmURL });
    return;
  } catch (err) {
    attempts.push(`local core: ${getErrorMessage(err)}`);
  }
  for (const baseURL of CORE_CDN_BASE_URLS) {
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return;
    } catch (err) {
      attempts.push(`${baseURL}: ${getErrorMessage(err)}`);
    }
  }
  throw new Error(`Video engine failed to load. ${attempts.join(' | ')}`);
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance;
  const ffmpeg = new FFmpeg();
  ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
  try {
    await loadCore(ffmpeg);
  } catch (err) {
    console.error('FFmpeg load error details:', err);
    throw err instanceof Error ? err : new Error('Video engine failed to load. Please try again.');
  }
  ffmpegInstance = ffmpeg;
  ffmpegLoaded = true;
  return ffmpeg;
}

function toSafeBlob(data: Uint8Array, type: string): Blob {
  const buffer = data.buffer instanceof ArrayBuffer
    ? data.buffer
    : new ArrayBuffer(data.byteLength);
  if (!(data.buffer instanceof ArrayBuffer)) {
    new Uint8Array(buffer).set(data);
  }
  return new Blob([new Uint8Array(buffer)], { type });
}

/**
 * Standardize a clip to 720x1280, 30fps, H.264 baseline, yuv420p.
 * Called at upload time so compilation can use instant stream copy concat.
 */
export async function standardizeClip(inputBlob: Blob): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const inputData = new Uint8Array(await inputBlob.arrayBuffer());
  await ffmpeg.writeFile('std_input.mp4', inputData);

  await ffmpeg.exec([
    '-i', 'std_input.mp4',
    '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,fps=30',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-profile:v', 'baseline',
    '-level', '3.0',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-vsync', 'cfr',
    '-movflags', '+faststart',
    '-y', 'std_output.mp4',
  ]);

  await ffmpeg.deleteFile('std_input.mp4');
  const data = await ffmpeg.readFile('std_output.mp4') as Uint8Array;
  await ffmpeg.deleteFile('std_output.mp4');
  return toSafeBlob(data, 'video/mp4');
}

/**
 * Compile clips using stream copy concat (near-instant for standardized clips).
 * Falls back to per-clip re-encoding if stream copy fails.
 */
export async function compileWithFFmpeg(
  clips: ClipMeta[],
  onProgress: ProgressCallback,
  abortSignal?: { aborted: boolean }
): Promise<Blob | null> {
  if (clips.length === 0) return null;
  const totalClips = clips.length;

  onProgress({ stage: 'loading', currentClip: 0, totalClips, percent: 5, message: 'Loading video engine...' });

  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await getFFmpeg();
  } catch (err) {
    console.error('FFmpeg load failed:', err);
    throw err instanceof Error ? err : new Error('Video engine failed to load. Please try again.');
  }

  if (abortSignal?.aborted) return null;

  // ── Step 1: Download all clips ──
  onProgress({ stage: 'processing', currentClip: 0, totalClips, percent: 15, message: 'Downloading clips...' });

  const clipFiles: string[] = [];
  const ASSUMED_CLIP_DURATION = 2; // standardized clips are ~2s each

  for (let i = 0; i < clips.length; i++) {
    if (abortSignal?.aborted) return null;

    onProgress({
      stage: 'processing',
      currentClip: i + 1,
      totalClips,
      percent: 15 + Math.round(((i + 1) / totalClips) * 50),
      message: `Downloading clip ${i + 1} of ${totalClips}...`,
    });

    const fileName = `clip_${i}.mp4`;
    const clipData = await fetchFile(clips[i].url);
    await ffmpeg.writeFile(fileName, clipData);
    clipFiles.push(fileName);
  }

  // ── Step 2: Stream copy concat (instant, no re-encoding) ──
  onProgress({ stage: 'finalizing', currentClip: totalClips, totalClips, percent: 70, message: 'Merging clips...' });

  const concatContent = clipFiles.map(f => `file '${f}'`).join('\n');
  await ffmpeg.writeFile('concat.txt', concatContent);

  let streamCopyWorked = true;
  try {
    await ffmpeg.exec([
      '-f', 'concat', '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      '-movflags', '+faststart',
      '-y', 'merged.mp4',
    ]);
  } catch (err) {
    console.warn('[compile] Stream copy concat failed, falling back to re-encode concat:', err);
    streamCopyWorked = false;
  }

  // Fallback: re-encode concat if stream copy failed (non-standardized clips)
  if (!streamCopyWorked) {
    onProgress({ stage: 'finalizing', currentClip: totalClips, totalClips, percent: 72, message: 'Re-encoding merge (clips not standardized)...' });
    await ffmpeg.exec([
      '-f', 'concat', '-safe', '0',
      '-i', 'concat.txt',
      '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,fps=30',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-vsync', 'cfr',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-movflags', '+faststart',
      '-y', 'merged.mp4',
    ]);
  }

  // Clean up individual clips
  for (const f of clipFiles) {
    try { await ffmpeg.deleteFile(f); } catch { /* ok */ }
  }
  await ffmpeg.deleteFile('concat.txt');

  // ── Step 3: Optional day overlays (single encode pass) ──
  const hasOverlays = clips.some(c => c.dayNumber != null);
  let finalFile = 'merged.mp4';

  if (hasOverlays) {
    onProgress({ stage: 'finalizing', currentClip: totalClips, totalClips, percent: 80, message: 'Adding day labels...' });

    // Build drawtext filter chain with timed enable conditions
    const drawTextParts: string[] = [];
    let t = 0;

    for (let i = 0; i < clips.length; i++) {
      if (clips[i].dayNumber != null) {
        const start = t.toFixed(2);
        const end = (t + ASSUMED_CLIP_DURATION).toFixed(2);
        // Escape commas and colons for FFmpeg filter syntax
        drawTextParts.push(
          `drawtext=text='Day ${clips[i].dayNumber}':fontsize=48:fontcolor=white:x=(w-tw)/2:y=h*3/4:box=1:boxcolor=orange@0.85:boxborderw=15:enable='between(t\\,${start}\\,${end})'`
        );
      }
      t += ASSUMED_CLIP_DURATION;
    }

    if (drawTextParts.length > 0) {
      try {
        await ffmpeg.exec([
          '-i', 'merged.mp4',
          '-vf', drawTextParts.join(','),
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'copy',
          '-movflags', '+faststart',
          '-y', 'final_overlay.mp4',
        ]);
        await ffmpeg.deleteFile('merged.mp4');
        finalFile = 'final_overlay.mp4';
      } catch (err) {
        // drawtext may not be compiled into ffmpeg.wasm — skip overlays
        console.warn('[compile] Day overlay failed (drawtext unavailable), using merged without overlays:', err);
        finalFile = 'merged.mp4';
      }
    }
  }

  onProgress({ stage: 'finalizing', currentClip: totalClips, totalClips, percent: 95, message: 'Preparing final video...' });

  // ── Step 4: Read and return ──
  const outputData = await ffmpeg.readFile(finalFile) as Uint8Array;
  await ffmpeg.deleteFile(finalFile);

  const blob = toSafeBlob(outputData, 'video/mp4');

  onProgress({ stage: 'done', currentClip: totalClips, totalClips, percent: 100, message: 'Compilation complete!' });

  return blob;
}

export function isFFmpegSupported(): boolean {
  return typeof WebAssembly !== 'undefined';
}
