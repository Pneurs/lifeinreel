import { useEffect, useCallback } from 'react';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

// Notification IDs (stable so re-scheduling replaces old ones)
const DAILY_BASE_ID = 1000; // 1000+ for daily per-journey
const WEEKLY_NOTIFICATION_ID = 900;
const MONTHLY_NOTIFICATION_BASE_ID = 2000;
const MILESTONE_BASE_ID = 3000; // 3000+ clip-count milestones (5/10/25)
const INACTIVITY_BASE_ID = 4000; // 4000+ inactivity re-engagement nudges

// Clip-count milestones that trigger "ready for a reel!" prompts
const CLIP_MILESTONES = [5, 10, 25];

// Days of inactivity before sending a re-engagement nudge
const INACTIVITY_DAYS = 3;

const DAILY_MESSAGES = [
  (name: string) => `Don't miss ${name} today — it only takes 1 second to capture your life 🎬`,
  (name: string) => `Your ${name} journey is waiting! One quick clip keeps the memories alive ✨`,
  (name: string) => `A moment in ${name} today = a memory forever. Tap to record 💜`,
  (name: string) => `${name} deserves today's moment. One second is all it takes 📸`,
];

const WEEKLY_MESSAGES = [
  'Your week was full of moments worth remembering. Review your journeys and pick your favorites! 🌟',
  'Time to reflect! Check your weekly clips and highlight the best ones 💫',
  'Another beautiful week captured. Don\'t forget to mark your best moments! 🎯',
];

export const useLocalNotifications = (userId: string | undefined) => {

  const requestPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return false;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  }, []);

  const scheduleAll = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !userId) return;

    const granted = await requestPermission();
    if (!granted) return;

    // Cancel existing scheduled notifications before re-scheduling
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const dailyEnabled = localStorage.getItem('dailyReminder') !== 'false';
    const weeklyEnabled = localStorage.getItem('weeklyReminder') !== 'false';

    const notifications: ScheduleOptions['notifications'] = [];

    // Fetch journeys for personalized notifications
    let journeys: { id: string; name: string; clip_count: number; last_capture_date: string | null }[] = [];
    try {
      const { data } = await supabase
        .from('journeys')
        .select('id, name, clip_count, last_capture_date')
        .eq('user_id', userId);
      if (data) journeys = data;
    } catch (err) {
      console.error('Failed to fetch journeys for notifications:', err);
    }

    // --- Daily reminders with journey names at 8 PM ---
    if (dailyEnabled) {
      if (journeys.length > 0) {
        journeys.forEach((journey, index) => {
          const msg = DAILY_MESSAGES[index % DAILY_MESSAGES.length];
          notifications.push({
            id: DAILY_BASE_ID + index,
            title: `${journey.name} 🎬`,
            body: msg(journey.name),
            schedule: {
              on: { hour: 20, minute: 0 },
              allowWhileIdle: true,
            },
            sound: undefined,
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#7C3AED',
          });
        });
      } else {
        // Fallback if no journeys yet
        notifications.push({
          id: DAILY_BASE_ID,
          title: "Capture your moment 🎬",
          body: "Your life is happening right now — take 1 second to save today's memory.",
          schedule: {
            on: { hour: 20, minute: 0 },
            allowWhileIdle: true,
          },
          sound: undefined,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#7C3AED',
        });
      }
    }

    // --- Weekly reminder (Sunday at 11 AM) ---
    if (weeklyEnabled) {
      const weeklyMsg = WEEKLY_MESSAGES[Math.floor(Math.random() * WEEKLY_MESSAGES.length)];
      notifications.push({
        id: WEEKLY_NOTIFICATION_ID,
        title: "Your Week in Review 💜",
        body: weeklyMsg,
        schedule: {
          on: { weekday: 1, hour: 11, minute: 0 },
          allowWhileIdle: true,
        },
        sound: undefined,
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#7C3AED',
      });
    }

    // --- Monthly journey-based notifications ---
    journeys.forEach((journey, index) => {
      if (journey.clip_count >= 30) {
        notifications.push({
          id: MONTHLY_NOTIFICATION_BASE_ID + index,
          title: `${journey.name} Highlights 🌟`,
          body: `You've got ${journey.clip_count} clips in ${journey.name}! Create a reel and relive your month in 1 minute.`,
          schedule: {
            on: { day: 1, hour: 10, minute: 0 },
            allowWhileIdle: true,
          },
          sound: undefined,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#7C3AED',
        });
      }
    });

    // --- Clip-count milestone notifications (5, 10, 25 clips) ---
    // Fires next day at 9 AM when journey reaches a milestone (one-time-ish via stable ID).
    // Strategy: only schedule the NEXT unmet milestone per journey to avoid notification spam.
    journeys.forEach((journey, journeyIndex) => {
      const nextMilestone = CLIP_MILESTONES.find((m) => journey.clip_count >= m && journey.clip_count < m + 3);
      if (nextMilestone) {
        const tomorrow9am = new Date();
        tomorrow9am.setDate(tomorrow9am.getDate() + 1);
        tomorrow9am.setHours(9, 0, 0, 0);
        notifications.push({
          id: MILESTONE_BASE_ID + journeyIndex * 10 + CLIP_MILESTONES.indexOf(nextMilestone),
          title: `${journey.name} is taking shape ✨`,
          body: `You've captured ${journey.clip_count} moments in ${journey.name} — ready to compile your first reel?`,
          schedule: { at: tomorrow9am, allowWhileIdle: true },
          sound: undefined,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#7C3AED',
        });
      }
    });

    // --- Inactivity re-engagement nudges ---
    // If a journey hasn't received a clip in N days, schedule a one-time nudge at 7 PM tomorrow.
    journeys.forEach((journey, journeyIndex) => {
      if (!journey.last_capture_date) return; // brand-new journey, daily reminder handles it
      const daysSince = Math.floor(
        (Date.now() - new Date(journey.last_capture_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince >= INACTIVITY_DAYS) {
        const tomorrow7pm = new Date();
        tomorrow7pm.setDate(tomorrow7pm.getDate() + 1);
        tomorrow7pm.setHours(19, 0, 0, 0);
        notifications.push({
          id: INACTIVITY_BASE_ID + journeyIndex,
          title: `Don't lose ${journey.name} 💜`,
          body: `It's been ${daysSince} days since your last clip in ${journey.name}. One second is all it takes!`,
          schedule: { at: tomorrow7pm, allowWhileIdle: true },
          sound: undefined,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#7C3AED',
        });
      }
    });
      await LocalNotifications.schedule({ notifications });
      console.log(`Scheduled ${notifications.length} local notifications`);
    }
  }, [userId, requestPermission]);

  useEffect(() => {
    scheduleAll();
  }, [scheduleAll]);

  // Listen for toggle changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'dailyReminder' || e.key === 'weeklyReminder') {
        scheduleAll();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [scheduleAll]);

  return { scheduleAll, requestPermission };
};
