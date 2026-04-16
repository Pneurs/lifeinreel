import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, X, Upload, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MusicTrack {
  id: string;
  name: string;
  mood: string;
  file_url: string;
  duration_seconds: number;
  user_id?: string | null;
}

interface MusicPickerProps {
  selectedTrack: MusicTrack | null;
  onSelect: (track: MusicTrack | null) => void;
}

export const MusicPicker: React.FC<MusicPickerProps> = ({ selectedTrack, onSelect }) => {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchTracks = async () => {
    const { data, error } = await supabase
      .from('music_tracks')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setTracks(data as MusicTrack[]);
    }
    setLoading(false);
  };

  useEffect(() => {
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
    setTimeout(() => {
      if (audioRef.current === audio) {
        audio.pause();
        setPlayingId(null);
      }
    }, 10000);
    audioRef.current = audio;
    setPlayingId(track.id);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file (MP3, M4A, etc.)');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File must be under 20MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'mp3';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('music')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('music')
        .getPublicUrl(fileName);

      // Get duration via Audio element
      const duration = await new Promise<number>((resolve) => {
        const audio = new Audio(urlData.publicUrl);
        audio.addEventListener('loadedmetadata', () => {
          resolve(Math.round(audio.duration));
        });
        audio.addEventListener('error', () => resolve(60));
      });

      const trackName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

      const { error: insertError } = await supabase
        .from('music_tracks')
        .insert({
          name: trackName,
          mood: 'Custom',
          file_url: urlData.publicUrl,
          duration_seconds: duration,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      toast.success('Track uploaded!');
      await fetchTracks();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteTrack = async (track: MusicTrack) => {
    if (track.user_id !== user?.id) return;

    // Deselect if selected
    if (selectedTrack?.id === track.id) onSelect(null);

    // Stop if playing
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }

    const { error } = await supabase
      .from('music_tracks')
      .delete()
      .eq('id', track.id);

    if (!error) {
      setTracks(prev => prev.filter(t => t.id !== track.id));
      toast.success('Track removed');
    } else {
      toast.error('Failed to remove track');
    }
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
        {/* Upload card */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="flex-shrink-0 w-36 rounded-xl border-2 border-dashed border-border p-3 cursor-pointer hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-1.5"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {uploading ? 'Uploading...' : 'Upload'}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleUpload}
        />

        {tracks.map((track) => {
          const isSelected = selectedTrack?.id === track.id;
          const isPlaying = playingId === track.id;
          const isOwn = track.user_id === user?.id;

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
                <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                  {isOwn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrack(track);
                      }}
                      className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-2.5 h-2.5 text-destructive" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(track);
                    }}
                    className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    {isPlaying ? (
                      <Pause className="w-3 h-3 text-primary" />
                    ) : (
                      <Play className="w-3 h-3 text-primary ml-0.5" />
                    )}
                  </button>
                </div>
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
