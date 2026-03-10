import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MatinaleFlashItem {
  titre: string;
  resume: string;
  source: string;
}

interface MatinaleContent {
  flash_info: MatinaleFlashItem[];
  veille_reputation: {
    resume: string;
    tonalite: 'positif' | 'neutre' | 'negatif';
    mentions_cles: string[];
  };
  pret_a_poster: {
    linkedin: string;
    angle: string;
  };
}

interface MatinaleResponse {
  matinale: MatinaleContent;
  html?: string;
  articles_count: number;
  generated_at: string;
  sent?: number;
  failed?: number;
  warning?: string;
  error?: string;
}

export function useMatinalePreview() {
  return useMutation({
    mutationFn: async (): Promise<MatinaleResponse> => {
      const { data, error } = await supabase.functions.invoke('generer-matinale', {
        body: { previewOnly: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onError: (err: Error) => {
      toast.error(`Erreur de génération : ${err.message}`);
    },
  });
}

export function useMatinaleSend() {
  return useMutation({
    mutationFn: async (recipients?: string[]): Promise<MatinaleResponse> => {
      const { data, error } = await supabase.functions.invoke('generer-matinale', {
        body: { previewOnly: false, ...(recipients ? { recipients } : {}) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.sent !== undefined) {
        toast.success(`Matinale envoyée à ${data.sent} destinataire(s)`);
      }
      if (data.warning) {
        toast.warning(data.warning);
      }
    },
    onError: (err: Error) => {
      toast.error(`Erreur d'envoi : ${err.message}`);
    },
  });
}

export function useMatinaleHistory() {
  return useQuery({
    queryKey: ['matinale-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diffusion_logs')
        .select('*')
        .eq('contenu_type', 'matinale')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}
