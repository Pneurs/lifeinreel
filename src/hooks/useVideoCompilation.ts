import { useState, useRef, useCallback } from 'react';

interface CompilationProgress {
  stage: 'idle' | 'loading' | 'processing' | 'finalizing' | 'done' | 'error';
  currentClip: number;
  totalClips: number;
  percent: number;
  message: string;
}

interface ClipMeta {
  url: string;
  dayNumber?: number;
}

interface UseVideoCompilationReturn {
  progress: CompilationProgress;
  compiledBlob: Blob | null;
  compiledUrl: string | null;
  compile: (clips: ClipMeta[]) => Promise<Blob | null>;
  reset: () => void;
}

const INITIAL_PROGRESS: CompilationProgress = {
  stage: 'idle',
  currentClip: 0,
  totalClips: 0,
  percent: 0,
  message: '',
};

export const useVideoCompilation = (): UseVideoCompilationReturn => {
  const [progress, setProgress] = useState<CompilationProgress>(INITIAL_PROGRESS);
  const [compiledBlob, setCompiledBlob] = useState<Blob | null>(null);
  const [compiledUrl, setCompiledUrl] = useState<string | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    setProgress(INITIAL_PROGRESS);
    if (compiledUrl) {
      URL.revokeObjectURL(compiledUrl);
    }
    setCompiledBlob(null);
    setCompiledUrl(null);
  }, [compiledUrl]);

  const fetchAsBlob = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download video (${response.status})`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  const loadVideo = async (url: string): Promise<{ video: HTMLVideoElement; blobUrl: string }> => {
    const blobUrl = await fetchAsBlob(url);

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      video.onloadeddata = () => resolve({ video, blobUrl });
      video.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error(`Failed to load video: ${url}`));
      };

      video.src = blobUrl;
      video.load();
    });
  };

  const waitForSeek = (video: HTMLVideoElement): Promise<void> => {
    return new Promise((resolve) => {
      if (!video.seeking) {
        resolve();
        return;
      }
      video.onseeked = () => resolve();
    });
  };

  const compile = useCallback(async (clips: ClipMeta[]): Promise<Blob | null> => {
    if (clips.length === 0) return null;

    abortRef.current = false;
    const totalClips = clips.length;
    const videoUrls = clips.map(c => c.url);

    setProgress({
      stage: 'loading',
      currentClip: 0,
      totalClips,
      percent: 5,
      message: 'Loading video clips...',
    });

    const blobUrls: string[] = [];
    try {
      // Load all videos first
      const videos: HTMLVideoElement[] = [];
      for (let i = 0; i < videoUrls.length; i++) {
        if (abortRef.current) return null;
        setProgress({
          stage: 'loading',
          currentClip: i + 1,
          totalClips,
          percent: Math.round(((i + 1) / totalClips) * 30),
          message: `Loading clip ${i + 1} of ${totalClips}...`,
        });
        const { video, blobUrl } = await loadVideo(videoUrls[i]);
        videos.push(video);
        blobUrls.push(blobUrl);
      }

      if (abortRef.current) return null;

      // Use the native resolution from the first video
      const firstVideo = videos[0];
      const width = firstVideo.videoWidth || 720;
      const height = firstVideo.videoHeight || 1280;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false })!;
      // Better image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Use 30fps capture
      const stream = canvas.captureStream(30);

      // Audio setup
      const audioCtx = new AudioContext();
      const destination = audioCtx.createMediaStreamDestination();
      destination.stream.getAudioTracks().forEach(track => {
        stream.addTrack(track);
      });

      // Prefer highest quality codec
      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : MediaRecorder.isTypeSupported('video/mp4')
          ? 'video/mp4'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 12_000_000, // 12 Mbps for high quality
      });

      const chunks: Blob[] = [];
      // Collect data frequently for smoother output
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
      });

      // Request data every 100ms for smoother chunks
      recorder.start(100);

      // Play each video onto the canvas sequentially
      for (let i = 0; i < videos.length; i++) {
        if (abortRef.current) {
          recorder.stop();
          return null;
        }

        const video = videos[i];
        video.currentTime = 0;
        await waitForSeek(video);

        setProgress({
          stage: 'processing',
          currentClip: i + 1,
          totalClips,
          percent: 30 + Math.round(((i + 1) / totalClips) * 60),
          message: `Processing clip ${i + 1} of ${totalClips}...`,
        });

        // Connect audio
        try {
          const source = audioCtx.createMediaElementSource(video);
          source.connect(destination);
          video.muted = false;
        } catch {
          video.muted = false;
        }

        const dayNumber = clips[i].dayNumber;

        await new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => {
            if (resolved) return;
            resolved = true;
            resolve();
          };

          let lastTime = -1;
          let stallCount = 0;

          const drawFrame = () => {
            if (resolved) return;

            if (video.ended || video.paused) {
              ctx.drawImage(video, 0, 0, width, height);
              done();
              return;
            }

            // Detect stalls: if currentTime hasn't changed for many frames
            if (video.currentTime === lastTime) {
              stallCount++;
              if (stallCount > 90) { // ~3 seconds at 30fps
                console.warn(`Clip ${i + 1} stalled at ${video.currentTime}s, skipping`);
                video.pause();
                done();
                return;
              }
            } else {
              stallCount = 0;
              lastTime = video.currentTime;
            }

            ctx.drawImage(video, 0, 0, width, height);

            // Draw "Day X" badge overlay
            if (dayNumber != null) {
              const fontSize = Math.round(width * 0.07);
              ctx.save();
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
              ctx.fillStyle = '#FFFFFF';
              ctx.fillText(text, width / 2, height * 0.75);
              ctx.restore();
            }

            requestAnimationFrame(drawFrame);
          };

          // Safety timeout
          const safetyTimeout = setTimeout(() => {
            console.warn(`Clip ${i + 1} timed out, moving to next`);
            video.pause();
            done();
          }, (video.duration || 10) * 1000 + 5000);

          video.onended = () => {
            clearTimeout(safetyTimeout);
            // Draw final frame to avoid black flash
            ctx.drawImage(video, 0, 0, width, height);
            done();
          };

          video.play().then(() => {
            drawFrame();
          }).catch(() => {
            clearTimeout(safetyTimeout);
            done();
          });
        });
      }

      setProgress({
        stage: 'finalizing',
        currentClip: totalClips,
        totalClips,
        percent: 95,
        message: 'Finalizing video...',
      });

      recorder.stop();
      const blob = await recordingDone;
      audioCtx.close();

      // Cleanup
      videos.forEach(v => {
        v.pause();
        v.src = '';
      });
      blobUrls.forEach(u => URL.revokeObjectURL(u));

      const url = URL.createObjectURL(blob);
      setCompiledBlob(blob);
      setCompiledUrl(url);

      setProgress({
        stage: 'done',
        currentClip: totalClips,
        totalClips,
        percent: 100,
        message: 'Compilation complete!',
      });

      return blob;
    } catch (error) {
      console.error('Compilation error:', error);
      blobUrls.forEach(u => URL.revokeObjectURL(u));
      setProgress({
        stage: 'error',
        currentClip: 0,
        totalClips,
        percent: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Compilation failed'}`,
      });
      return null;
    }
  }, []);

  return {
    progress,
    compiledBlob,
    compiledUrl,
    compile,
    reset,
  };
};
