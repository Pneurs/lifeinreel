import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/navigation/BottomNav';
import { CompileFilters } from '@/components/compile/CompileFilters';
import { SelectableClipThumbnail } from '@/components/compile/SelectableClipThumbnail';
import { DurationCounter } from '@/components/compile/DurationCounter';
import { CompilationProgress } from '@/components/compile/CompilationProgress';
import { CompilationResultSheet } from '@/components/compile/CompilationResultSheet';
import { useJourneys } from '@/hooks/useJourneys';
import { useCompileClips, TagFilter } from '@/hooks/useCompileClips';
import { useVideoCompilation } from '@/hooks/useVideoCompilation';
import { useCompilations } from '@/hooks/useCompilations';
import { toast } from 'sonner';

const Compile: React.FC = () => {
  const navigate = useNavigate();
  const { journeys } = useJourneys();
  
  // Filter state
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<TagFilter>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

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

  const { progress, compiledBlob, compiledUrl, compile, reset } = useVideoCompilation();
  const { saveCompilation } = useCompilations();
  const [showResult, setShowResult] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleCompile = async () => {
    if (selectedClips.length === 0) {
      toast.error('Please select at least one clip');
      return;
    }

    const videoUrls = selectedClips.map(c => c.uri);
    const blob = await compile(videoUrls);
    
    if (blob) {
      setShowResult(true);
    }
  };

  const handleSaveToApp = async () => {
    if (!compiledBlob) return;

    setIsSaving(true);
    try {
      const journeyName = selectedJourneyId !== 'all'
        ? journeys.find(j => j.id === selectedJourneyId)?.name
        : undefined;

      const title = journeyName
        ? `${journeyName} Compilation`
        : `Compilation - ${new Date().toLocaleDateString()}`;

      const result = await saveCompilation({
        title,
        videoBlob: compiledBlob,
        duration: totalDuration,
        clipCount: selectedClips.length,
        clipIds: selectedClips.map(c => c.id),
        journeyId: selectedJourneyId !== 'all' ? selectedJourneyId : undefined,
      });

      if (result) {
        setIsSaved(true);
        toast.success('Saved to your Reels!');
      } else {
        toast.error('Failed to save. Please try again.');
      }
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    if (isSaved) {
      reset();
      setIsSaved(false);
      navigate('/reels');
    }
  };

  const isCompiling = progress.stage !== 'idle' && progress.stage !== 'done' && progress.stage !== 'error';

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

      {/* Compilation progress overlay */}
      {progress.stage !== 'idle' && progress.stage !== 'done' && (
        <CompilationProgress {...progress} />
      )}

      {/* Result sheet */}
      <CompilationResultSheet
        open={showResult}
        onClose={handleCloseResult}
        videoUrl={compiledUrl}
        videoBlob={compiledBlob}
        onSaveToApp={handleSaveToApp}
        isSaving={isSaving}
        isSaved={isSaved}
      />

      <BottomNav />
    </>
  );
};

export default Compile;
