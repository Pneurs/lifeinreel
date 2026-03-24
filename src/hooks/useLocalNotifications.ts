import { useEffect, useCallback } from 'react';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

// Notification IDs (stable so re-scheduling replaces old ones)
const DAILY_BASE_ID = 1000; // 1000+ for daily per-journey
const WEEKLY_NOTIFICATION_ID = 900;
const MONTHLY_NOTIFICATION_BASE_ID = 2000;

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
    let journeys: { id: string; name: string; clip_count: number }[] = [];
    try {
      const { data } = await supabase
        .from('journeys')
        .select('id, name, clip_count')
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

    if (notifications.length > 0) {
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
