import { Briefcase, ShieldAlert } from 'lucide-react';
import { Actualite, Signal } from '@/types';

interface DailyBriefingProps {
  actualites: Actualite[];
  signaux: Signal[];
  isLoading?: boolean;
}

export function DailyBriefing({ actualites, signaux, isLoading }: DailyBriefingProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/20" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-primary/10 rounded w-40" />
            <div className="h-4 bg-primary/10 rounded w-full" />
            <div className="h-4 bg-primary/10 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  const criticalAlerts = signaux.filter(s => s.niveau === 'critical');
  const topArticles = actualites.slice(0, 3);
  
  // Generate briefing summary
  const generateSummary = () => {
    if (topArticles.length === 0) {
      return "Aucun sujet majeur détecté sur la période. Le système de veille continue de surveiller les sources.";
    }
    
    const subjects = topArticles.map(a => {
      // Extract first part of title (before : or -)
      const cleanTitle = a.titre.split(/[:\-–]/)[0].trim();
      return cleanTitle.length > 50 ? cleanTitle.substring(0, 50) + '...' : cleanTitle;
    });
    
    return `${topArticles.length} sujet${topArticles.length > 1 ? 's' : ''} majeur${topArticles.length > 1 ? 's' : ''} : ${subjects.join(', ')}.`;
  };

  const alertMessage = criticalAlerts.length > 0 
    ? `Attention : ${criticalAlerts.length} alerte${criticalAlerts.length > 1 ? 's' : ''} critique${criticalAlerts.length > 1 ? 's' : ''} en cours.`
    : null;

  return (
    <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
            📍 Briefing du jour
          </h2>
          
          <p className="text-foreground leading-relaxed">
            {generateSummary()}
          </p>
          
          {alertMessage && (
            <p className="mt-2 text-signal-critical font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              {alertMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
