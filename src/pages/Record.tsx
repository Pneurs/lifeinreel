import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Video, Check, RotateCcw } from 'lucide-react';
import { IOSButton } from '@/components/ui/ios-button';
import { cn } from '@/lib/utils';

const Record: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const journeyId = searchParams.get('journey');
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 2) {
            setIsRecording(false);
            setHasRecorded(true);
            return prev;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    setHasRecorded(false);
  };

  const handleStopRecording = () => {
    if (recordingTime >= 1) {
      setIsRecording(false);
      setHasRecorded(true);
    }
  };

  const handleRetake = () => {
    setHasRecorded(false);
    setRecordingTime(0);
  };

  const handleSave = () => {
    // In a real app, this would save the video
    navigate(journeyId ? `/journey/${journeyId}` : '/home');
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-foreground relative overflow-hidden">
      {/* Camera preview placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 to-foreground flex items-center justify-center">
        <Video className="w-24 h-24 text-muted/20" />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 pt-12 px-6 flex items-center justify-between z-10">
        <button
          onClick={() => navigate(-1)}
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

        <div className="w-10" />
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-accent text-sm font-medium">Recording...</span>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-40 left-6 right-6 z-10">
        <div className="h-1 bg-background/20 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-100",
              recordingTime >= 1 ? "bg-primary" : "bg-destructive"
            )}
            style={{ width: `${Math.min(recordingTime / 2, 1) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-accent/60">
          <span>1s min</span>
          <span>2s max</span>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-12 px-6 z-10">
        {!hasRecorded ? (
          <div className="flex justify-center">
            <button
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              className={cn(
                "w-20 h-20 rounded-full border-4 transition-all duration-200",
                isRecording
                  ? "border-destructive bg-destructive scale-90"
                  : "border-accent bg-accent/20"
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
              onClick={handleRetake}
              className="bg-background/20 backdrop-blur-sm"
            >
              <RotateCcw className="w-6 h-6 text-accent" />
            </IOSButton>
            <IOSButton
              variant="primary"
              size="iconLg"
              onClick={handleSave}
            >
              <Check className="w-7 h-7" />
            </IOSButton>
          </div>
        )}

        <p className="text-center text-accent/60 text-sm mt-4">
          {hasRecorded ? 'Save your moment or retake' : 'Hold to record'}
        </p>
      </div>
    </div>
  );
};

export default Record;
