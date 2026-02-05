import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VideoClip } from '@/types/journey';

export type TagFilter = 'all' | 'day' | 'week' | 'month';

interface UseCompileClipsOptions {
  journeyId?: string;
  tagFilter: TagFilter;
  startDate?: Date;
  endDate?: Date;
}

export const useCompileClips = (options: UseCompileClipsOptions) => {
  const { journeyId, tagFilter, startDate, endDate } = options;
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    const fetchClips = async () => {
      if (!user) {
        setClips([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      let query = supabase
        .from('video_clips')
        .select('*')
        .order('captured_at', { ascending: false });

      // Filter by journey if specified
      if (journeyId) {
        query = query.eq('journey_id', journeyId);
      }

      // Filter by date range
      if (startDate) {
        query = query.gte('captured_at', startDate.toISOString());
      }
      if (endDate) {
        // Add 1 day to include the end date fully
        const endOfDay = new Date(endDate);
        endOfDay.setDate(endOfDay.getDate() + 1);
        query = query.lt('captured_at', endOfDay.toISOString());
      }

      // Filter by tag type - using type assertion to handle new columns not yet in generated types
      if (tagFilter === 'day') {
        query = query.eq('is_best_of_day', true);
      } else if (tagFilter === 'week') {
        query = query.eq('is_best_of_week', true);
      } else if (tagFilter === 'month') {
        query = query.eq('is_best_of_month', true);
      }

      const { data, error } = await query as { data: any[] | null; error: any };

      if (error) {
        console.error('Error fetching clips for compile:', error);
        setClips([]);
      } else {
        const mappedClips: VideoClip[] = (data || []).map((c) => ({
          id: c.id,
          journeyId: c.journey_id,
          uri: c.video_url,
          thumbnail: c.thumbnail_url || c.video_url,
          capturedAt: c.captured_at,
          duration: Number(c.duration),
          isHighlight: c.is_highlight,
          weekNumber: c.week_number,
          isBestOfDay: (c as any).is_best_of_day ?? false,
          isBestOfWeek: (c as any).is_best_of_week ?? false,
          isBestOfMonth: (c as any).is_best_of_month ?? false,
        }));
        setClips(mappedClips);
        // Select all by default
        setSelectedIds(new Set(mappedClips.map(c => c.id)));
      }
      setLoading(false);
    };

    fetchClips();
  }, [user, journeyId, tagFilter, startDate, endDate]);

  const toggleSelection = (clipId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(clipId)) {
        next.delete(clipId);
      } else {
        next.add(clipId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(clips.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectedClips = useMemo(() => 
    clips.filter(c => selectedIds.has(c.id)),
    [clips, selectedIds]
  );

  const totalDuration = useMemo(() => 
    selectedClips.reduce((sum, c) => sum + c.duration, 0),
    [selectedClips]
  );

  return {
    clips,
    loading,
    selectedIds,
    selectedClips,
    totalDuration,
    toggleSelection,
    selectAll,
    deselectAll,
  };
};
