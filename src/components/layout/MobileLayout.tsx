import React from 'react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  className,
  noPadding = false,
}) => {
  return (
    <div
      className={cn(
        'min-h-screen max-w-md mx-auto bg-background',
        !noPadding && 'px-5 pt-12 pb-24',
        className
      )}
    >
      {children}
    </div>
  );
};

interface SafeAreaProps {
  children: React.ReactNode;
  position: 'top' | 'bottom';
  className?: string;
}

export const SafeArea: React.FC<SafeAreaProps> = ({
  children,
  position,
  className,
}) => {
  return (
    <div
      className={cn(
        'fixed left-0 right-0 max-w-md mx-auto z-50',
        position === 'top' && 'top-0 pt-safe-top',
        position === 'bottom' && 'bottom-0 pb-safe-bottom',
        className
      )}
    >
      {children}
    </div>
  );
};
