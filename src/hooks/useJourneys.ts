import { useState, useEffect } from 'react';
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

// Mock clips for now - will be replaced with database later
const mockClips: VideoClip[] = [];

export const useJourneyClips = (journeyId: string) => {
  const [clips, setClips] = useState<VideoClip[]>([]);
  
  useEffect(() => {
    setClips(mockClips.filter(c => c.journeyId === journeyId));
  }, [journeyId]);

  const toggleHighlight = (clipId: string) => {
    setClips((prev) =>
      prev.map((clip) =>
        clip.id === clipId ? { ...clip, isHighlight: !clip.isHighlight } : clip
      )
    );
  };

  return { clips, toggleHighlight };
};
