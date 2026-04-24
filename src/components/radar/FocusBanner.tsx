import { Sparkles, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface FocusBannerProps {
  /** Texte recherché venant du Daily Briefing */
  query: string;
  /** Section d'origine (À retenir / Impact SU / Recommandation ANSUT) */
  originLabel?: string;
  /** Nb de résultats correspondants après filtrage */
  matchCount?: number;
}

/**
 * Bandeau affiché en haut d'une page quand l'utilisateur arrive
 * depuis un lien "Voir le détail" du Daily Briefing.
 * Met en avant le contexte et propose de retirer le filtre.
 */
export function FocusBanner({ query, originLabel, matchCount }: FocusBannerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const clearFocus = () => {
    const params = new URLSearchParams(location.search);
    params.delete('q');
    params.delete('focus');
    const next = params.toString();
    navigate(`${location.pathname}${next ? `?${next}` : ''}`, { replace: true });
  };

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/[0.08] via-primary/[0.04] to-transparent p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-primary">
              Vu depuis le Briefing du jour
            </span>
            {originLabel && (
              <span className="text-[11px] text-muted-foreground">· {originLabel}</span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground mt-1 line-clamp-2">
            « {query} »
          </p>
          {typeof matchCount === 'number' && (
            <p className="text-xs text-muted-foreground mt-1">
              {matchCount === 0
                ? 'Aucun résultat exact — affichage de l’ensemble ci-dessous.'
                : `${matchCount} résultat${matchCount > 1 ? 's' : ''} mis en évidence`}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFocus}
          className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-3.5 w-3.5 mr-1" /> Tout afficher
        </Button>
      </div>
    </div>
  );
}
