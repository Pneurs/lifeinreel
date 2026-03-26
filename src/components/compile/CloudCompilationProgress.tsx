import React from 'react';
import { Cloud, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { CloudCompilationProgress as ProgressType } from '@/hooks/useCloudCompilation';

interface CloudCompilationProgressProps {
  progress: ProgressType;
}

export const CloudCompilationProgress: React.FC<CloudCompilationProgressProps> = ({ progress }) => {
  if (progress.stage === 'idle' || progress.stage === 'completed') return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          {progress.stage === 'failed' ? (
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              {progress.stage === 'processing' ? (
                <Cloud className="w-10 h-10 text-primary animate-pulse" />
              ) : (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {progress.stage === 'failed' ? 'Compilation Failed' : 'Cloud Compilation'}
          </h2>
          <p className="text-sm text-muted-foreground">{progress.message}</p>
        </div>

        {/* Cloud info */}
        {progress.stage !== 'failed' && (
          <div className="space-y-3">
            {/* Animated dots */}
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-xs text-muted-foreground">
              ☁️ Your video is being compiled in the cloud. You can leave this screen — we'll notify you when it's ready.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
