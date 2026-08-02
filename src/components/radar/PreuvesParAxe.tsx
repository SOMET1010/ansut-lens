import { Link } from 'react-router-dom';
import { ArrowRight, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/ui/relative-time';
import { nettoyerTitre } from '@/lib/nettoyerExtrait';
import { grouperPreuvesParMission } from '@/lib/missions';
import type { Actualite } from '@/types';

/**
 * « Les preuves » — les actualités regroupées sous l'axe stratégique qu'elles
 * impactent. L'article n'est plus un contenu en soi mais la preuve qui alimente
 * la lecture par mission affichée au-dessus. Les sujets sans axe sont réunis en
 * fin de liste sous « Autres sujets ».
 */

/** Nombre d'articles montrés par axe sur l'accueil, pour rester scannable. */
const MAX_PAR_AXE = 3;

interface Props {
  actualites: Actualite[];
  isLoading?: boolean;
}

function LigneArticle({ article }: { article: Actualite }) {
  return (
    <li>
      <Link
        to={`/veille?article=${article.id}`}
        className="flex min-h-11 items-start gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1 space-y-1">
          <span className="line-clamp-2 block text-sm font-medium leading-snug">
            {nettoyerTitre(article.titre)}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {article.source_nom && <span className="truncate">{article.source_nom}</span>}
            {article.date_publication && (
              <>
                <span aria-hidden>·</span>
                <RelativeTime date={article.date_publication} />
              </>
            )}
          </span>
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
      </Link>
    </li>
  );
}

export function PreuvesParAxe({ actualites, isLoading }: Props) {
  const groupes = grouperPreuvesParMission(actualites ?? []);

  return (
    <section aria-labelledby="preuves-titre" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="preuves-titre" className="text-sm font-semibold text-muted-foreground">
            Les preuves, par objectif
          </h2>
          <p className="text-xs text-muted-foreground">
            Les informations rattachées à l’axe stratégique qu’elles impactent.
          </p>
        </div>
        <Button asChild variant="link" size="sm" className="h-auto shrink-0 p-0">
          <Link to="/veille">
            Toute la veille
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : groupes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Newspaper className="h-10 w-10 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Rien de neuf ce matin. Rien de nouveau n’a été collecté sur les dernières 24 heures.
            </p>
            <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-9">
              <Link to="/veille">Voir toute la veille</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groupes.map((groupe, i) => {
            const titre = groupe.mission?.nom ?? 'Autres sujets';
            const cle = groupe.mission?.id ?? 'autres';
            const reste = groupe.articles.length - MAX_PAR_AXE;
            return (
              <div key={cle} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    {titre}
                  </h3>
                  <span className="text-[11px] text-muted-foreground/60">
                    {groupe.articles.length} info{groupe.articles.length > 1 ? 's' : ''}
                  </span>
                </div>
                <ul className="space-y-2">
                  {groupe.articles.slice(0, MAX_PAR_AXE).map((article) => (
                    <LigneArticle key={article.id} article={article} />
                  ))}
                </ul>
                {reste > 0 && groupe.mission && (
                  <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                    <Link to={`/veille?mission=${groupe.mission.id}`}>
                      Voir {reste} information{reste > 1 ? 's' : ''} de plus
                      <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                    </Link>
                  </Button>
                )}
                {i < groupes.length - 1 && <div className="border-t" />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
