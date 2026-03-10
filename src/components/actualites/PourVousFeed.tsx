import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingUp, ExternalLink } from 'lucide-react';
import { useRecommendations, useTrackInteraction } from '@/hooks/useUserIntelligence';
import { FeedbackButtons } from './FeedbackButtons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function PourVousFeed() {
  const { data: recommendations, isLoading } = useRecommendations();
  const trackInteraction = useTrackInteraction();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className="glass">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-primary/50 mb-4" />
          <h3 className="font-semibold mb-2">Vos recommandations arrivent</h3>
          <p className="text-sm text-muted-foreground">
            Continuez à consulter les actualités et donner votre feedback — RADAR apprend de vos préférences.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Priorités IA — personnalisées pour vous</span>
        <Badge variant="secondary" className="text-xs">{recommendations.length}</Badge>
      </div>

      {recommendations.map((item: any) => (
        <Card
          key={item.id}
          className="glass hover:shadow-md transition-all cursor-pointer group"
          onClick={() => {
            trackInteraction('actualite', item.id, 'click', { source: 'pour_vous', categorie: item.categorie });
          }}
        >
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className={`text-xs font-bold rounded-full h-8 w-8 flex items-center justify-center ${
                  item.score_personnalise >= 70
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : item.score_personnalise >= 50
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {item.score_personnalise}
                </div>
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {item.titre}
                  </h4>
                  <FeedbackButtons actualiteId={item.id} compact />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.resume}</p>
                <div className="flex items-center gap-2 mt-2">
                  {item.categorie && (
                    <Badge variant="outline" className="text-xs">{item.categorie}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {item.date_publication && formatDistanceToNow(new Date(item.date_publication), { addSuffix: true, locale: fr })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
