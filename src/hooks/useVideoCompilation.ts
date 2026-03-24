import { useState, useRef, useCallback } from 'react';
import { compileWithFFmpeg, isFFmpegSupported } from '@/lib/ffmpeg-compiler';
import type { CompilationProgress, ClipMeta } from '@/lib/ffmpeg-compiler';

export type { CompilationProgress, ClipMeta };

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
  const abortRef = useRef({ aborted: false });

  const reset = useCallback(() => {
    abortRef.current.aborted = true;
    setProgress(INITIAL_PROGRESS);
    if (compiledUrl) {
      URL.revokeObjectURL(compiledUrl);
    }
    setCompiledBlob(null);
    setCompiledUrl(null);
  }, [compiledUrl]);

  const compile = useCallback(async (clips: ClipMeta[]): Promise<Blob | null> => {
    if (clips.length === 0) return null;

    abortRef.current = { aborted: false };

    if (!isFFmpegSupported()) {
      setProgress({
        stage: 'error',
        currentClip: 0,
        totalClips: clips.length,
        percent: 0,
        message: 'Your browser does not support video compilation.',
      });
      return null;
    }

    try {
      const blob = await compileWithFFmpeg(clips, setProgress, abortRef.current);

      if (!blob || abortRef.current.aborted) return null;

      const url = URL.createObjectURL(blob);
      setCompiledBlob(blob);
      setCompiledUrl(url);
      return blob;
    } catch (error) {
      console.error('Compilation error:', error);
      setProgress({
        stage: 'error',
        currentClip: 0,
        totalClips: clips.length,
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
