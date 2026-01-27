import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Baby, Dumbbell, Heart, Target, Camera, ChevronRight } from 'lucide-react';
import { Journey, JourneyType } from '@/types/journey';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

const journeyIcons: Record<JourneyType, React.ElementType> = {
  child: Baby,
  weightloss: Dumbbell,
  pregnancy: Heart,
  custom: Target,
};

const journeyColors: Record<JourneyType, string> = {
  child: 'bg-primary/10 text-primary',
  weightloss: 'bg-chart-5/10 text-chart-5',
  pregnancy: 'bg-destructive/10 text-destructive',
  custom: 'bg-secondary/10 text-secondary',
};

interface JourneyCardProps {
  journey: Journey;
}

export const JourneyCard: React.FC<JourneyCardProps> = ({ journey }) => {
  const navigate = useNavigate();
  const Icon = journeyIcons[journey.type];
  const colorClass = journeyColors[journey.type];

  const lastCapture = journey.lastCaptureDate
    ? formatDistanceToNow(parseISO(journey.lastCaptureDate), { addSuffix: true })
    : 'No clips yet';

  const getSubtitle = () => {
    if (journey.type === 'child' && journey.dateOfBirth) {
      return `Born ${format(parseISO(journey.dateOfBirth), 'MMM d, yyyy')}`;
    }
    return journey.description || 'Your journey';
  };

  return (
    <button
      onClick={() => navigate(`/journey/${journey.id}`)}
      className="w-full bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex items-center gap-4 active:scale-[0.98] transition-transform"
    >
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', colorClass)}>
        <Icon className="w-7 h-7" />
      </div>
      
      <div className="flex-1 text-left">
        <h3 className="font-semibold text-foreground text-lg">{journey.name}</h3>
        <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {journey.clipCount} clips
          </span>
          <span className="text-xs text-muted-foreground">
            {lastCapture}
          </span>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
};
