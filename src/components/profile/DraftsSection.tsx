import React from 'react';
import { FileVideo, Trash2, Film } from 'lucide-react';
import { useCompilations } from '@/hooks/useCompilations';
import { Compilation } from '@/types/journey';
import { toast } from 'sonner';

const DraftsSection: React.FC = () => {
  const { drafts, promoteDraft, deleteCompilation } = useCompilations();

  if (drafts.length === 0) return null;

  const handlePromote = async (draft: Compilation) => {
    const ok = await promoteDraft(draft.id);
    if (ok) {
      toast.success('Moved to Reels!');
    } else {
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteCompilation(id);
    if (ok) {
      toast.success('Draft deleted');
    } else {
      toast.error('Failed to delete draft');
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Draft Videos ({drafts.length})
      </h2>
      <div className="bg-card rounded-2xl px-4 py-3 space-y-3">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
          >
            <div className="w-16 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
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
                  <FileVideo className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{draft.title}</p>
              <p className="text-xs text-muted-foreground">{draft.clipCount} clips</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handlePromote(draft)}
                className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 rounded-lg px-3 py-1.5 hover:bg-primary/20 transition-colors"
              >
                <Film className="w-3 h-3" />
                Save
              </button>
              <button
                onClick={() => handleDelete(draft.id)}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DraftsSection;
