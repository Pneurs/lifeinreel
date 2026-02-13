import { useEffect, useCallback } from 'react';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

// Notification IDs (stable so re-scheduling replaces old ones)
const DAILY_NOTIFICATION_ID = 1001;
const WEEKLY_NOTIFICATION_ID = 1002;
const MONTHLY_NOTIFICATION_BASE_ID = 2000; // per-journey IDs start here

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

    const notifications: ScheduleOptions['notifications'] = [];

    // --- Daily reminder at 8 PM ---
    const dailyAt = new Date();
    dailyAt.setHours(20, 0, 0, 0);
    if (dailyAt <= new Date()) {
      dailyAt.setDate(dailyAt.getDate() + 1);
    }

    notifications.push({
      id: DAILY_NOTIFICATION_ID,
      title: "Don't forget! 🎬",
      body: "Don't forget to save your blessed moment today.",
      schedule: {
        on: { hour: 20, minute: 0 },
        allowWhileIdle: true,
      },
      sound: undefined,
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7C3AED',
    });

    // --- Weekly reminder (Sunday at 11 AM) ---
    notifications.push({
      id: WEEKLY_NOTIFICATION_ID,
      title: "Weekly Reminder 💜",
      body: "Don't forget to save your blessed moments this week!",
      schedule: {
        on: { weekday: 1, hour: 11, minute: 0 }, // 1 = Sunday in Capacitor
        allowWhileIdle: true,
      },
      sound: undefined,
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7C3AED',
    });

    // --- Monthly journey-based notifications ---
    try {
      const { data: journeys } = await supabase
        .from('journeys')
        .select('id, name, clip_count')
        .eq('user_id', userId);

      if (journeys) {
        journeys.forEach((journey, index) => {
          if (journey.clip_count >= 30) {
            notifications.push({
              id: MONTHLY_NOTIFICATION_BASE_ID + index,
              title: `${journey.name} Highlights 🌟`,
              body: `You have past moments in ${journey.name}! Make a reel to see your month in 1 minute.`,
              schedule: {
                on: { day: 1, hour: 10, minute: 0 }, // 1st of each month at 10 AM
                allowWhileIdle: true,
              },
              sound: undefined,
              smallIcon: 'ic_stat_icon_config_sample',
              iconColor: '#7C3AED',
            });
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch journeys for monthly notifications:', err);
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`Scheduled ${notifications.length} local notifications`);
    }
  }, [userId, requestPermission]);

  useEffect(() => {
    scheduleAll();
  }, [scheduleAll]);

  return { scheduleAll, requestPermission };
};
