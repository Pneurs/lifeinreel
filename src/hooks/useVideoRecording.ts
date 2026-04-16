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
  maxDuration = 4, 
  minDuration = 2 
}: UseVideoRecordingProps) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const rawBlobRef = useRef<Blob | null>(null); // pre-speedup raw, used to re-bake with a filter in a single pass
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
      
      // Always try { exact } first to force the requested camera.
      // If that fails (e.g. device doesn't support exact constraint), fall back to ideal.
      const baseVideoConstraints = {
        width: { ideal: 1920, max: 3840 },
        height: { ideal: 1080, max: 2160 },
        frameRate: { ideal: 30 },
      };

      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
      };

      let mediaStream: MediaStream | null = null;

      // Try exact first
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { ...baseVideoConstraints, facingMode: { exact: facingModeRef.current } },
          audio: audioConstraints,
        });
      } catch (exactErr) {
        console.warn('[initCamera] Exact facingMode failed, trying ideal fallback:', exactErr);
        // Fallback: use ideal (strong hint) instead of bare string
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { ...baseVideoConstraints, facingMode: { ideal: facingModeRef.current } },
          audio: audioConstraints,
        });
      }

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
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
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
        videoBitsPerSecond: 4_000_000, // 4 Mbps — good quality, smaller file = faster upload
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const rawBlob = new Blob(chunksRef.current, { type: mimeType });
        // Speed up the raw recording to ~2s. Filter (if any) is applied later via replaceRecordedBlob,
        // OR — for best perf — callers can re-run speedUpBlob with a filter once chosen.
        speedUpBlob(rawBlob, mimeType);
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
  }, [stream, maxDuration]);

  // Speed up a raw blob by playing at 2x into a canvas and re-recording.
  // Optionally bakes a CSS filter in the SAME pass — no second playthrough needed.
  const speedUpBlob = useCallback(async (rawBlob: Blob, mimeType: string, filterCss?: string | null) => {
    setIsProcessing(true);
    // Remember raw so we can re-bake with a different filter without re-recording
    rawBlobRef.current = rawBlob;
    try {
      const speedFactor = 2.0;
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = URL.createObjectURL(rawBlob);

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video for processing'));
        setTimeout(() => reject(new Error('Video load timeout')), 5000);
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;
      const ctx = canvas.getContext('2d')!;
      // Bake filter into every drawn frame — costs nothing extra vs unfiltered
      ctx.filter = filterCss || 'none';

      const canvasStream = canvas.captureStream(30);

      // Determine output mime
      let outputMime = mimeType;
      if (!MediaRecorder.isTypeSupported(outputMime)) {
        outputMime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
      }

      const recorder = new MediaRecorder(canvasStream, {
        mimeType: outputMime,
        videoBitsPerSecond: 4_000_000,
      });

      const outputChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) outputChunks.push(e.data);
      };

      const recorderDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(outputChunks, { type: outputMime }));
        };
      });

      recorder.start(100);
      video.playbackRate = speedFactor;
      await video.play();

      // Draw frames at ~30fps until video ends
      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };
      requestAnimationFrame(drawFrame);

      video.onended = () => {
        if (recorder.state !== 'inactive') recorder.stop();
      };

      const speedBlob = await recorderDone;
      URL.revokeObjectURL(video.src);

      recordingMimeTypeRef.current = outputMime;
      recordedBlobRef.current = speedBlob;
      setRecordedBlob(speedBlob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(speedBlob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (err) {
      console.warn('[speedUpBlob] Processing failed, using raw blob:', err);
      // Fallback: use raw blob as-is
      recordedBlobRef.current = rawBlob;
      setRecordedBlob(rawBlob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(rawBlob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Re-bake the recorded clip from raw with a CSS filter, in a SINGLE canvas pass.
  // Use this instead of running a separate filter pass on the already-speedup blob.
  const rebakeWithFilter = useCallback(async (filterCss: string | null): Promise<boolean> => {
    const raw = rawBlobRef.current;
    if (!raw) return false;
    await speedUpBlob(raw, recordingMimeTypeRef.current, filterCss);
    return true;
  }, [speedUpBlob]);

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

  // Retake - reset recording state and reuse existing camera stream
  const retake = useCallback(() => {
    console.log('[retake] Starting retake...');
    
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
    setIsProcessing(false);
    setRecordedBlob(null);
    recordedBlobRef.current = null;
    setRecordingTime(0);
    chunksRef.current = [];
    setError(null);

    // Revoke old preview URL
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }

    // Check if existing stream is still alive; if so, reuse it
    const existingStream = streamRef.current;
    if (existingStream && existingStream.active && existingStream.getVideoTracks().some(t => t.readyState === 'live')) {
      console.log('[retake] Reusing existing camera stream');
      // Re-trigger the stream attachment effect by toggling stream state
      setStream(null);
      // Use microtask to ensure React processes the null first, then sets the live stream
      queueMicrotask(() => {
        setStream(existingStream);
        setCameraReady(true);
      });
    } else {
      // Stream is dead (e.g. iOS corruption), re-initialize
      console.log('[retake] Stream dead, re-initializing camera');
      initCamera();
    }
  }, [initCamera]);

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

    let blobToSave = recordedBlobRef.current || (await waitForRecordedBlob());

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

    // Note: We intentionally do NOT run client-side ffmpeg standardization here.
    // Compilation is handled by Shotstack Cloud which normalizes inputs server-side,
    // so paying a 5–15s ffmpeg.wasm re-encode per save is pure overhead.

    // Determine file extension based on blob type
    const effectiveMime = blobToSave.type || recordingMimeTypeRef.current;
    const isMP4 = effectiveMime.includes('mp4');
    const extension = isMP4 ? 'mp4' : 'webm';
    const contentType = isMP4 ? 'video/mp4' : 'video/webm';
    const fileTimestamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `${effectiveUser.id}/${targetJourneyId}/${fileTimestamp}.${extension}`;
    const thumbnailFileName = `${effectiveUser.id}/${targetJourneyId}/${fileTimestamp}_thumb.jpg`;
    let uploadedVideoUrl: string | null = null;
    let uploadedThumbnailUrl: string | null = null;

    // Generate thumbnail from video blob
    const generateThumbnail = async (blob: Blob): Promise<Blob | null> => {
      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.src = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error('Failed to load video for thumbnail'));
          setTimeout(() => reject(new Error('Thumbnail video load timeout')), 5000);
        });

        // Seek to 0.1s (first meaningful frame)
        video.currentTime = 0.1;
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
          setTimeout(() => resolve(), 2000);
        });

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 320);
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(video.src);

        return await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.6);
        });
      } catch (err) {
        console.warn('[generateThumbnail] Failed:', err);
        return null;
      }
    };

    const attemptSave = async (attempt: number): Promise<SaveRecordingResult> => {
      console.log(`[saveRecording] Attempt ${attempt} starting...`);

      try {
        // Upload only once. Retries should only retry DB insert/auth, not storage upload.
        if (!uploadedVideoUrl) {
          const uploadPromise = supabase.storage
            .from('videos')
            .upload(fileName, blobToSave, {
              contentType,
            });

          const thumbnailPromise = generateThumbnail(blobToSave).then(async (thumbBlob) => {
            if (!thumbBlob) return null;
            const { error: thumbError } = await supabase.storage
              .from('videos')
              .upload(thumbnailFileName, thumbBlob, {
                contentType: 'image/jpeg',
              });
            if (thumbError && !/already exists/i.test(thumbError.message)) return null;
            const { data: thumbUrlData } = supabase.storage
              .from('videos')
              .getPublicUrl(thumbnailFileName);
            return thumbUrlData.publicUrl;
          }).catch(() => null);

          const [uploadResult, thumbnailUrl] = await Promise.all([uploadPromise, thumbnailPromise]);

          if (uploadResult.error && !/already exists/i.test(uploadResult.error.message)) {
            console.error(`[saveRecording] Attempt ${attempt} upload error:`, uploadResult.error);
            return { success: false, error: `Upload failed: ${uploadResult.error.message}` };
          }

          const { data: urlData } = supabase.storage
            .from('videos')
            .getPublicUrl(fileName);

          uploadedVideoUrl = urlData.publicUrl;
          uploadedThumbnailUrl = thumbnailUrl;

          if (uploadResult.error) {
            console.warn('[saveRecording] Video already existed, reusing uploaded file');
          } else {
            console.log(`[saveRecording] Attempt ${attempt} upload successful`);
          }
          if (uploadedThumbnailUrl) console.log('[saveRecording] Thumbnail uploaded:', uploadedThumbnailUrl);
        } else {
          console.log('[saveRecording] Reusing already uploaded file for retry');
        }

        if (!uploadedVideoUrl) {
          return { success: false, error: 'Upload failed: could not resolve video URL' };
        }

        // Save clip metadata
        const { error: dbError } = await supabase
          .from('video_clips')
          .insert({
            journey_id: targetJourneyId,
            user_id: effectiveUser.id,
            video_url: uploadedVideoUrl,
            thumbnail_url: uploadedThumbnailUrl,
            duration: Math.max(1, Math.min(Math.min(recordingTime, maxDuration) / 2.0, 2)), // DB check constraint requires 1..2
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

  // Replace the current recorded blob (e.g. after applying a post-record filter)
  const replaceRecordedBlob = useCallback((newBlob: Blob) => {
    recordedBlobRef.current = newBlob;
    setRecordedBlob(newBlob);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const url = URL.createObjectURL(newBlob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, []);

  return {
    // State
    isRecording,
    isProcessing,
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
    replaceRecordedBlob,
  };
};
