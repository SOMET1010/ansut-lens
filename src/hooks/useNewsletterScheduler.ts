import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { NewsletterProgrammation, NewsletterTon, NewsletterCible, ProgrammationFrequence } from '@/types/newsletter';

// Fetch programmation configuration
export function useNewsletterProgrammation() {
  return useQuery({
    queryKey: ['newsletter-programmation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_programmation')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as unknown as NewsletterProgrammation;
    },
  });
}

// Update programmation
export function useUpdateProgrammation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<{
      frequence: ProgrammationFrequence;
      jour_envoi: number;
      heure_envoi: string;
      ton_defaut: NewsletterTon;
      cible_defaut: NewsletterCible;
      delai_rappel_heures: number;
      emails_rappel: string[];
      actif: boolean;
    }>) => {
      // Get current config ID first
      const { data: current, error: fetchError } = await supabase
        .from('newsletter_programmation')
        .select('id')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('newsletter_programmation')
        .update(updates)
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as NewsletterProgrammation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-programmation'] });
      toast.success('Configuration enregistrée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// Toggle programmation active/inactive
export function useToggleProgrammation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actif: boolean) => {
      const { data: current, error: fetchError } = await supabase
        .from('newsletter_programmation')
        .select('id')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('newsletter_programmation')
        .update({ actif })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-programmation'] });
      toast.success(data.actif ? 'Programmation activée' : 'Programmation désactivée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// Run scheduler manually
export function useRunScheduler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('scheduler-newsletter', {
        body: { triggered_by: 'manual' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-programmation'] });
      
      if (data.actions?.length > 0) {
        toast.success(`Scheduler exécuté: ${data.actions.join(', ')}`);
      } else {
        toast.info('Scheduler exécuté - aucune action nécessaire');
      }
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// Fetch newsletters with programmation active
export function useScheduledNewsletters() {
  return useQuery({
    queryKey: ['scheduled-newsletters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .eq('programmation_active', true)
        .order('date_envoi_programme', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
