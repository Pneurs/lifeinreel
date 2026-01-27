import { useState, useEffect } from 'react';
import { Journey, VideoClip } from '@/types/journey';

// Mock data for demo
const mockJourneys: Journey[] = [
  {
    id: '1',
    name: 'Emma',
    type: 'child',
    dateOfBirth: '2023-06-15',
    createdAt: '2023-06-15',
    lastCaptureDate: '2024-01-26',
    clipCount: 87,
  },
  {
    id: '2',
    name: 'Fitness Journey',
    type: 'weightloss',
    description: 'My transformation',
    createdAt: '2023-09-01',
    lastCaptureDate: '2024-01-25',
    clipCount: 45,
  },
];

const mockClips: VideoClip[] = [
  { id: 'c1', journeyId: '1', uri: '', thumbnail: '', capturedAt: '2024-01-26T10:30:00', duration: 1.5, isHighlight: false, weekNumber: 4 },
  { id: 'c2', journeyId: '1', uri: '', thumbnail: '', capturedAt: '2024-01-25T09:15:00', duration: 2, isHighlight: true, weekNumber: 4 },
  { id: 'c3', journeyId: '1', uri: '', thumbnail: '', capturedAt: '2024-01-24T14:20:00', duration: 1.8, isHighlight: false, weekNumber: 4 },
  { id: 'c4', journeyId: '1', uri: '', thumbnail: '', capturedAt: '2024-01-23T11:00:00', duration: 1.2, isHighlight: true, weekNumber: 4 },
  { id: 'c5', journeyId: '1', uri: '', thumbnail: '', capturedAt: '2024-01-22T16:45:00', duration: 2, isHighlight: false, weekNumber: 4 },
  { id: 'c6', journeyId: '1', uri: '', thumbnail: '', capturedAt: '2024-01-21T08:30:00', duration: 1.5, isHighlight: false, weekNumber: 3 },
  { id: 'c7', journeyId: '1', uri: '', thumbnail: '', capturedAt: '2024-01-20T12:00:00', duration: 1.8, isHighlight: true, weekNumber: 3 },
];

export const useJourneys = () => {
  const [journeys, setJourneys] = useState<Journey[]>(mockJourneys);
  const [loading, setLoading] = useState(false);

  const addJourney = (journey: Omit<Journey, 'id' | 'createdAt' | 'clipCount'>) => {
    const newJourney: Journey = {
      ...journey,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      clipCount: 0,
    };
    setJourneys((prev) => [...prev, newJourney]);
    return newJourney;
  };

  return { journeys, loading, addJourney };
};

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
