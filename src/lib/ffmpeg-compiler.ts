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

const BATCH_SIZE = 30; // Process clips in batches to manage memory
const CORE_VERSION = '0.12.9';
const CORE_CDN_BASE_URLS = [
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
];

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
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
  
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  try {
    // Prefer bundled core files, fallback to CDN mirrors.
    await loadCore(ffmpeg);
  } catch (err) {
    console.error('FFmpeg load error details:', err);
    throw err instanceof Error ? err : new Error('Video engine failed to load. Please try again.');
  }

  ffmpegInstance = ffmpeg;
  ffmpegLoaded = true;
  return ffmpeg;
}

/**
 * Generate a "Day X" overlay image as PNG using canvas, to be composited by ffmpeg.
 */
function generateDayOverlay(dayNumber: number, width: number, height: number): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, width, height);

  const fontSize = Math.round(width * 0.07);
  ctx.font = `bold ${fontSize}px 'Caveat', cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const text = `Day ${dayNumber}`;
  const metrics = ctx.measureText(text);
  const padX = fontSize * 0.6;
  const padY = fontSize * 0.35;
  const badgeW = metrics.width + padX * 2;
  const badgeH = fontSize + padY * 2;
  const badgeX = (width - badgeW) / 2;
  const badgeY = height * 0.75 - badgeH / 2;
  const radius = badgeH * 0.3;

  // Draw rounded rect background
  ctx.fillStyle = 'hsla(37, 92%, 50%, 0.85)';
  ctx.beginPath();
  ctx.moveTo(badgeX + radius, badgeY);
  ctx.lineTo(badgeX + badgeW - radius, badgeY);
  ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + radius);
  ctx.lineTo(badgeX + badgeW, badgeY + badgeH - radius);
  ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - radius, badgeY + badgeH);
  ctx.lineTo(badgeX + radius, badgeY + badgeH);
  ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - radius);
  ctx.lineTo(badgeX, badgeY + radius);
  ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
  ctx.closePath();
  ctx.fill();

  // Draw text
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, width / 2, height * 0.75);

  // Convert to binary
  const dataUrl = canvas.toDataURL('image/png');
  const binaryStr = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Process a batch of clips: add Day X overlay and concat into one segment.
 */
async function processBatch(
  ffmpeg: FFmpeg,
  clips: ClipMeta[],
  batchIndex: number,
  onProgress: ProgressCallback,
  globalOffset: number,
  totalClips: number
): Promise<string> {
  const batchId = `batch_${batchIndex}`;
  const concatList: string[] = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const clipIndex = globalOffset + i;
    const inputName = `${batchId}_input_${i}.mp4`;
    const outputName = `${batchId}_out_${i}.mp4`;

    onProgress({
      stage: 'processing',
      currentClip: clipIndex + 1,
      totalClips,
      percent: 30 + Math.round(((clipIndex + 1) / totalClips) * 55),
      message: `Processing clip ${clipIndex + 1} of ${totalClips}...`,
    });

    // Download and write clip to virtual FS
    const clipData = await fetchFile(clip.url);
    await ffmpeg.writeFile(inputName, clipData);

    if (clip.dayNumber != null) {
      // Generate overlay PNG
      const overlayPng = generateDayOverlay(clip.dayNumber, 720, 1280);
      const overlayName = `${batchId}_overlay_${i}.png`;
      await ffmpeg.writeFile(overlayName, overlayPng);

      // Re-encode with overlay + normalize resolution/framerate
      await ffmpeg.exec([
        '-i', inputName,
        '-i', overlayName,
        '-filter_complex', '[0:v]fps=30,scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2[scaled];[scaled][1:v]overlay=0:0:shortest=1[outv]',
        '-map', '[outv]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-vsync', 'cfr',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-movflags', '+faststart',
        '-y', outputName,
      ]);

      // Clean up overlay
      await ffmpeg.deleteFile(overlayName);
    } else {
      // Re-encode to normalize resolution/framerate
      await ffmpeg.exec([
        '-i', inputName,
        '-vf', 'fps=30,scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-vsync', 'cfr',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-movflags', '+faststart',
        '-y', outputName,
      ]);
    }

    // Clean up input
    await ffmpeg.deleteFile(inputName);
    concatList.push(`file '${outputName}'`);
  }

  // Concat this batch
  const concatFileName = `${batchId}_list.txt`;
  const batchOutputName = `${batchId}_merged.mp4`;

  await ffmpeg.writeFile(concatFileName, concatList.join('\n'));
  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFileName,
    '-c', 'copy',
    '-y', batchOutputName,
  ]);

  // Clean up individual outputs and concat list
  for (let i = 0; i < clips.length; i++) {
    try {
      await ffmpeg.deleteFile(`${batchId}_out_${i}.mp4`);
    } catch { /* already cleaned */ }
  }
  await ffmpeg.deleteFile(concatFileName);

  return batchOutputName;
}

export async function compileWithFFmpeg(
  clips: ClipMeta[],
  onProgress: ProgressCallback,
  abortSignal?: { aborted: boolean }
): Promise<Blob | null> {
  if (clips.length === 0) return null;

  const totalClips = clips.length;

  onProgress({
    stage: 'loading',
    currentClip: 0,
    totalClips,
    percent: 5,
    message: 'Loading video engine...',
  });

  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await getFFmpeg();
  } catch (err) {
    console.error('FFmpeg load failed:', err);
    throw err instanceof Error ? err : new Error('Video engine failed to load. Please try again.');
  }

  if (abortSignal?.aborted) return null;

  onProgress({
    stage: 'loading',
    currentClip: 0,
    totalClips,
    percent: 15,
    message: 'Video engine ready. Processing clips...',
  });

  // Split into batches
  const batches: ClipMeta[][] = [];
  for (let i = 0; i < clips.length; i += BATCH_SIZE) {
    batches.push(clips.slice(i, i + BATCH_SIZE));
  }

  const batchOutputs: string[] = [];

  let globalOffset = 0;
  for (let b = 0; b < batches.length; b++) {
    if (abortSignal?.aborted) return null;

    const batchOutput = await processBatch(
      ffmpeg,
      batches[b],
      b,
      onProgress,
      globalOffset,
      totalClips
    );
    batchOutputs.push(batchOutput);
    globalOffset += batches[b].length;
  }

  onProgress({
    stage: 'finalizing',
    currentClip: totalClips,
    totalClips,
    percent: 90,
    message: 'Finalizing video...',
  });

  let finalOutputName = 'final_output.mp4';

  if (batchOutputs.length === 1) {
    // Rename single batch output to final
    const data = await ffmpeg.readFile(batchOutputs[0]);
    await ffmpeg.writeFile(finalOutputName, data);
    await ffmpeg.deleteFile(batchOutputs[0]);
  } else {
    // Concat all batch outputs
    const finalConcatList = batchOutputs.map(f => `file '${f}'`).join('\n');
    await ffmpeg.writeFile('final_list.txt', finalConcatList);

    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'final_list.txt',
      '-c', 'copy',
      '-y', finalOutputName,
    ]);

    // Clean up batch outputs
    for (const f of batchOutputs) {
      try { await ffmpeg.deleteFile(f); } catch { /* ok */ }
    }
    await ffmpeg.deleteFile('final_list.txt');
  }

  // Read final output
  const outputData = await ffmpeg.readFile(finalOutputName);
  await ffmpeg.deleteFile(finalOutputName);

  const rawBytes = outputData as Uint8Array;
  const safeBuffer = rawBytes.buffer instanceof ArrayBuffer
    ? rawBytes.buffer
    : new ArrayBuffer(rawBytes.byteLength);
  if (!(rawBytes.buffer instanceof ArrayBuffer)) {
    new Uint8Array(safeBuffer).set(rawBytes);
  }
  const blob = new Blob([new Uint8Array(safeBuffer)], { type: 'video/mp4' });

  onProgress({
    stage: 'done',
    currentClip: totalClips,
    totalClips,
    percent: 100,
    message: 'Compilation complete!',
  });

  return blob;
}

export function isFFmpegSupported(): boolean {
  // Check for SharedArrayBuffer (optional, single-threaded works without it)
  // and basic WebAssembly support
  return typeof WebAssembly !== 'undefined';
}
