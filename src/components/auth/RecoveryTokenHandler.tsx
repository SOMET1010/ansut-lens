import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface RecoveryTokenHandlerProps {
  children: React.ReactNode;
}

export const RecoveryTokenHandler = ({ children }: RecoveryTokenHandlerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      
      // Si c'est un token de recovery et qu'on n'est pas déjà sur la page de reset
      if (type === 'recovery' && location.pathname !== '/auth/reset-password') {
        console.log('[RecoveryTokenHandler] Token recovery détecté, redirection...');
        navigate(`/auth/reset-password${hash}`, { replace: true });
        return;
      }
    }
    
    setIsChecking(false);
  }, [navigate, location.pathname]);

  // Afficher un loader pendant la vérification pour éviter le flash
  if (isChecking && window.location.hash.includes('type=recovery')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};
