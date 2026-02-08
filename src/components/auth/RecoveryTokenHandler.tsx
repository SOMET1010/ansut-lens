import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface RecoveryTokenHandlerProps {
  children: React.ReactNode;
}

export const RecoveryTokenHandler = ({ children }: RecoveryTokenHandlerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 1. Check hash fragment for recovery token BEFORE Supabase auto-processes it
    const hash = window.location.hash;
    
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery' && location.pathname !== '/auth/reset-password') {
        console.log('[RecoveryTokenHandler] Token recovery détecté dans le hash, redirection...');
        navigate(`/auth/reset-password${hash}`, { replace: true });
        return;
      }
    }

    // 2. Listen for PASSWORD_RECOVERY event from Supabase auth
    // This catches the case where Supabase auto-processes the token before our hash check
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[RecoveryTokenHandler] Événement PASSWORD_RECOVERY détecté, redirection...');
        navigate('/auth/reset-password', { replace: true });
      }
    });

    setIsChecking(false);

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Show loader while checking for recovery token
  if (isChecking && window.location.hash.includes('type=recovery')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};
