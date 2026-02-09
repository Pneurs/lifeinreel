export type JourneyType = 'child' | 'weightloss' | 'pregnancy' | 'custom';

export interface Journey {
  id: string;
  name: string;
  type: JourneyType;
  description?: string;
  photo?: string;
  dateOfBirth?: string;
  createdAt: string;
  lastCaptureDate?: string;
  clipCount: number;
}

export interface VideoClip {
  id: string;
  journeyId: string;
  uri: string;
  thumbnail: string;
  capturedAt: string;
  duration: number; // in seconds
  isHighlight: boolean;
  weekNumber: number;
  dayNumber?: number; // Calculated from journey start date
  isBestOfDay: boolean;
  isBestOfWeek: boolean;
  isBestOfMonth: boolean;
}

export interface WeeklyHighlight {
  journeyId: string;
  weekNumber: number;
  year: number;
  clipIds: string[];
  selectedAt?: string;
}

export interface Compilation {
  id: string;
  userId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  clipCount: number;
  clipIds: string[];
  journeyId?: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}
