import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { IOSButton } from '@/components/ui/ios-button';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showCreateReel?: boolean;
  className?: string;
  rightSlot?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showCreateReel = true,
  className,
  rightSlot,
}) => {
  const navigate = useNavigate();

  return (
    <div className={cn('flex items-center justify-between mb-6 gap-3', className)}>
      <div className="min-w-0 flex-1">
        {subtitle && <p className="text-sm text-muted-foreground mb-0.5 truncate">{subtitle}</p>}
        {title && <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
        {showCreateReel && (
          <IOSButton
            variant="primary"
            size="sm"
            onClick={() => navigate('/compile')}
            aria-label="Create Reel"
          >
            <Sparkles className="w-4 h-4" />
            Create Reel
          </IOSButton>
        )}
      </div>
    </div>
  );
};
