import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CloudCompilationProgress {
  stage: 'idle' | 'submitting' | 'processing' | 'completed' | 'failed';
  message: string;
  jobId: string | null;
  shotstackStatus?: string;
}

interface SubmitParams {
  clipUrls: string[];
  clipDayNumbers?: (number | null)[];
  title: string;
  journeyId?: string;
  duration: number;
  clipCount: number;
}

interface UseCloudCompilationReturn {
  progress: CloudCompilationProgress;
  resultUrl: string | null;
  submit: (params: SubmitParams) => Promise<void>;
  reset: () => void;
}

const POLL_INTERVAL = 5000; // 5 seconds
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const INITIAL_PROGRESS: CloudCompilationProgress = {
  stage: 'idle',
  message: '',
  jobId: null,
};

export const useCloudCompilation = (): UseCloudCompilationReturn => {
  const [progress, setProgress] = useState<CloudCompilationProgress>(INITIAL_PROGRESS);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    stopPolling();
    setProgress(INITIAL_PROGRESS);
    setResultUrl(null);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const submit = useCallback(async (params: SubmitParams) => {
    abortRef.current = false;
    setProgress({ stage: 'submitting', message: 'Sending clips to cloud...', jobId: null });
    setResultUrl(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to compile videos');

      // Submit to edge function
      const res = await fetch(`${SUPABASE_URL}/functions/v1/compile-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          clipUrls: params.clipUrls,
          clipDayNumbers: params.clipDayNumbers,
          title: params.title,
          journeyId: params.journeyId,
          duration: params.duration,
          clipCount: params.clipCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start compilation');

      const jobId = data.jobId;
      setProgress({
        stage: 'processing',
        message: 'Compiling your video in the cloud...',
        jobId,
      });

      // Start polling for status
      pollingRef.current = setInterval(async () => {
        if (abortRef.current) {
          stopPolling();
          return;
        }

        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) return;

          const statusRes = await fetch(
            `${SUPABASE_URL}/functions/v1/compile-status?jobId=${jobId}`,
            {
              headers: {
                'Authorization': `Bearer ${currentSession.access_token}`,
              },
            }
          );

          const statusData = await statusRes.json();

          if (statusData.status === 'completed' && statusData.resultUrl) {
            stopPolling();
            setResultUrl(statusData.resultUrl);
            setProgress({
              stage: 'completed',
              message: 'Your video is ready!',
              jobId,
            });
          } else if (statusData.status === 'failed') {
            stopPolling();
            setProgress({
              stage: 'failed',
              message: statusData.errorMessage || 'Compilation failed in the cloud',
              jobId,
            });
          } else {
            // Still processing - update with Shotstack stage
            const stageLabel = statusData.shotstackStatus || 'processing';
            setProgress(prev => ({
              ...prev,
              message: `Cloud compilation: ${stageLabel}...`,
              shotstackStatus: stageLabel,
            }));
          }
        } catch (err) {
          console.error('[useCloudCompilation] Poll error:', err);
        }
      }, POLL_INTERVAL);

    } catch (error) {
      console.error('[useCloudCompilation] Submit error:', error);
      setProgress({
        stage: 'failed',
        message: error instanceof Error ? error.message : 'Failed to start compilation',
        jobId: null,
      });
    }
  }, [stopPolling]);

  return { progress, resultUrl, submit, reset };
};
