import React from 'react';
import { cn } from '@/lib/utils';
import { FILTER_OPTIONS, type FilterOption } from '@/lib/clip-filter';

interface FilterStripProps {
  selectedId: string;
  onSelect: (filter: FilterOption) => void;
  previewSrc?: string | null;
  disabled?: boolean;
}

export const FilterStrip: React.FC<FilterStripProps> = ({
  selectedId,
  onSelect,
  previewSrc,
  disabled,
}) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex gap-3 px-4 py-2">
        {FILTER_OPTIONS.map((filter) => {
          const isSelected = filter.id === selectedId;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => !disabled && onSelect(filter)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-1 flex-shrink-0 transition-opacity',
                disabled && 'opacity-50',
              )}
            >
              <div
                className={cn(
                  'w-14 h-14 rounded-full overflow-hidden border-2 bg-black/40 flex items-center justify-center',
                  isSelected ? 'border-primary' : 'border-background/40',
                )}
              >
                {previewSrc ? (
                  <video
                    src={previewSrc}
                    muted
                    playsInline
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                    style={{ filter: filter.css || 'none' }}
                  />
                ) : (
                  <div
                    className="w-full h-full bg-gradient-to-br from-accent/30 to-primary/30"
                    style={{ filter: filter.css || 'none' }}
                  />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isSelected ? 'text-primary' : 'text-accent/80',
                )}
              >
                {filter.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
