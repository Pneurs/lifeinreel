import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface MusicTrack {
  id: string;
  name: string;
  mood: string;
  file_url: string;
  duration_seconds: number;
}

interface MusicPickerProps {
  selectedTrack: MusicTrack | null;
  onSelect: (track: MusicTrack | null) => void;
}

export const MusicPicker: React.FC<MusicPickerProps> = ({ selectedTrack, onSelect }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setTracks(data);
      }
      setLoading(false);
    };
    fetchTracks();
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePreview = (track: MusicTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.file_url);
    audio.volume = 0.5;
    audio.play();
    audio.onended = () => setPlayingId(null);
    // Stop after 10s preview
    setTimeout(() => {
      if (audioRef.current === audio) {
        audio.pause();
        setPlayingId(null);
      }
    }, 10000);
    audioRef.current = audio;
    setPlayingId(track.id);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="px-5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Music className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Background Music</span>
        </div>
        <div className="h-16 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="px-5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Music className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Background Music</span>
        </div>
        <p className="text-xs text-muted-foreground">No music tracks available yet. Upload MP3s to the music bucket to get started.</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-2 mb-3">
        <Music className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Background Music</span>
        {selectedTrack && (
          <button
            onClick={() => onSelect(null)}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
        {tracks.map((track) => {
          const isSelected = selectedTrack?.id === track.id;
          const isPlaying = playingId === track.id;

          return (
            <div
              key={track.id}
              onClick={() => onSelect(isSelected ? null : track)}
              className={`flex-shrink-0 w-36 rounded-xl border-2 p-3 cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground truncate flex-1">
                  {track.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(track);
                  }}
                  className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ml-1"
                >
                  {isPlaying ? (
                    <Pause className="w-3 h-3 text-primary" />
                  ) : (
                    <Play className="w-3 h-3 text-primary ml-0.5" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {track.mood}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDuration(track.duration_seconds)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
