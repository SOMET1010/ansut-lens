import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Alerte = Tables<'alertes'>;

interface UseRealtimeAlertsReturn {
  unreadCount: number;
  recentAlerts: Alerte[];
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const ALERT_STYLES = {
  critical: {
    icon: '🚨',
    duration: Infinity,
    className: 'border-destructive bg-destructive/10',
  },
  warning: {
    icon: '⚠️',
    duration: 10000,
    className: 'border-orange-500 bg-orange-500/10',
  },
  info: {
    icon: 'ℹ️',
    duration: 5000,
    className: 'border-blue-500 bg-blue-500/10',
  },
};

export function useRealtimeAlerts(): UseRealtimeAlertsReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<Alerte[]>([]);
  const smsSentForAlerts = useRef<Set<string>>(new Set());

  // Trigger SMS for critical alerts
  const triggerSmsCritical = useCallback(async (alerteId: string) => {
    // Avoid duplicate SMS sends
    if (smsSentForAlerts.current.has(alerteId)) return;
    smsSentForAlerts.current.add(alerteId);

    try {
      const { data, error } = await supabase.functions.invoke('envoyer-sms', {
        body: { alerteId },
      });

      if (error) {
        console.error('Erreur envoi SMS critique:', error.message);
      } else {
        console.log('SMS critique envoyé:', data?.stats);
      }
    } catch (err) {
      console.error('Exception envoi SMS:', err);
    }
  }, []);
  useEffect(() => {
    const fetchAlerts = async () => {
      const [countResult, recentResult] = await Promise.all([
        supabase
          .from('alertes')
          .select('id', { count: 'exact' })
          .eq('lue', false),
        supabase
          .from('alertes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (countResult.count !== null) {
        setUnreadCount(countResult.count);
      }

      if (recentResult.data) {
        setRecentAlerts(recentResult.data);
      }
    };

    fetchAlerts();
  }, []);

  // Subscribe to realtime alerts
  useEffect(() => {
    const channel = supabase
      .channel('realtime-alertes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alertes',
        },
        (payload) => {
          const newAlert = payload.new as Alerte;
          
          // Update state
          setRecentAlerts((prev) => [newAlert, ...prev.slice(0, 9)]);
          setUnreadCount((prev) => prev + 1);

          // Show notification based on level
          const style = ALERT_STYLES[newAlert.niveau as keyof typeof ALERT_STYLES] || ALERT_STYLES.info;
          
          toast(newAlert.titre, {
            description: newAlert.message || 'Nouvelle alerte détectée',
            duration: style.duration,
            icon: style.icon,
            action: {
              label: 'Voir',
              onClick: () => {
                // Mark as read when clicking "Voir"
                supabase
                  .from('alertes')
                  .update({ lue: true })
                  .eq('id', newAlert.id)
                  .then(() => {
                    setUnreadCount((prev) => Math.max(0, prev - 1));
                  });
              },
            },
          });

          // Trigger SMS for critical alerts
          if (newAlert.niveau === 'critical') {
            triggerSmsCritical(newAlert.id);
          }

          // Play sound for critical alerts
          if (newAlert.niveau === 'critical') {
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {
                // Audio play failed, likely due to browser autoplay policy
              });
            } catch {
              // Audio not available
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alertes',
        },
        (payload) => {
          const updatedAlert = payload.new as Alerte;
          setRecentAlerts((prev) =>
            prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = useCallback(async (alertId: string) => {
    const { error } = await supabase
      .from('alertes')
      .update({ lue: true })
      .eq('id', alertId);

    if (!error) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setRecentAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, lue: true } : a))
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const { error } = await supabase
      .from('alertes')
      .update({ lue: true })
      .eq('lue', false);

    if (!error) {
      setUnreadCount(0);
      setRecentAlerts((prev) => prev.map((a) => ({ ...a, lue: true })));
    }
  }, []);

  return {
    unreadCount,
    recentAlerts,
    markAsRead,
    markAllAsRead,
  };
}
