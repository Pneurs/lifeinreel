import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/navigation/BottomNav';
import { JourneyCard } from '@/components/journey/JourneyCard';
import { IOSButton } from '@/components/ui/ios-button';
import { useJourneys } from '@/hooks/useJourneys';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { journeys } = useJourneys();

  return (
    <>
      <MobileLayout>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Welcome back</p>
            <h1 className="text-2xl font-bold text-foreground">My Journeys</h1>
          </div>
          <button
            onClick={() => navigate('/new-journey')}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-primary" />
          </button>
        </div>

        {/* Daily reminder */}
        <div className="bg-gradient-to-r from-primary/10 to-accent rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Capture today's moment</p>
            <p className="text-sm text-muted-foreground">Don't miss documenting your journey</p>
          </div>
        </div>

        {/* Journeys list */}
        <div className="space-y-4">
          {journeys.length > 0 ? (
            journeys.map((journey) => (
              <JourneyCard key={journey.id} journey={journey} />
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Plus className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No journeys yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Start capturing your first journey today</p>
              <IOSButton onClick={() => navigate('/new-journey')} variant="primary">
                Create Journey
              </IOSButton>
            </div>
          )}
        </div>
      </MobileLayout>
      <BottomNav />
    </>
  );
};

export default Home;
