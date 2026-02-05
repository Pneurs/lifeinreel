import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Journey, VideoClip, JourneyType } from '@/types/journey';

export const useJourneys = () => {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchJourneys = async () => {
    if (!user) {
      setJourneys([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching journeys:', error);
    } else {
      const mappedJourneys: Journey[] = (data || []).map((j) => ({
        id: j.id,
        name: j.name,
        type: j.type as JourneyType,
        description: j.description || undefined,
        photo: j.photo || undefined,
        dateOfBirth: j.date_of_birth || undefined,
        createdAt: j.created_at,
        lastCaptureDate: j.last_capture_date || undefined,
        clipCount: j.clip_count,
      }));
      setJourneys(mappedJourneys);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJourneys();
  }, [user]);

  const addJourney = async (journey: Omit<Journey, 'id' | 'createdAt' | 'clipCount'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('journeys')
      .insert({
        user_id: user.id,
        name: journey.name,
        type: journey.type,
        description: journey.description || null,
        date_of_birth: journey.dateOfBirth || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding journey:', error);
      return null;
    }

    const newJourney: Journey = {
      id: data.id,
      name: data.name,
      type: data.type as JourneyType,
      description: data.description || undefined,
      dateOfBirth: data.date_of_birth || undefined,
      createdAt: data.created_at,
      clipCount: data.clip_count,
    };

    setJourneys((prev) => [newJourney, ...prev]);
    return newJourney;
  };

  return { journeys, loading, addJourney, refetch: fetchJourneys };
};

export const useJourneyClips = (journeyId: string) => {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const fetchClips = useCallback(async () => {
    if (!user || !journeyId) {
      setClips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('journey_id', journeyId)
      .order('captured_at', { ascending: false });

    if (error) {
      console.error('Error fetching clips:', error);
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
    }
    setLoading(false);
  }, [user, journeyId]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const toggleHighlight = async (clipId: string) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    const newValue = !clip.isHighlight;
    
    // Optimistic update
    setClips((prev) =>
      prev.map((c) =>
        c.id === clipId ? { ...c, isHighlight: newValue } : c
      )
    );

    const { error } = await supabase
      .from('video_clips')
      .update({ is_highlight: newValue })
      .eq('id', clipId);

    if (error) {
      console.error('Error toggling highlight:', error);
      // Revert on error
      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId ? { ...c, isHighlight: !newValue } : c
        )
      );
    }
  };

  const deleteClip = async (clipId: string) => {
    const { error } = await supabase
      .from('video_clips')
      .delete()
      .eq('id', clipId);

    if (error) {
      console.error('Error deleting clip:', error);
      return false;
    }

    setClips((prev) => prev.filter((c) => c.id !== clipId));
    return true;
  };

  const toggleBestOf = async (clipId: string, type: 'day' | 'week' | 'month') => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    const fieldMap = {
      day: { local: 'isBestOfDay', db: 'is_best_of_day' },
      week: { local: 'isBestOfWeek', db: 'is_best_of_week' },
      month: { local: 'isBestOfMonth', db: 'is_best_of_month' },
    } as const;

    const field = fieldMap[type];
    const currentValue = clip[field.local as keyof VideoClip] as boolean;
    const newValue = !currentValue;

    // Optimistic update
    setClips((prev) =>
      prev.map((c) =>
        c.id === clipId ? { ...c, [field.local]: newValue } : c
      )
    );

    const { error } = await supabase
      .from('video_clips')
      .update({ [field.db]: newValue } as any)
      .eq('id', clipId);

    if (error) {
      console.error(`Error toggling ${type}:`, error);
      // Revert on error
      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId ? { ...c, [field.local]: currentValue } : c
        )
      );
    }
  };

  return { clips, loading, toggleHighlight, toggleBestOf, deleteClip, refetch: fetchClips };
};
