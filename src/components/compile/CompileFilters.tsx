import React from 'react';
import { Calendar, CalendarDays, Star, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TagFilter } from '@/hooks/useCompileClips';
import { Journey } from '@/types/journey';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { IOSButton } from '@/components/ui/ios-button';

interface CompileFiltersProps {
  journeys: Journey[];
  selectedJourneyId: string;
  onJourneyChange: (id: string) => void;
  tagFilter: TagFilter;
  onTagFilterChange: (filter: TagFilter) => void;
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date?: Date) => void;
  onEndDateChange: (date?: Date) => void;
}

export const CompileFilters: React.FC<CompileFiltersProps> = ({
  journeys,
  selectedJourneyId,
  onJourneyChange,
  tagFilter,
  onTagFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const tagOptions: { key: TagFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Filter className="w-3.5 h-3.5" /> },
    { key: 'day', label: 'Best Day', icon: <Calendar className="w-3.5 h-3.5" /> },
    { key: 'week', label: 'Best Week', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { key: 'month', label: 'Best Month', icon: <Star className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Journey selector */}
      <Select value={selectedJourneyId} onValueChange={onJourneyChange}>
        <SelectTrigger className="w-full bg-card">
          <SelectValue placeholder="Select a journey" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Journeys</SelectItem>
          {journeys.map((journey) => (
            <SelectItem key={journey.id} value={journey.id}>
              {journey.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tag filter tabs */}
      <div className="flex gap-2">
        {tagOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => onTagFilterChange(option.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-colors',
              tagFilter === option.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <IOSButton variant="soft" size="sm" className="flex-1 justify-start">
              <Calendar className="w-4 h-4" />
              {startDate ? format(startDate, 'MMM d, yyyy') : 'Start date'}
            </IOSButton>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <IOSButton variant="soft" size="sm" className="flex-1 justify-start">
              <Calendar className="w-4 h-4" />
              {endDate ? format(endDate, 'MMM d, yyyy') : 'End date'}
            </IOSButton>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Clear dates button */}
      {(startDate || endDate) && (
        <button
          onClick={() => {
            onStartDateChange(undefined);
            onEndDateChange(undefined);
          }}
          className="text-xs text-muted-foreground underline"
        >
          Clear date filters
        </button>
      )}
    </div>
  );
};
