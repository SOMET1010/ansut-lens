import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  titre: string | null;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

function parseMessages(json: Json | null): ConversationMessage[] {
  if (!json || !Array.isArray(json)) return [];
  return json.filter(
    (m): m is { role: 'user' | 'assistant'; content: string } =>
      typeof m === 'object' &&
      m !== null &&
      'role' in m &&
      'content' in m &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string'
  );
}

export function useConversationsIA() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations-ia', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('conversations_ia')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(conv => ({
        ...conv,
        messages: parseMessages(conv.messages)
      })) as Conversation[];
    },
    enabled: !!user?.id,
  });

  const createConversation = useMutation({
    mutationFn: async (initialMessages: ConversationMessage[]) => {
      if (!user?.id) throw new Error('Non connecté');
      
      // Generate title from first user message or default
      const firstUserMessage = initialMessages.find(m => m.role === 'user');
      const titre = firstUserMessage 
        ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
        : 'Nouvelle conversation';

      const { data, error } = await supabase
        .from('conversations_ia')
        .insert({
          user_id: user.id,
          titre,
          messages: initialMessages as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        messages: parseMessages(data.messages)
      } as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations-ia'] });
    },
    onError: (error) => {
      console.error('Error creating conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
    },
  });

  const updateConversation = useMutation({
    mutationFn: async ({ id, messages, titre }: { id: string; messages: ConversationMessage[]; titre?: string }) => {
      const updateData: { messages: Json; updated_at: string; titre?: string } = {
        messages: messages as unknown as Json,
        updated_at: new Date().toISOString(),
      };
      
      if (titre) {
        updateData.titre = titre;
      }

      const { data, error } = await supabase
        .from('conversations_ia')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        messages: parseMessages(data.messages)
      } as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations-ia'] });
    },
    onError: (error) => {
      console.error('Error updating conversation:', error);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversations_ia')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations-ia'] });
      toast.success('Conversation supprimée');
    },
    onError: (error) => {
      console.error('Error deleting conversation:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    conversations: conversations || [],
    isLoading,
    createConversation,
    updateConversation,
    deleteConversation,
  };
}
