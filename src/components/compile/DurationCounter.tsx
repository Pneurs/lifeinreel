import React from 'react';
import { Film } from 'lucide-react';
import { IOSButton } from '@/components/ui/ios-button';

interface DurationCounterProps {
  selectedCount: number;
  totalDuration: number;
  onCompile: () => void;
  isCompiling?: boolean;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
};

export const DurationCounter: React.FC<DurationCounterProps> = ({
  selectedCount,
  totalDuration,
  onCompile,
  isCompiling = false,
}) => {
  return (
    <div className="fixed bottom-20 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 safe-area-bottom">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {selectedCount} clip{selectedCount !== 1 ? 's' : ''} selected
          </p>
          <p className="text-xs text-muted-foreground">
            Total: {formatDuration(totalDuration)}
          </p>
        </div>
        
        <IOSButton
          variant="primary"
          onClick={onCompile}
          disabled={selectedCount === 0 || isCompiling}
        >
          {isCompiling ? (
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Film className="w-4 h-4" />
          )}
          Compile Video
        </IOSButton>
      </div>
    </div>
  );
};
