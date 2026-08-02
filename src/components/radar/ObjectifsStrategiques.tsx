import { Link } from 'react-router-dom';
import { ArrowRight, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { nettoyerTitre } from '@/lib/nettoyerExtrait';
import { repartirParMission, type NiveauAttention } from '@/lib/missions';
import type { Actualite } from '@/types';

/**
 * Section « Objectifs stratégiques impactés aujourd'hui ».
 *
 * Remplace les cartes de chiffres bruts sur l'accueil. Plutôt que « voici les
 * actualités », la page répond « voici ce qui bouge sur les missions de
 * l'ANSUT ». Chaque carte de mission indique le nombre d'actualités rattachées,
 * un niveau d'attention et l'information la plus alignée du moment. Les articles
 * eux-mêmes deviennent les preuves, présentées plus bas.
 */

const NIVEAU: Record<NiveauAttention, { libelle: string; pastille: string; texte: string }> = {
  priorite: {
    libelle: 'Priorité',
    pastille: 'bg-[hsl(var(--signal-critical))]',
    texte: 'text-[hsl(var(--signal-critical))]',
  },
  'a-surveiller': {
    libelle: 'À surveiller',
    pastille: 'bg-[hsl(var(--signal-warning))]',
    texte: 'text-[hsl(var(--signal-warning))]',
  },
  'a-noter': {
    libelle: 'À noter',
    pastille: 'bg-[hsl(var(--signal-positive))]',
    texte: 'text-[hsl(var(--signal-positive))]',
  },
  calme: {
    libelle: 'Calme',
    pastille: 'bg-muted-foreground/40',
    texte: 'text-muted-foreground',
  },
};

function phraseVolume(nombre: number): string {
  if (nombre === 0) return 'Rien de nouveau sur cette mission';
  if (nombre === 1) return '1 information rattachée aujourd’hui';
  return `${nombre} informations rattachées aujourd’hui`;
}

interface Props {
  actualites: Actualite[];
  isLoading?: boolean;
}

export function ObjectifsStrategiques({ actualites, isLoading }: Props) {
  const missions = repartirParMission(actualites ?? []);

  return (
    <section aria-labelledby="objectifs-titre" className="space-y-3">
      <div>
        <h2
          id="objectifs-titre"
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
        >
          <Target className="h-4 w-4" aria-hidden />
          Objectifs stratégiques impactés aujourd’hui
        </h2>
        <p className="text-xs text-muted-foreground">
          Ce qui bouge sur les missions de l’ANSUT depuis hier, plutôt qu’une liste d’articles.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {missions.map(({ mission, nombre, niveau, tete }) => {
            const style = NIVEAU[niveau];
            return (
              <Link
                key={mission.id}
                to={`/veille?mission=${mission.id}`}
                className="group flex min-h-11 flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold leading-snug">{mission.nom}</span>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${style.texte}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${style.pastille}`} aria-hidden />
                    {style.libelle}
                  </span>
                </div>

                <span className="mt-2 text-2xl font-bold tabular-nums">{nombre}</span>
                <span className="text-xs text-muted-foreground">{phraseVolume(nombre)}</span>

                {tete ? (
                  <span className="mt-2 line-clamp-2 border-t pt-2 text-xs text-foreground/80">
                    {nettoyerTitre(tete.titre)}
                  </span>
                ) : (
                  <span className="mt-2 border-t pt-2 text-xs text-muted-foreground/70">
                    {mission.objectif}
                  </span>
                )}

                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Ouvrir la mission <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
