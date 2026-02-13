import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Play } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/navigation/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, parseISO } from 'date-fns';
import { ClipPreviewDialog } from '@/components/journey/ClipPreviewDialog';

interface TimelineClip {
  id: string;
  journeyId: string;
  uri: string;
  thumbnail: string;
  capturedAt: string;
  duration: number;
  isHighlight: boolean;
  weekNumber: number;
  isBestOfDay: boolean;
  isBestOfWeek: boolean;
  isBestOfMonth: boolean;
}

const Timeline: React.FC = () => {
  const { user } = useAuth();
  const [allClips, setAllClips] = useState<TimelineClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [previewClip, setPreviewClip] = useState<TimelineClip | null>(null);

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  // Fetch all clips for the current month
  useEffect(() => {
    if (!user) return;
    const fetchClips = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('video_clips')
        .select('*')
        .gte('captured_at', monthStart.toISOString())
        .lte('captured_at', monthEnd.toISOString())
        .order('captured_at', { ascending: false });

      if (!error && data) {
        setAllClips(data.map((c) => ({
          id: c.id,
          journeyId: c.journey_id,
          uri: c.video_url,
          thumbnail: c.thumbnail_url || c.video_url,
          capturedAt: c.captured_at,
          duration: Number(c.duration),
          isHighlight: c.is_highlight,
          weekNumber: c.week_number,
          isBestOfDay: c.is_best_of_day,
          isBestOfWeek: c.is_best_of_week,
          isBestOfMonth: c.is_best_of_month,
        })));
      }
      setLoading(false);
    };
    fetchClips();
  }, [user]);

  // Days in current month for calendar
  const calendarDays = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), []);
  const firstDayOffset = getDay(monthStart); // 0=Sun

  // Map dates to clips
  const clipsByDate = useMemo(() => {
    const map = new Map<string, TimelineClip[]>();
    allClips.forEach((clip) => {
      const key = format(parseISO(clip.capturedAt), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(clip);
    });
    return map;
  }, [allClips]);

  // Clips for the view: selected date or this week
  const displayClips = useMemo(() => {
    if (selectedDate) {
      const key = format(selectedDate, 'yyyy-MM-dd');
      return clipsByDate.get(key) || [];
    }
    // This week's clips
    return allClips.filter((c) => {
      const d = parseISO(c.capturedAt);
      return d >= weekStart && d <= weekEnd;
    });
  }, [selectedDate, allClips, clipsByDate]);

  const sectionTitle = selectedDate
    ? format(selectedDate, 'EEEE, MMM d')
    : 'This Week';

  return (
    <>
      <MobileLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Timeline</h1>
          <p className="text-muted-foreground">{format(today, 'MMMM yyyy')}</p>
        </div>

        {/* Calendar */}
        <div className="bg-card rounded-2xl p-4 mb-6 border border-border/50">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {calendarDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const hasClips = clipsByDate.has(key);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isPast = day < today;

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDate(null);
                    } else {
                      setSelectedDate(day);
                    }
                  }}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-sm transition-colors relative",
                    hasClips && "bg-primary/10 text-primary font-semibold",
                    isToday && "ring-2 ring-primary",
                    isSelected && "bg-primary text-primary-foreground",
                    !hasClips && isPast && "text-muted-foreground",
                    !hasClips && !isPast && !isToday && "text-foreground"
                  )}
                >
                  {day.getDate()}
                  {hasClips && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="mt-3 text-xs text-primary font-medium"
            >
              ← Back to this week
            </button>
          )}
        </div>

        {/* Clips section */}
        <div>
          <h2 className="font-semibold text-foreground mb-4">{sectionTitle}</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayClips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {selectedDate ? 'No clips on this day' : 'No clips this week'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {displayClips.map((clip) => (
                <button
                  key={clip.id}
                  onClick={() => setPreviewClip(clip)}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted border border-border/50"
                >
                  <video
                    src={clip.uri}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-primary-foreground" fill="currentColor" />
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1">
                    <span className="text-[10px] text-primary-foreground">{Math.round(clip.duration)}s</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </MobileLayout>
      <BottomNav />

      {previewClip && (
        <ClipPreviewDialog
          clip={previewClip}
          open={!!previewClip}
          onOpenChange={(open) => !open && setPreviewClip(null)}
        />
      )}
    </>
  );
};

export default Timeline;
