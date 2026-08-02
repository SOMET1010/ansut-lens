import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Layers, Sparkle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/ui/relative-time';
import { nettoyerTitre } from '@/lib/nettoyerExtrait';
import { piliersDeLActu, toucheUnPilier } from '@/lib/missions';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { useArticleClusters } from '@/hooks/useArticleClusters';
import type { Actualite } from '@/types';

/**
 * « Ce qui a changé depuis hier » — deuxième question de l'accueil.
 *
 * On ne remonte PAS tout le flux de presse : uniquement les nouveaux éléments
 * externes (24 h) qui touchent un thème que l'ANSUT porte activement. Les
 * couvertures multiples d'un même sujet (p. ex. trois dépêches cyber) sont
 * regroupées en une seule ligne, pour que le volume des sources ne fasse pas
 * passer un sujet pour majeur. Le détail exhaustif reste sur la page Veille.
 */

interface Props {
  actualites: Actualite[];
  /** Piliers actuellement portés par l'ANSUT (ADN ou repli porteurs). */
  prioritesActives: Set<string>;
  isLoading?: boolean;
}

const MAX_LIGNES = 5;

function codePilier(id: string | undefined): string | null {
  if (!id) return null;
  return MISSIONS_STRATEGIQUES.find((m) => m.id === id)?.code ?? null;
}

export function ChangementsDepuisHier({ actualites, prioritesActives, isLoading }: Props) {
  // 1) Ne garder que ce qui touche une priorité active de l'ANSUT.
  const pertinents = useMemo(
    () => (actualites ?? []).filter((a) => toucheUnPilier(a, prioritesActives)),
    [actualites, prioritesActives],
  );

  // 2) Dédoublonner les couvertures d'un même sujet.
  const clusters = useArticleClusters(pertinents);
  const lignes = clusters.slice(0, MAX_LIGNES);

  return (
    <section aria-labelledby="changements-titre" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="changements-titre"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Sparkle className="h-4 w-4 text-primary" aria-hidden />
            Ce qui a changé depuis hier
          </h2>
          <p className="text-xs text-muted-foreground">
            Nouvelles informations externes des dernières 24 h, sur les thèmes que l’ANSUT porte.
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : lignes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">
              Rien de nouveau depuis hier sur les priorités actuelles de l’ANSUT.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {lignes.map((cluster) => {
            const a = cluster.mainArticle as Actualite;
            const code = codePilier(piliersDeLActu(a)[0]);
            const couvertures = cluster.relatedArticles.length;
            const lien = a.source_url;
            const contenu = (
              <div className="flex items-start gap-3">
                {code && (
                  <Badge
                    variant="outline"
                    className="mt-0.5 shrink-0 border-primary/30 text-[10px] font-semibold text-primary"
                  >
                    {code}
                  </Badge>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{nettoyerTitre(a.titre)}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="truncate">{a.source_nom ?? 'Source non précisée'}</span>
                    {a.date_publication && (
                      <>
                        <span aria-hidden>·</span>
                        <RelativeTime date={a.date_publication} />
                      </>
                    )}
                    {couvertures > 0 && (
                      <span className="inline-flex items-center gap-1 text-primary/80">
                        <Layers className="h-3 w-3" aria-hidden />
                        {couvertures === 1
                          ? '1 autre couverture'
                          : `${couvertures} autres couvertures`}
                      </span>
                    )}
                  </p>
                </div>
                {lien && (
                  <ExternalLink
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </div>
            );
            return (
              <li key={a.id}>
                {lien ? (
                  <a
                    href={lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/25"
                  >
                    {contenu}
                  </a>
                ) : (
                  <Link
                    to={`/veille?article=${a.id}`}
                    className="block rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/25"
                  >
                    {contenu}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
