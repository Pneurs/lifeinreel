import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Plus } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/navigation/BottomNav';
import { IOSButton } from '@/components/ui/ios-button';
import { ReelCard } from '@/components/reels/ReelCard';
import { useCompilations } from '@/hooks/useCompilations';
import { Compilation } from '@/types/journey';
import { toast } from 'sonner';

const Reels: React.FC = () => {
  const navigate = useNavigate();
  const { compilations, loading, deleteCompilation } = useCompilations();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Observe which reel is visible
  useEffect(() => {
    if (compilations.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      {
        root: scrollRef.current,
        threshold: 0.6,
      }
    );

    cardRefs.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [compilations.length]);

  const setCardRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(index, el);
    } else {
      cardRefs.current.delete(index);
    }
  }, []);

  const handleDelete = async (id: string) => {
    const ok = await deleteCompilation(id);
    if (ok) {
      toast.success('Reel deleted');
    } else {
      toast.error('Failed to delete reel');
    }
  };

  const handleShare = async (compilation: Compilation) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: compilation.title,
          url: compilation.videoUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Share failed');
        }
      }
    } else {
      // Fallback: download
      const a = document.createElement('a');
      a.href = compilation.videoUrl;
      a.download = `${compilation.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Video downloaded');
    }
  };

  // Empty state
  if (!loading && compilations.length === 0) {
    return (
      <>
        <MobileLayout>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-muted-foreground">Your generated videos</p>
            </div>
            <IOSButton variant="primary" size="sm" onClick={() => navigate('/compile')}>
              <Plus className="w-4 h-4" />
              Create Reel
            </IOSButton>
          </div>

          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Film className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No reels yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Create your first video compilation and save it here
            </p>
            <IOSButton variant="primary" onClick={() => navigate('/compile')}>
              <Plus className="w-4 h-4" />
              Create Compilation
            </IOSButton>
          </div>
        </MobileLayout>
        <BottomNav />
      </>
    );
  }

  // Loading
  if (loading) {
    return (
      <>
        <MobileLayout>
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </MobileLayout>
        <BottomNav />
      </>
    );
  }

  // Scrollable reels feed
  return (
    <>
      <div className="fixed inset-0 max-w-md mx-auto bg-background z-10">
        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-background/80 to-transparent px-5 pt-12 pb-6">
          <div className="flex items-center justify-end">
            <IOSButton variant="primary" size="sm" onClick={() => navigate('/compile')}>
              <Plus className="w-4 h-4" />
              Create Reel
            </IOSButton>
          </div>
        </div>

        {/* Vertical scroll container */}
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto snap-y snap-mandatory"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {compilations.map((compilation, index) => (
            <div
              key={compilation.id}
              ref={(el) => setCardRef(index, el)}
              data-index={index}
              className="h-full w-full snap-start snap-always"
              style={{ height: '100dvh' }}
            >
              <ReelCard
                compilation={compilation}
                isActive={activeIndex === index}
                onDelete={handleDelete}
                onShare={handleShare}
              />
            </div>
          ))}
        </div>

        {/* Reel counter */}
        {compilations.length > 1 && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center z-20">
            <div className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50">
              <span className="text-xs font-medium text-foreground">
                {activeIndex + 1} / {compilations.length}
              </span>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
};

export default Reels;
