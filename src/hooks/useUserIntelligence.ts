import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useRef } from 'react';

// Track a user interaction (debounced)
export function useTrackInteraction() {
  const { user } = useAuth();
  const lastTrack = useRef<string>('');

  return useCallback(
    async (resourceType: string, resourceId: string, action: string = 'view', metadata: Record<string, any> = {}) => {
      if (!user) return;
      
      // Deduplicate rapid-fire events
      const key = `${resourceType}-${resourceId}-${action}`;
      if (lastTrack.current === key) return;
      lastTrack.current = key;
      setTimeout(() => { if (lastTrack.current === key) lastTrack.current = ''; }, 5000);

      try {
        await supabase.from('user_interactions').insert({
          user_id: user.id,
          resource_type: resourceType,
          resource_id: resourceId,
          action,
          metadata,
        });
      } catch (e) {
        console.error('Track error:', e);
      }
    },
    [user]
  );
}

// Get/manage user preferences
export function useUserPreferencesIA() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-preferences-ia', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_preferences_ia')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Submit feedback on an actualite
export function useActualiteFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ actualiteId, feedback, raison }: { actualiteId: string; feedback: string; raison?: string }) => {
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('actualites_feedback')
        .upsert({
          user_id: user.id,
          actualite_id: actualiteId,
          feedback,
          raison,
        }, { onConflict: 'user_id,actualite_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actualites-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

// Get user's feedback for a list of actualites
export function useMyFeedback() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['actualites-feedback', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data, error } = await supabase
        .from('actualites_feedback')
        .select('actualite_id, feedback')
        .eq('user_id', user.id);
      if (error) throw error;

      const map: Record<string, string> = {};
      (data || []).forEach((f) => { map[f.actualite_id] = f.feedback; });
      return map;
    },
    enabled: !!user,
  });
}

// Get AI-powered recommendations
export function useRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.functions.invoke('profil-veille', {
        body: { mode: 'recommend' },
      });
      if (error) throw error;
      return data?.recommendations || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

// Generate/refresh user profile
export function useGenerateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('profil-veille', {
        body: { mode: 'profile' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences-ia'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}
