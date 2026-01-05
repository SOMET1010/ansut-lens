import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  Newsletter, 
  NewsletterDestinataire, 
  GenerateNewsletterParams,
  NewsletterContenu,
  NewsletterStatut
} from '@/types/newsletter';

// Fetch all newsletters
export function useNewsletters() {
  return useQuery({
    queryKey: ['newsletters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        contenu: item.contenu as unknown as NewsletterContenu
      })) as Newsletter[];
    },
  });
}

// Fetch single newsletter
export function useNewsletter(id: string | undefined) {
  return useQuery({
    queryKey: ['newsletter', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        contenu: data.contenu as unknown as NewsletterContenu
      } as Newsletter;
    },
    enabled: !!id,
  });
}

// Fetch destinataires
export function useNewsletterDestinataires() {
  return useQuery({
    queryKey: ['newsletter-destinataires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_destinataires')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as NewsletterDestinataire[];
    },
  });
}

// Generate newsletter via edge function
export function useGenerateNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateNewsletterParams) => {
      const { data, error } = await supabase.functions.invoke('generer-newsletter', {
        body: params,
      });

      if (error) throw error;
      return data as Newsletter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Newsletter générée avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la génération : ${error.message}`);
    },
  });
}

// Update newsletter content
export function useUpdateNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contenu, ...updates }: Partial<Newsletter> & { id: string }) => {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      if (contenu) {
        updateData.contenu = JSON.parse(JSON.stringify(contenu));
      }

      const { data, error } = await supabase
        .from('newsletters')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter', variables.id] });
      toast.success('Newsletter mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

// Validate newsletter
export function useValidateNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('newsletters')
        .update({
          statut: 'valide' as NewsletterStatut,
          valide_par: user?.id,
          date_validation: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter', id] });
      toast.success('Newsletter validée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

// Send newsletter via edge function
export function useSendNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('envoyer-newsletter', {
        body: { newsletterId: id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter', id] });
      toast.success('Newsletter envoyée avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur d'envoi : ${error.message}`);
    },
  });
}

// Delete newsletter
export function useDeleteNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('newsletters')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Newsletter supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

// Add destinataire
export function useAddDestinataire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (destinataire: Omit<NewsletterDestinataire, 'id' | 'created_at' | 'updated_at' | 'derniere_reception' | 'nb_receptions'>) => {
      const { data, error } = await supabase
        .from('newsletter_destinataires')
        .insert(destinataire)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-destinataires'] });
      toast.success('Destinataire ajouté');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

// Delete destinataire
export function useDeleteDestinataire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('newsletter_destinataires')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-destinataires'] });
      toast.success('Destinataire supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
