import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdateProfileData {
  full_name?: string;
  avatar_url?: string;
  department?: string;
}

export function useUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Profil mis à jour', { description: 'Vos modifications ont été enregistrées.' });
    },
    onError: (error) => {
      toast.error('Erreur', { description: 'Impossible de mettre à jour le profil.' });
      console.error('Update profile error:', error);
    },
  });

  const uploadAvatar = async (file: File) => {
    if (!user?.id) throw new Error('Non authentifié');

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const filePath = `${user.id}/avatar.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error('Erreur', { description: "Impossible d'uploader l'image." });
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Add cache buster to force refresh
    const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

    // Update profile with new avatar URL
    await updateProfileMutation.mutateAsync({ avatar_url: urlWithCacheBuster });

    return urlWithCacheBuster;
  };

  return {
    profile,
    isLoading,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    uploadAvatar,
  };
}
