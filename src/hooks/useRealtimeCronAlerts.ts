import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type CollecteLog = Tables<'collectes_log'>;

export function useRealtimeCronAlerts() {
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    // Seulement pour les admins connectés
    if (!user || !isAdmin) return;

    const channel = supabase
      .channel('cron-executions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collectes_log',
        },
        (payload) => {
          const log = payload.new as CollecteLog;
          
          if (log.statut === 'error') {
            // Notification d'erreur critique - reste affichée
            toast.error(`CRON échoué: ${log.type}`, {
              description: log.erreur || 'Erreur lors de l\'exécution',
              duration: Infinity,
              action: {
                label: 'Voir détails',
                onClick: () => {
                  window.location.href = '/admin/cron-jobs';
                },
              },
            });
          } else if (log.statut === 'success' && log.nb_resultats && log.nb_resultats > 0) {
            // Notification de succès discrète
            toast.success(`Collecte ${log.type} terminée`, {
              description: `${log.nb_resultats} résultat(s) en ${log.duree_ms}ms`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);
}
