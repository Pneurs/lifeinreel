import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalNotifications } from '@/hooks/useLocalNotifications';

/**
 * Invisible component that initializes local notifications when the user is authenticated.
 * Place inside AuthProvider.
 */
export const NotificationScheduler: React.FC = () => {
  const { user } = useAuth();
  useLocalNotifications(user?.id);
  return null;
};
