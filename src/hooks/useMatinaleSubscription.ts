import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useMatinaleSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const email = user?.email;

  const { data: isSubscribed, isLoading } = useQuery({
    queryKey: ['matinale-subscription', email],
    queryFn: async () => {
      if (!email) return false;
      const { data, error } = await supabase
        .from('newsletter_destinataires')
        .select('id, actif')
        .eq('email', email)
        .eq('type', 'matinale')
        .maybeSingle();
      if (error) throw error;
      return data?.actif ?? false;
    },
    enabled: !!email,
  });

  const toggleSubscription = useMutation({
    mutationFn: async (subscribe: boolean) => {
      if (!email || !user?.id) throw new Error('Non authentifié');

      // Check if entry exists
      const { data: existing } = await supabase
        .from('newsletter_destinataires')
        .select('id')
        .eq('email', email)
        .eq('type', 'matinale')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('newsletter_destinataires')
          .update({ actif: subscribe, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else if (subscribe) {
        // Get user's full name from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        const { error } = await supabase
          .from('newsletter_destinataires')
          .insert({
            email,
            nom: profile?.full_name || email,
            type: 'matinale',
            frequence: 'quotidien',
            actif: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, subscribe) => {
      queryClient.invalidateQueries({ queryKey: ['matinale-subscription'] });
      toast.success(
        subscribe
          ? 'Vous recevrez la Matinale quotidienne par email'
          : 'Vous ne recevrez plus la Matinale par email'
      );
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de l'abonnement");
    },
  });

  return {
    isSubscribed: isSubscribed ?? false,
    isLoading,
    toggleSubscription: toggleSubscription.mutate,
    isToggling: toggleSubscription.isPending,
  };
}
