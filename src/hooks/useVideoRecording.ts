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

export const useVideoRecording = ({ 
  journeyId, 
  maxDuration = 2, 
  minDuration = 1 
}: UseVideoRecordingProps) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
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
  const initCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Request permission first on native iOS
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setCameraReady(false);
        return null;
      }
      
      // iOS-compatible constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
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

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraReady(false);
    }
  }, [stream]);

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
    setHasRecorded(false);
    setRecordedBlob(null);
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
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setHasRecorded(true);
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

  // Retake
  const retake = useCallback(() => {
    setHasRecorded(false);
    setRecordedBlob(null);
    setRecordingTime(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  // Calculate week number from journey start
  const getWeekNumber = (): number => {
    // For now, return current week of the year
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  };

  // Save recording - accepts optional journeyId override for when state hasn't updated yet
  const saveRecording = useCallback(async (overrideJourneyId?: string): Promise<boolean> => {
    const targetJourneyId = overrideJourneyId || journeyId;
    
    if (!recordedBlob || !targetJourneyId || !user) {
      console.error('Save failed - missing data:', { hasBlob: !!recordedBlob, journeyId: targetJourneyId, hasUser: !!user });
      setError('Missing data for save');
      return false;
    }

    if (recordingTime < minDuration) {
      setError(`Recording must be at least ${minDuration} second(s)`);
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Determine file extension based on blob type
      const isMP4 = recordedBlob.type.includes('mp4');
      const extension = isMP4 ? 'mp4' : 'webm';
      const contentType = isMP4 ? 'video/mp4' : 'video/webm';
      
      const fileName = `${user.id}/${targetJourneyId}/${Date.now()}.${extension}`;
      
      console.log('Uploading video:', fileName);
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, recordedBlob, {
          contentType,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      console.log('Saving clip metadata for journey:', targetJourneyId);
      
      // Save clip metadata
      const { error: dbError } = await supabase
        .from('video_clips')
        .insert({
          journey_id: targetJourneyId,
          user_id: user.id,
          video_url: urlData.publicUrl,
          duration: Math.min(recordingTime, maxDuration),
          week_number: getWeekNumber(),
        });

      if (dbError) {
        console.error('DB error:', dbError);
        throw dbError;
      }

      console.log('Video saved successfully!');
      return true;
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save recording');
      return false;
    } finally {
      setIsSaving(false);
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
  };
};
