import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Check, RotateCcw, AlertCircle, SwitchCamera, Volume2, VolumeX } from 'lucide-react';
import { IOSButton } from '@/components/ui/ios-button';
import { cn } from '@/lib/utils';
import { useVideoRecording } from '@/hooks/useVideoRecording';
import { useCameraZoom } from '@/hooks/useCameraZoom';
import { useJourneys } from '@/hooks/useJourneys';
import { JourneySelector } from '@/components/record/JourneySelector';
import { toast } from 'sonner';

const Record: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialJourneyId = searchParams.get('journey');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(initialJourneyId);
  const [showJourneyPicker, setShowJourneyPicker] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    setVideoElement(el);
  }, []);

  const { journeys } = useJourneys();

  const {
    isRecording,
    recordingTime,
    hasRecorded,
    previewUrl,
    isSaving,
    error,
    cameraReady,
    stream,
    minDuration,
    maxDuration,
    initCamera,
    stopCamera,
    startRecording,
    stopRecording,
    retake,
    saveRecording,
    flipCamera,
  } = useVideoRecording({ journeyId: selectedJourneyId, maxDuration: 2, minDuration: 1 });

  // Initialize camera on mount
  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, []);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream && !hasRecorded) {
      // iOS WebViews can route the stream audio back to output (feedback/"loop").
      // Attaching a video-only stream prevents any live audio playback while still recording audio.
      const videoOnlyStream = new MediaStream(stream.getVideoTracks());
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.srcObject = videoOnlyStream;
    }
  }, [stream, hasRecorded]);

  // Handle touch/mouse events for recording
  const handleStartRecording = () => {
    if (cameraReady && !hasRecorded) {
      startRecording();
    }
  };

  const handleStopRecording = () => {
    if (recordingTime >= minDuration) {
      stopRecording();
    }
  };

  const handleSave = async () => {
    console.log('[Record] handleSave called', { selectedJourneyId, hasRecorded, hasPreviewUrl: !!previewUrl, isSaving });

    if (isSaving) return;
    
    // If no journey selected, show picker
    if (!selectedJourneyId) {
      setShowJourneyPicker(true);
      return;
    }

    if (!hasRecorded) {
      toast.error('No recording to save. Please record first.');
      return;
    }

    // iOS WebViews can take a moment to finalize the recording blob after stop.
    if (!previewUrl) {
      toast.message('Processing clip…');
      return;
    }

    const journeyId = selectedJourneyId;
    console.log('[Record] Calling saveRecording with journeyId:', journeyId);
    
    // Pass journeyId directly to avoid stale closure
    const result = await saveRecording(journeyId);
    console.log('[Record] saveRecording result:', result);
    
    if (result.success) {
      toast.success('Clip saved!');
      navigate(`/journey/${journeyId}`);
    } else {
      toast.error(result.error || 'Failed to save');
    }
  };

  const handleJourneySelect = async (journeyId: string) => {
    console.log('[Record] handleJourneySelect called', { journeyId, hasRecorded, hasPreviewUrl: !!previewUrl, isSaving });
    setSelectedJourneyId(journeyId);
    setShowJourneyPicker(false);

    if (isSaving) return;
    
    if (!hasRecorded) {
      toast.error('No recording to save. Please record first.');
      return;
    }

    if (!previewUrl) {
      toast.message('Processing clip…');
      return;
    }
    
    console.log('[Record] Calling saveRecording with journeyId:', journeyId);
    
    // Pass journeyId directly to saveRecording to avoid stale state
    const result = await saveRecording(journeyId);
    console.log('[Record] saveRecording result:', result);
    
    if (result.success) {
      toast.success('Clip saved!');
      navigate(`/journey/${journeyId}`);
    } else {
      toast.error(result.error || 'Failed to save');
    }
  };

  const handleClose = () => {
    stopCamera();
    navigate(-1);
  };

  const selectedJourney = journeys.find(j => j.id === selectedJourneyId);

  // Enable pinch-to-zoom on the camera feed
  useCameraZoom({
    stream,
    videoElement,
    enabled: !hasRecorded && cameraReady,
  });

  // Prevent pinch-to-zoom on the record page (except on the video element which handles its own)
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        // Allow pinch on the video element for camera zoom
        const target = e.target as HTMLElement;
        if (target.tagName === 'VIDEO') return;
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventZoom, { passive: false });
    return () => document.removeEventListener('touchmove', preventZoom);
  }, []);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-foreground relative overflow-hidden" style={{ touchAction: 'pan-y' }}>
      {/* Camera preview or recorded video */}
      <div className="absolute inset-0 bg-black">
        {!hasRecorded ? (
          <video
            ref={videoCallbackRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ touchAction: 'none' }}
          />
        ) : previewUrl ? (
          <div className="w-full h-full flex flex-col">
            {/* Preview label with mute toggle */}
            <div className="bg-primary/90 py-2 px-4 flex items-center justify-between">
              <span className="text-primary-foreground font-semibold text-sm">
                📹 Preview your clip
              </span>
              <button
                onClick={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  if (previewVideoRef.current) {
                    previewVideoRef.current.muted = next;
                    // If unmuting, ensure playback is started via this user gesture
                    // so audio binds to the media volume channel
                    if (!next && previewVideoRef.current.paused) {
                      previewVideoRef.current.play().catch(() => {});
                    }
                  }
                }}
                className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Volume2 className="w-4 h-4 text-primary-foreground" />
                )}
              </button>
            </div>
            <video
              ref={previewVideoRef}
              src={previewUrl}
              autoPlay
              loop
              playsInline
              controls
              muted
              preload="auto"
              className="flex-1 w-full object-contain bg-black"
            />
          </div>
        ) : null}

        {/* Loading state for camera */}
        {!cameraReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-accent text-sm">Accessing camera...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !hasRecorded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center px-8">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-accent text-sm mb-4">{error}</p>
              <IOSButton variant="primary" onClick={() => initCamera()}>
                Try Again
              </IOSButton>
            </div>
          </div>
        )}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 pt-12 px-6 flex items-center justify-between z-10">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-5 h-5 text-accent" />
        </button>

        {/* Timer */}
        <div className="bg-background/20 backdrop-blur-sm rounded-full px-4 py-2">
          <span className={cn(
            "font-mono text-lg font-bold",
            isRecording ? "text-destructive" : "text-accent"
          )}>
            {recordingTime.toFixed(1)}s
          </span>
        </div>

        {/* Flip camera button */}
        {!hasRecorded && (
          <button
            onClick={() => flipCamera()}
            disabled={!cameraReady || isRecording}
            className="w-10 h-10 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center disabled:opacity-40"
          >
            <SwitchCamera className="w-5 h-5 text-accent" />
          </button>
        )}
        {hasRecorded && <div className="w-10" />}
      </div>

      {/* Journey indicator */}
      {selectedJourney && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-background/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-accent text-sm">
              Saving to: {selectedJourney.name}
            </span>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-accent text-sm font-medium">Recording...</span>
        </div>
      )}

      {/* Progress bar - only show during recording */}
      {isRecording && (
        <div className="absolute bottom-40 left-6 right-6 z-10">
          <div className="h-1 bg-background/20 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-100",
                recordingTime >= minDuration ? "bg-primary" : "bg-destructive"
              )}
              style={{ width: `${Math.min(recordingTime / maxDuration, 1) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-accent/60">
            <span>{minDuration}s min</span>
            <span>{maxDuration}s max</span>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-12 px-6 z-10">
        {!hasRecorded ? (
          <div className="flex justify-center">
            <button
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onMouseLeave={() => isRecording && handleStopRecording()}
              disabled={!cameraReady}
              className={cn(
                "w-20 h-20 rounded-full border-4 transition-all duration-200",
                isRecording
                  ? "border-destructive bg-destructive scale-90"
                  : cameraReady 
                    ? "border-accent bg-accent/20" 
                    : "border-muted bg-muted/20 opacity-50"
              )}
            >
              <div className={cn(
                "w-full h-full rounded-full transition-all",
                isRecording ? "bg-destructive scale-50 rounded-lg" : "bg-accent scale-75"
              )} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-8">
            <IOSButton
              variant="ghost"
              size="iconLg"
              onClick={retake}
              className="bg-background/20 backdrop-blur-sm"
            >
              <RotateCcw className="w-6 h-6 text-accent" />
            </IOSButton>
            <IOSButton
              variant="primary"
              size="iconLg"
              onClick={handleSave}
              disabled={isSaving || !previewUrl}
            >
              {isSaving ? (
                <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-7 h-7" />
              )}
            </IOSButton>
          </div>
        )}

        <p className="text-center text-accent/60 text-sm mt-4">
          {hasRecorded 
            ? selectedJourneyId 
              ? 'Save your moment or retake'
              : 'Tap save to choose a journey'
            : cameraReady 
              ? 'Hold to record' 
              : 'Waiting for camera...'}
        </p>
      </div>

      {/* Journey Picker Modal */}
      {showJourneyPicker && (
        <JourneySelector
          journeys={journeys}
          selectedId={selectedJourneyId}
          onSelect={handleJourneySelect}
          onClose={() => setShowJourneyPicker(false)}
        />
      )}
    </div>
  );
};

export default Record;
