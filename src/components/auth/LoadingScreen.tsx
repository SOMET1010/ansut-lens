import logoAnsut from '@/assets/logo-ansut.jpg';
import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
      <div className="flex flex-col items-center gap-6">
        <img 
          src={logoAnsut} 
          alt="ANSUT" 
          className="h-16 w-auto rounded-lg shadow-lg"
        />
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Vérification de l'accès...</span>
        </div>
      </div>
    </div>
  );
}
