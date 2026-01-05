import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export function useAccessDeniedLogger() {
  const { user, role } = useAuth();

  const logAccessDenied = useCallback(async (attemptedPath: string, requiredPermission?: string) => {
    if (!user) return;

    try {
      await supabase.from('audit_consultations').insert({
        user_id: user.id,
        resource_type: 'route',
        action: 'access_denied',
        metadata: {
          attempted_path: attemptedPath,
          required_permission: requiredPermission,
          user_role: role,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log access denied:', error);
    }
  }, [user, role]);

  return { logAccessDenied };
}
