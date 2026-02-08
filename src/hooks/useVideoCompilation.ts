import { useState, useRef, useCallback } from 'react';

interface CompilationProgress {
  stage: 'idle' | 'loading' | 'processing' | 'finalizing' | 'done' | 'error';
  currentClip: number;
  totalClips: number;
  percent: number;
  message: string;
}

interface UseVideoCompilationReturn {
  progress: CompilationProgress;
  compiledBlob: Blob | null;
  compiledUrl: string | null;
  compile: (videoUrls: string[]) => Promise<Blob | null>;
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
    // Fetch the video as a blob to avoid CORS issues with crossOrigin on <video>
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download video (${response.status})`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  const loadVideo = async (url: string): Promise<{ video: HTMLVideoElement; blobUrl: string }> => {
    // Convert remote URL to a local blob URL to bypass crossOrigin taint
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

  const compile = useCallback(async (videoUrls: string[]): Promise<Blob | null> => {
    if (videoUrls.length === 0) return null;

    abortRef.current = false;
    const totalClips = videoUrls.length;

    setProgress({
      stage: 'loading',
      currentClip: 0,
      totalClips,
      percent: 5,
      message: 'Loading video clips...',
    });

    const blobUrls: string[] = [];
    try {
      // Load all videos first (fetch as blobs to avoid CORS)
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

      // Determine canvas dimensions from first video
      const firstVideo = videos[0];
      const width = firstVideo.videoWidth || 720;
      const height = firstVideo.videoHeight || 1280;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Setup MediaRecorder
      const stream = canvas.captureStream(30);

      // Add audio tracks from videos if available
      // Note: Audio mixing in browser is limited, we'll capture what we can
      const audioCtx = new AudioContext();
      const destination = audioCtx.createMediaStreamDestination();
      destination.stream.getAudioTracks().forEach(track => {
        stream.addTrack(track);
      });

      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
      });

      recorder.start();

      // Play each video onto the canvas sequentially
      for (let i = 0; i < videos.length; i++) {
        if (abortRef.current) {
          recorder.stop();
          return null;
        }

        const video = videos[i];
        video.currentTime = 0;
        video.muted = true;

        setProgress({
          stage: 'processing',
          currentClip: i + 1,
          totalClips,
          percent: 30 + Math.round(((i + 1) / totalClips) * 60),
          message: `Processing clip ${i + 1} of ${totalClips}...`,
        });

        // Connect audio to the recording stream only (NOT to speakers)
        try {
          const source = audioCtx.createMediaElementSource(video);
          source.connect(destination);
          // Do NOT connect to audioCtx.destination – that would play audio out loud
        } catch {
          // Audio source may already be connected or unavailable
        }

        await new Promise<void>((resolve) => {
          const drawFrame = () => {
            if (video.paused || video.ended) {
              resolve();
              return;
            }
            ctx.drawImage(video, 0, 0, width, height);
            requestAnimationFrame(drawFrame);
          };

          video.onended = () => resolve();
          video.play().then(() => {
            drawFrame();
          }).catch(() => {
            // If autoplay fails, just resolve
            resolve();
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

      // Cleanup video elements and blob URLs
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
