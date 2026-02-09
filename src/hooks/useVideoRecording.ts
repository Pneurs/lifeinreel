import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Camera } from '@capacitor/camera';

interface UseVideoRecordingProps {
  journeyId: string | null;
  maxDuration?: number;
  minDuration?: number;
}

// Check if running in Capacitor native app
const isNativeApp = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined' && 
         (window as any).Capacitor.isNativePlatform?.();
};

// iOS Safari / iOS WebViews can be timing-sensitive for the first authenticated request
// after UI interactions (modals/sheets). We treat iOS as a “needs warmup” environment.
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const useVideoRecording = ({ 
  journeyId, 
  maxDuration = 2, 
  minDuration = 1 
}: UseVideoRecordingProps) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordingMimeTypeRef = useRef<string>('video/webm');
  const isSavingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const facingModeRef = useRef<'environment' | 'user'>('environment');

  // Derive: only "recorded" when we actually have a blob ready.
  const hasRecorded = recordedBlob !== null;

  // Request camera permissions using Capacitor (triggers native iOS popup)
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (!isNativeApp()) {
      // In browser, permissions are handled by getUserMedia
      return true;
    }

    try {
      // This triggers the native iOS permission popup
      const permission = await Camera.requestPermissions({ permissions: ['camera'] });
      
      if (permission.camera === 'granted') {
        return true;
      } else if (permission.camera === 'denied') {
        setError('Camera permission denied. Please enable camera access in Settings > Journey Clips > Camera.');
        return false;
      } else {
        // prompt - will show the native popup
        return true;
      }
    } catch (err) {
      console.error('Permission request error:', err);
      // Fall back to web API
      return true;
    }
  }, []);

  // Initialize camera with iOS-compatible constraints
  const initCamera = useCallback(async (facingMode?: 'environment' | 'user') => {
    try {
      setError(null);

      if (facingMode) {
        facingModeRef.current = facingMode;
      }

      // Always stop any existing stream before acquiring a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setStream(null);
        setCameraReady(false);
      }
      
      // Only request Capacitor permission on first camera init (not when flipping).
      // Calling async permission APIs breaks the user-gesture chain on iOS,
      // which causes getUserMedia to fail for the back camera.
      if (!facingMode) {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          setCameraReady(false);
          return null;
        }
      }
      
      // Use { exact } when flipping to force the specific camera.
      // On initial open, use non-exact so the browser can fall back.
      const facingConstraint = facingMode
        ? { exact: facingModeRef.current }
        : facingModeRef.current;

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingConstraint,
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraReady(true);
      return mediaStream;
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      // More specific error messages for iOS
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please enable camera in Settings > Journey Clips > Camera.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is in use by another app. Please close other apps using the camera.');
      } else {
        setError('Unable to access camera. Please check permissions in Settings.');
      }
      
      setCameraReady(false);
      return null;
    }
  }, [requestCameraPermission]);

  // Stop camera — use ref so this callback never has a stale stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
      setCameraReady(false);
    }
  }, []);

  // Set video element ref for preview
  const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && stream) {
      element.srcObject = stream;
    }
  }, [stream]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!stream) {
      setError('Camera not ready');
      return;
    }

    chunksRef.current = [];
    setRecordingTime(0);
    setRecordedBlob(null);
    recordedBlobRef.current = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      // iOS Safari uses mp4, other browsers use webm
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      }

      recordingMimeTypeRef.current = mimeType;
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 8_000_000, // 8 Mbps for high quality
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        recordedBlobRef.current = blob;
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 0.1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 100);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording');
    }
  }, [stream, maxDuration, previewUrl]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // Retake - fully reset recording state and re-initialize camera fresh
  // Uses refs instead of state to avoid stale closures (the "click twice" bug)
  const retake = useCallback(async () => {
    // Stop any lingering timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop the old MediaRecorder if still active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null;

    // Reset recording state
    setIsRecording(false);
    setRecordedBlob(null);
    recordedBlobRef.current = null;
    setRecordingTime(0);
    chunksRef.current = [];
    setError(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    // initCamera() now handles stopping the old stream via streamRef
    // so we don't need to manually stop it here (avoids stale closure on `stream`)
    await initCamera();
  }, [previewUrl, initCamera]);

  // Calculate week number from journey start
  const getWeekNumber = (): number => {
    // For now, return current week of the year
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  };

  type SaveRecordingResult = { success: boolean; error?: string };

  const toErrorMessage = (err: unknown): string => {
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
      return (err as any).message;
    }
    return 'Failed to save recording';
  };

  // Save recording - accepts optional journeyId override for when state hasn't updated yet
  const saveRecording = useCallback(async (overrideJourneyId?: string): Promise<SaveRecordingResult> => {
    // Synchronous guard (prevents double-tap from starting two saves before React state updates).
    if (isSavingRef.current) {
      console.log('[saveRecording] Already saving, skipping');
      return { success: false, error: 'Save already in progress' };
    }

    const targetJourneyId = overrideJourneyId || journeyId;
    console.log('[saveRecording] Starting save...', { 
      targetJourneyId, 
      hasBlob: !!recordedBlobRef.current,
      isNative: isNativeApp()
    });

    // CRITICAL: iOS (Safari + WebViews) often fails the first authenticated request
    // after modal/sheet interactions unless we refresh + wait a beat.
    const needsAuthWarmup = isNativeApp() || isIOS();
    if (needsAuthWarmup) {
      console.log('[saveRecording] iOS/native detected, warming up auth session...');
      try {
        await supabase.auth.refreshSession();
      } catch {
        // ignore
      }
      // Small delay to let the session settle
      await new Promise((r) => setTimeout(r, 200));
    }

    // Check current session directly from Supabase (more reliable in Capacitor)
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;

    console.log('[saveRecording] Session check:', { 
      hasContextUser: !!user,
      hasSessionUser: !!currentUser, 
      userId: currentUser?.id || user?.id,
    });

    // Use session user if context user is stale
    const effectiveUser = currentUser || user;

    if (!effectiveUser) {
      const msg = 'Please sign in to save clips.';
      console.error('[saveRecording] No user:', msg);
      setError(msg);
      return { success: false, error: msg };
    }

    // On iOS, the first tap can happen while MediaRecorder is still finalizing the blob.
    // Wait briefly for the onstop handler to populate it.
    const waitForRecordedBlob = async (timeoutMs = 2000): Promise<Blob | null> => {
      const start = Date.now();
      while (!recordedBlobRef.current) {
        if (Date.now() - start > timeoutMs) return null;
        await new Promise((r) => setTimeout(r, 50));
      }
      return recordedBlobRef.current;
    };

    const blobToSave = recordedBlobRef.current || (await waitForRecordedBlob());

    if (!blobToSave) {
      const msg = 'No recording found to save.';
      console.error('[saveRecording] No blob found');
      setError(msg);
      return { success: false, error: msg };
    }

    if (!targetJourneyId) {
      const msg = 'Please select a journey to save to.';
      console.error('[saveRecording] No journey ID');
      setError(msg);
      return { success: false, error: msg };
    }

    if (recordingTime < minDuration) {
      const msg = `Recording must be at least ${minDuration} second(s)`;
      setError(msg);
      return { success: false, error: msg };
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setError(null);

    // Determine file extension based on blob type
    const effectiveMime = blobToSave.type || recordingMimeTypeRef.current;
    const isMP4 = effectiveMime.includes('mp4');
    const extension = isMP4 ? 'mp4' : 'webm';
    const contentType = isMP4 ? 'video/mp4' : 'video/webm';
    const fileTimestamp = Date.now();
    const fileName = `${effectiveUser.id}/${targetJourneyId}/${fileTimestamp}.${extension}`;

    const attemptSave = async (attempt: number): Promise<SaveRecordingResult> => {
      console.log(`[saveRecording] Attempt ${attempt} starting...`);

      try {
        // Upload to storage - always use upsert for idempotency
        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, blobToSave, {
            contentType,
            upsert: true, // Always upsert for idempotency
          });

        if (uploadError) {
          console.error(`[saveRecording] Attempt ${attempt} upload error:`, uploadError);
          return { success: false, error: `Upload failed: ${uploadError.message}` };
        }

        console.log(`[saveRecording] Attempt ${attempt} upload successful`);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('videos')
          .getPublicUrl(fileName);

        // Save clip metadata
        const { error: dbError } = await supabase
          .from('video_clips')
          .insert({
            journey_id: targetJourneyId,
            user_id: effectiveUser.id,
            video_url: urlData.publicUrl,
            duration: Math.min(recordingTime, maxDuration),
            week_number: getWeekNumber(),
          });

        if (dbError) {
          console.error(`[saveRecording] Attempt ${attempt} DB error:`, dbError);
          return { success: false, error: `Save failed: ${dbError.message}` };
        }

        console.log('[saveRecording] Video saved successfully!');
        return { success: true };
      } catch (err) {
        console.error(`[saveRecording] Attempt ${attempt} exception:`, err);
        return { success: false, error: toErrorMessage(err) };
      }
    };

     try {
       console.log('[saveRecording] Uploading to storage:', fileName, 'contentType:', contentType);

       // IMPORTANT: This bug presents as “first tap fails, second tap succeeds”.
       // We fix that by retrying automatically within the same tap.
       const maxAttempts = isNativeApp() ? 3 : 2;
       const backoffMs = [0, 0, 350, 650];

       let lastResult: SaveRecordingResult = { success: false, error: 'Failed to save recording' };

       for (let attempt = 1; attempt <= maxAttempts; attempt++) {
         if (attempt > 1) {
           console.log(`[saveRecording] Attempt ${attempt - 1} failed; retrying...`);

           // Refresh session again right before retry on iOS/native.
           if (needsAuthWarmup) {
             try {
               await supabase.auth.refreshSession();
             } catch {
               // ignore
             }
           }

           await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 400));
         }

         lastResult = await attemptSave(attempt);
         if (lastResult.success) {
           return lastResult;
         }
       }

       setError(lastResult.error || 'Failed to save recording');
       return lastResult;
     } catch (err) {
      console.error('[saveRecording] Unexpected error:', err);
      const msg = toErrorMessage(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [recordedBlob, journeyId, user, recordingTime, minDuration, maxDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      stopCamera();
    };
  }, []);

  // Flip between front and back camera
  const flipCamera = useCallback(async () => {
    const newMode = facingModeRef.current === 'environment' ? 'user' : 'environment';
    await initCamera(newMode);
  }, [initCamera]);

  return {
    // State
    isRecording,
    recordingTime,
    hasRecorded,
    previewUrl,
    isSaving,
    error,
    cameraReady,
    stream,
    facingMode: facingModeRef.current,
    
    // Config
    minDuration,
    maxDuration,
    
    // Actions
    initCamera,
    stopCamera,
    startRecording,
    stopRecording,
    retake,
    saveRecording,
    setVideoRef,
    flipCamera,
  };
};
