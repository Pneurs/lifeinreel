import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileVideo, Trash2 } from 'lucide-react';
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
import { Compilation } from '@/types/journey';
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
  const { saveCompilation, drafts, deleteCompilation, promoteDraft } = useCompilations();
  const [showResult, setShowResult] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const savedRef = useRef(false);

  // Track if save happened so we know draft is not needed
  useEffect(() => {
    savedRef.current = isSaved;
  }, [isSaved]);

  const handleCompile = async () => {
    if (selectedClips.length === 0) {
      toast.error('Please select at least one clip');
      return;
    }

    const clipMetas = selectedClips.map(c => ({ url: c.uri, dayNumber: c.dayNumber }));
    const blob = await compile(clipMetas);
    
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
        isDraft: false,
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

  const saveDraft = useCallback(async () => {
    if (!compiledBlob || savedRef.current) return;

    try {
      const journeyName = selectedJourneyId !== 'all'
        ? journeys.find(j => j.id === selectedJourneyId)?.name
        : undefined;

      const title = journeyName
        ? `${journeyName} Draft`
        : `Draft - ${new Date().toLocaleDateString()}`;

      await saveCompilation({
        title,
        videoBlob: compiledBlob,
        duration: totalDuration,
        clipCount: selectedClips.length,
        clipIds: selectedClips.map(c => c.id),
        journeyId: selectedJourneyId !== 'all' ? selectedJourneyId : undefined,
        isDraft: true,
      });

      toast.info('Video saved to draft. Find it in your Profile');
    } catch {
      // Silently fail for draft saves
      console.error('Failed to save draft');
    }
  }, [compiledBlob, selectedJourneyId, journeys, totalDuration, selectedClips, saveCompilation]);

  const handleCloseResult = async () => {
    if (!isSaved && compiledBlob) {
      // Auto-save as draft
      await saveDraft();
    }
    setShowResult(false);
    reset();
    setIsSaved(false);
    if (isSaved) {
      navigate('/reels');
    }
  };

  const handleBack = async () => {
    if (compiledBlob && !savedRef.current) {
      await saveDraft();
    }
    navigate(-1);
  };

  const handleDeleteDraft = async (id: string) => {
    const ok = await deleteCompilation(id);
    if (ok) {
      toast.success('Draft deleted');
    } else {
      toast.error('Failed to delete draft');
    }
  };

  const handlePromoteDraft = async (draft: Compilation) => {
    const ok = await promoteDraft(draft.id);
    if (ok) {
      toast.success('Moved to Reels!');
    } else {
      toast.error('Failed to save. Please try again.');
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
              onClick={handleBack}
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

        {/* Drafts section */}
        {drafts.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Drafts ({drafts.length})
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex-shrink-0 w-40 rounded-xl border border-border bg-card overflow-hidden"
                >
                  <div className="relative aspect-video bg-muted">
                    {draft.videoUrl ? (
                      <video
                        src={draft.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileVideo className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-1 right-1 bg-primary/90 text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">
                      Draft
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-foreground truncate">{draft.title}</p>
                    <p className="text-[10px] text-muted-foreground">{draft.clipCount} clips</p>
                    <div className="flex gap-1 mt-1.5">
                      <button
                        onClick={() => handlePromoteDraft(draft)}
                        className="flex-1 text-[10px] font-medium text-primary bg-primary/10 rounded py-1 hover:bg-primary/20 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
