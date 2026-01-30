import React from 'react';
import { Film, Play } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/navigation/BottomNav';
import { useJourneys } from '@/hooks/useJourneys';
import { format } from 'date-fns';

const Reels: React.FC = () => {
  const { journeys } = useJourneys();

  // Mock generated videos data
  const generatedVideos = [
    { id: '1', title: 'January Highlights', month: 'January 2024', duration: '0:30', journeyName: 'Baby Emma' },
    { id: '2', title: 'Best Moment', month: 'January 2024', duration: '0:04', journeyName: 'Baby Emma' },
    { id: '3', title: 'December Highlights', month: 'December 2023', duration: '0:30', journeyName: 'Baby Emma' },
    { id: '4', title: 'Weekly Recap', month: 'Week 52, 2023', duration: '0:15', journeyName: 'Fitness Journey' },
  ];

  return (
    <>
      <MobileLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Reels</h1>
          <p className="text-muted-foreground">Your generated videos</p>
        </div>

        {/* Videos Grid */}
        {generatedVideos.length > 0 ? (
          <div className="space-y-4">
            {generatedVideos.map((video) => (
              <button
                key={video.id}
                className="w-full bg-card rounded-2xl overflow-hidden border border-border/50"
              >
                {/* Video Thumbnail */}
                <div className="aspect-video bg-muted relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary-foreground ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                    {video.duration}
                  </div>
                </div>
                
                {/* Video Info */}
                <div className="p-4 text-left">
                  <p className="font-semibold text-foreground">{video.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{video.journeyName}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{video.month}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Film className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No videos yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your generated highlight reels and monthly videos will appear here
            </p>
          </div>
        )}
      </MobileLayout>
      <BottomNav />
    </>
  );
};

export default Reels;
