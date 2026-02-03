import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Star, Play } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ClipThumbnail } from '@/components/journey/ClipThumbnail';
import { ClipActions } from '@/components/journey/ClipActions';
import { ClipPreviewDialog } from '@/components/journey/ClipPreviewDialog';
import { IOSButton } from '@/components/ui/ios-button';
import { useJourneys, useJourneyClips } from '@/hooks/useJourneys';
import { cn, calculateDayNumber } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { VideoClip } from '@/types/journey';

type TabType = 'timeline' | 'weekly' | 'monthly';

const JourneyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { journeys } = useJourneys();
  const { clips, loading: clipsLoading, toggleHighlight, deleteClip, refetch } = useJourneyClips(id || '');
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [previewClip, setPreviewClip] = useState<VideoClip | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleDeleteClip = async (clipId: string) => {
    const success = await deleteClip(clipId);
    if (success) {
      toast.success('Clip deleted');
    } else {
      toast.error('Failed to delete clip');
    }
    return success;
  };

  const handleClipPlay = (clip: VideoClip) => {
    setPreviewClip(clip);
    setPreviewOpen(true);
  };

  const handleToggleHighlight = (clipId: string) => {
    toggleHighlight(clipId);
    // Update the preview clip state if it's the same clip
    if (previewClip && previewClip.id === clipId) {
      setPreviewClip(prev => prev ? { ...prev, isHighlight: !prev.isHighlight } : null);
    }
  };

  const journey = journeys.find((j) => j.id === id);

  // Calculate day number for a clip based on journey creation date
  const getDayNumber = (capturedAt: string) => {
    if (!journey) return undefined;
    return calculateDayNumber(capturedAt, journey.createdAt);
  };

  if (!journey) {
    return (
      <MobileLayout>
        <p>Journey not found</p>
      </MobileLayout>
    );
  }

  // Group clips by date for timeline view
  const clipsByDate = clips.reduce((acc, clip) => {
    const date = format(parseISO(clip.capturedAt), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(clip);
    return acc;
  }, {} as Record<string, typeof clips>);

  // Get weekly clips (week 4 for demo)
  const weeklyClips = clips.filter((c) => c.weekNumber === 4);
  const highlightedClips = clips.filter((c) => c.isHighlight);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'weekly', label: 'This Week' },
    { key: 'monthly', label: 'Highlights' },
  ];

  return (
    <>
      <MobileLayout noPadding>
        {/* Header */}
        <div className="px-5 pt-12 pb-4 bg-card border-b border-border">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/home')}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{journey.name}</h1>
              <p className="text-sm text-muted-foreground">{journey.clipCount} clips captured</p>
            </div>
            <IOSButton
              variant="primary"
              size="icon"
              onClick={() => navigate(`/record?journey=${id}`)}
            >
              <Camera className="w-5 h-5" />
            </IOSButton>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-6 pb-32">
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {clipsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : clips.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No clips yet</p>
                  <IOSButton variant="primary" onClick={() => navigate(`/record?journey=${id}`)}>
                    Record your first clip
                  </IOSButton>
                </div>
              ) : (
                Object.entries(clipsByDate).map(([date, dateClips]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      {format(parseISO(date), 'EEEE, MMM d')}
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                      {dateClips.map((clip) => (
                        <ClipActions key={clip.id} clipId={clip.id} onDelete={handleDeleteClip}>
                          <ClipThumbnail 
                            clip={clip} 
                            size="md" 
                            onPlay={() => handleClipPlay(clip)}
                            dayNumber={getDayNumber(clip.capturedAt)}
                          />
                        </ClipActions>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'weekly' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Week 4 Clips</h3>
                  <p className="text-sm text-muted-foreground">
                    Select your best moments
                  </p>
                </div>
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {weeklyClips.map((clip) => (
                  <ClipActions key={clip.id} clipId={clip.id} onDelete={handleDeleteClip}>
                    <ClipThumbnail
                      clip={clip}
                      size="lg"
                      selectable
                      onSelect={() => handleToggleHighlight(clip.id)}
                      onPlay={() => handleClipPlay(clip)}
                      showDate
                      dayNumber={getDayNumber(clip.capturedAt)}
                    />
                  </ClipActions>
                ))}
              </div>
              {highlightedClips.length > 0 && (
                <div className="mt-6">
                  <IOSButton variant="soft" fullWidth>
                    <Play className="w-4 h-4" />
                    Preview Weekly Video
                  </IOSButton>
                </div>
              )}
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <div className="bg-card rounded-2xl p-6 border border-border text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                  <Play className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">January Highlights</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {highlightedClips.length} clips selected
                </p>
                <IOSButton variant="primary" fullWidth>
                  Generate Monthly Video
                </IOSButton>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-3">Selected Highlights</h4>
                <div className="grid grid-cols-4 gap-2">
                  {highlightedClips.map((clip) => (
                    <ClipActions key={clip.id} clipId={clip.id} onDelete={handleDeleteClip}>
                      <ClipThumbnail 
                        clip={clip} 
                        size="sm" 
                        onPlay={() => handleClipPlay(clip)}
                        dayNumber={getDayNumber(clip.capturedAt)}
                      />
                    </ClipActions>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </MobileLayout>
      <BottomNav />
      
      {/* Video Preview Dialog */}
      <ClipPreviewDialog
        clip={previewClip}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onToggleHighlight={handleToggleHighlight}
        onDelete={handleDeleteClip}
        dayNumber={previewClip ? getDayNumber(previewClip.capturedAt) : undefined}
      />
    </>
  );
};

export default JourneyDetail;
