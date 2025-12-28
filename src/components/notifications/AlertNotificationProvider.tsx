import { createContext, useContext, type ReactNode } from 'react';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import type { Tables } from '@/integrations/supabase/types';

type Alerte = Tables<'alertes'>;

interface AlertNotificationContextValue {
  unreadCount: number;
  recentAlerts: Alerte[];
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const AlertNotificationContext = createContext<AlertNotificationContextValue | null>(null);

interface AlertNotificationProviderProps {
  children: ReactNode;
}

export function AlertNotificationProvider({ children }: AlertNotificationProviderProps) {
  const alertsData = useRealtimeAlerts();

  return (
    <AlertNotificationContext.Provider value={alertsData}>
      {children}
    </AlertNotificationContext.Provider>
  );
}

export function useAlertNotifications() {
  const context = useContext(AlertNotificationContext);
  if (!context) {
    throw new Error('useAlertNotifications must be used within AlertNotificationProvider');
  }
  return context;
}
