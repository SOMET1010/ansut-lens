import { useEffect, useRef } from 'react';
import { ShieldX, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessDeniedLogger } from '@/hooks/useAccessDeniedLogger';

const AccessDeniedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { logAccessDenied } = useAccessDeniedLogger();
  const hasLogged = useRef(false);
  
  const attemptedPath = location.state?.from || 'cette page';
  const requiredPermission = location.state?.permission;

  useEffect(() => {
    if (!hasLogged.current && attemptedPath !== 'cette page') {
      logAccessDenied(attemptedPath, requiredPermission);
      hasLogged.current = true;
    }
  }, [attemptedPath, requiredPermission, logAccessDenied]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldX className="h-12 w-12 text-destructive" />
            </div>
          </div>
          
          <h1 className="mb-2 text-3xl font-bold text-destructive">403</h1>
          <h2 className="mb-4 text-xl font-semibold">Accès refusé</h2>
          
          <p className="mb-6 text-muted-foreground">
            Vous n'avez pas les permissions nécessaires pour accéder à <span className="font-medium text-foreground">{attemptedPath}</span>.
            Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
          </p>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate('/radar')} className="gap-2">
              <Home className="h-4 w-4" />
              Tableau de bord
            </Button>
            <Button 
              variant="outline" 
              onClick={() => signOut()} 
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Changer de compte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDeniedPage;
