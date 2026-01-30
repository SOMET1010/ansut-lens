import { useState } from 'react';
import { Newspaper, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/ui/relative-time';
import { IntelligenceCard } from './IntelligenceCard';
import { Actualite } from '@/types';
import { toast } from 'sonner';

interface IntelligenceFeedProps {
  actualites: Actualite[];
  isLoading?: boolean;
  lastUpdate?: Date | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const INITIAL_DISPLAY_COUNT = 10;

export function IntelligenceFeed({ 
  actualites, 
  isLoading, 
  lastUpdate,
  hasMore = true,
  onLoadMore,
  isLoadingMore
}: IntelligenceFeedProps) {
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  
  const displayedActualites = actualites.slice(0, displayCount);
  const canShowMore = displayCount < actualites.length || hasMore;

  const handleLoadMore = () => {
    if (displayCount < actualites.length) {
      setDisplayCount(prev => prev + 10);
    } else if (onLoadMore) {
      onLoadMore();
    }
  };

  const handleOpenSource = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSave = (actualite: Actualite) => {
    toast.success(`"${actualite.titre.substring(0, 40)}..." sauvegardé`);
  };

  const handleShare = async (actualite: Actualite) => {
    const shareData = {
      title: actualite.titre,
      text: actualite.resume || actualite.titre,
      url: actualite.source_url || window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(actualite.source_url || actualite.titre);
        toast.success('Lien copié dans le presse-papier');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/30 flex justify-between items-center">
          <div className="h-5 bg-muted rounded w-48 animate-pulse" />
          <div className="h-4 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-5 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (actualites.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/30 flex justify-between items-center">
          <h2 className="font-semibold text-foreground">Flux d'Analyse Temps Réel</h2>
        </div>
        <div className="py-16 text-center">
          <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">Aucune actualité récente</p>
          <p className="text-sm text-muted-foreground mt-1">
            Les analyses apparaîtront après la prochaine collecte
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border bg-muted/30 flex justify-between items-center">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          Flux d'Analyse Temps Réel
        </h2>
        {lastUpdate && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            Dernière màj : <RelativeTime date={lastUpdate} />
          </span>
        )}
      </div>

      {/* Feed items */}
      <div className="divide-y divide-border/50">
        {displayedActualites.map((actualite) => (
          <IntelligenceCard
            key={actualite.id}
            actualite={actualite}
            onOpenSource={handleOpenSource}
            onSave={handleSave}
            onShare={handleShare}
          />
        ))}
      </div>

      {/* Load more footer */}
      {canShowMore && (
        <div className="p-4 text-center border-t border-border">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : (
              `Charger plus d'analyses (${actualites.length - displayCount > 0 ? actualites.length - displayCount : '+'} restantes)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
