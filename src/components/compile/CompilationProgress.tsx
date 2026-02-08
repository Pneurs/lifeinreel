import React from 'react';
import { Film, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CompilationProgressProps {
  stage: 'idle' | 'loading' | 'processing' | 'finalizing' | 'done' | 'error';
  currentClip: number;
  totalClips: number;
  percent: number;
  message: string;
}

export const CompilationProgress: React.FC<CompilationProgressProps> = ({
  stage,
  percent,
  message,
}) => {
  if (stage === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          {stage === 'error' ? (
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
          ) : stage === 'done' ? (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              {stage === 'processing' ? (
                <Film className="w-10 h-10 text-primary animate-pulse" />
              ) : (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {stage === 'done' ? 'Video Ready!' : stage === 'error' ? 'Compilation Failed' : 'Creating Your Video'}
          </h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Progress bar */}
        {stage !== 'error' && stage !== 'done' && (
          <div className="space-y-2">
            <Progress value={percent} className="h-2" />
            <p className="text-xs text-muted-foreground">{percent}%</p>
          </div>
        )}
      </div>
    </div>
  );
};
