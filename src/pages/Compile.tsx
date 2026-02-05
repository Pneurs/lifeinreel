import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/navigation/BottomNav';
import { CompileFilters } from '@/components/compile/CompileFilters';
import { SelectableClipThumbnail } from '@/components/compile/SelectableClipThumbnail';
import { DurationCounter } from '@/components/compile/DurationCounter';
import { useJourneys } from '@/hooks/useJourneys';
import { useCompileClips, TagFilter } from '@/hooks/useCompileClips';
import { toast } from 'sonner';

const Compile: React.FC = () => {
  const navigate = useNavigate();
  const { journeys } = useJourneys();
  
  // Filter state
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<TagFilter>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isCompiling, setIsCompiling] = useState(false);

  const {
    clips,
    loading,
    selectedIds,
    selectedClips,
    totalDuration,
    toggleSelection,
  } = useCompileClips({
    journeyId: selectedJourneyId === 'all' ? undefined : selectedJourneyId,
    tagFilter,
    startDate,
    endDate,
  });

  const handleCompile = async () => {
    if (selectedClips.length === 0) {
      toast.error('Please select at least one clip');
      return;
    }

    setIsCompiling(true);
    // TODO: Implement actual video compilation via server-side FFmpeg
    // For now, just simulate the action
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsCompiling(false);
    toast.success(`Compilation started with ${selectedClips.length} clips!`);
  };

  return (
    <>
      <MobileLayout noPadding>
        {/* Header */}
        <div className="px-5 pt-12 pb-4 bg-card border-b border-border">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Create Compilation</h1>
              <p className="text-sm text-muted-foreground">Select clips to include</p>
            </div>
          </div>

          {/* Filters */}
          <CompileFilters
            journeys={journeys}
            selectedJourneyId={selectedJourneyId}
            onJourneyChange={setSelectedJourneyId}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>

        {/* Clips Grid */}
        <div className="px-5 py-6 pb-48">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No clips found with these filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {clips.map((clip) => (
                <SelectableClipThumbnail
                  key={clip.id}
                  clip={clip}
                  selected={selectedIds.has(clip.id)}
                  onToggle={() => toggleSelection(clip.id)}
                />
              ))}
            </div>
          )}
        </div>
      </MobileLayout>

      {/* Duration counter & compile button */}
      <DurationCounter
        selectedCount={selectedClips.length}
        totalDuration={totalDuration}
        onCompile={handleCompile}
        isCompiling={isCompiling}
      />

      <BottomNav />
    </>
  );
};

export default Compile;
