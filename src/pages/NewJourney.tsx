import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Baby, Dumbbell, Heart, Target } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { IOSButton } from '@/components/ui/ios-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useJourneys } from '@/hooks/useJourneys';
import { JourneyType } from '@/types/journey';
import { cn } from '@/lib/utils';

const journeyTypes = [
  { 
    type: 'child' as JourneyType, 
    icon: Baby, 
    label: 'Child Growth', 
    description: "Document your child's journey",
    color: 'bg-primary/10 text-primary border-primary/20',
    activeColor: 'bg-primary text-primary-foreground border-primary',
  },
  { 
    type: 'weightloss' as JourneyType, 
    icon: Dumbbell, 
    label: 'Fitness', 
    description: 'Track your transformation',
    color: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
    activeColor: 'bg-chart-5 text-secondary-foreground border-chart-5',
  },
  { 
    type: 'pregnancy' as JourneyType, 
    icon: Heart, 
    label: 'Pregnancy', 
    description: 'Capture the miracle',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    activeColor: 'bg-destructive text-destructive-foreground border-destructive',
  },
  { 
    type: 'custom' as JourneyType, 
    icon: Target, 
    label: 'Custom Goal', 
    description: 'Your own journey',
    color: 'bg-secondary/10 text-secondary border-secondary/20',
    activeColor: 'bg-secondary text-secondary-foreground border-secondary',
  },
];

const NewJourney: React.FC = () => {
  const navigate = useNavigate();
  const { addJourney } = useJourneys();
  
  const [selectedType, setSelectedType] = useState<JourneyType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const handleCreate = () => {
    if (!selectedType || !name.trim()) return;

    addJourney({
      name: name.trim(),
      type: selectedType,
      description: description.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
    });

    navigate('/home');
  };

  const isValid = selectedType && name.trim().length > 0;

  return (
    <MobileLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/home')}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">New Journey</h1>
      </div>

      {/* Journey type selection */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">
          What kind of journey?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {journeyTypes.map((jt) => {
            const Icon = jt.icon;
            const isActive = selectedType === jt.type;
            
            return (
              <button
                key={jt.type}
                onClick={() => setSelectedType(jt.type)}
                className={cn(
                  'p-4 rounded-2xl border-2 text-left transition-all',
                  isActive ? jt.activeColor : jt.color
                )}
              >
                <Icon className="w-6 h-6 mb-2" />
                <p className="font-semibold text-sm">{jt.label}</p>
                <p className={cn(
                  "text-xs mt-0.5",
                  isActive ? "opacity-80" : "opacity-60"
                )}>
                  {jt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form fields */}
      {selectedType && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">
              {selectedType === 'child' ? "Child's name" : 'Journey name'}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedType === 'child' ? 'Emma' : 'My fitness journey'}
              className="h-12 rounded-xl"
            />
          </div>

          {selectedType === 'child' && (
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                Date of birth (optional)
              </label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          )}

          {(selectedType === 'custom' || selectedType === 'weightloss') && (
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                Description (optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your goal..."
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          )}

          <IOSButton
            onClick={handleCreate}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!isValid}
          >
            Create Journey
          </IOSButton>
        </div>
      )}
    </MobileLayout>
  );
};

export default NewJourney;
