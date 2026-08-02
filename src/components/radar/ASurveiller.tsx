import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Gauge, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/ui/relative-time';
import { nettoyerTitre } from '@/lib/nettoyerExtrait';
import { alignement, piliersDeLActu } from '@/lib/missions';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { useArticleClusters } from '@/hooks/useArticleClusters';
import type { Actualite, Signal } from '@/types';

/**
 * « À arbitrer » — troisième question de l'accueil : quel sujet mérite une
 * attention humaine ?
 *
 * Ce n'est pas forcément une « alerte critique ». Chaque sujet est présenté avec
 * ce dont un décideur a besoin pour trancher :
 *   - pourquoi il concerne l'ANSUT (et à quel pilier il se rattache) ;
 *   - ce qui est nouveau (fraîcheur) ;
 *   - le niveau de confiance de l'analyse.
 *
 * Les signaux critiques n'apparaissent QU'ICI (plus de triple répétition en haut,
 * dans le briefing et dans la barre d'action).
 */

interface Props {
  actualites: Actualite[];
  signauxCritiques: Signal[];
  /** Piliers actuellement portés par l'ANSUT (pour marquer la priorité). */
  prioritesActives: Set<string>;
  isLoading?: boolean;
}

/** Alignement à partir duquel un article mérite d'être remonté ici. */
const SEUIL_ATTENTION = 65;
const MAX_ITEMS = 3;

function mission(id: string | undefined) {
  return id ? MISSIONS_STRATEGIQUES.find((m) => m.id === id) : undefined;
}

export function ASurveiller({ actualites, signauxCritiques, prioritesActives, isLoading }: Props) {
  // Articles candidats : suffisamment alignés, dédoublonnés par sujet.
  const candidats = useMemo(
    () => (actualites ?? []).filter((a) => alignement(a) >= SEUIL_ATTENTION),
    [actualites],
  );
  const clusters = useArticleClusters(candidats);

  const nbSignaux = (signauxCritiques ?? []).length;
  const articles = clusters
    .map((c) => c.mainArticle as Actualite)
    .slice(0, Math.max(0, MAX_ITEMS - Math.min(nbSignaux, MAX_ITEMS)));

  const rienASignaler = !isLoading && nbSignaux === 0 && articles.length === 0;

  return (
    <section aria-labelledby="a-surveiller-titre" className="space-y-3">
      <div>
        <h2
          id="a-surveiller-titre"
          className="flex items-center gap-2 text-base font-semibold text-foreground"
        >
          <Target className="h-4 w-4 text-primary" aria-hidden />
          À arbitrer
        </h2>
        <p className="text-xs text-muted-foreground">
          Les sujets qui méritent une attention humaine aujourd’hui.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : rienASignaler ? (
        <Card className="border-dashed">
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">
              Aucun sujet ne requiert d’arbitrage particulier ce matin. La surveillance reste
              active.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Signaux critiques — présentés une seule fois, ici. */}
          {(signauxCritiques ?? []).slice(0, MAX_ITEMS).map((signal) => (
            <div
              key={signal.id}
              className="rounded-xl border-2 border-destructive/40 bg-destructive/[0.06] p-4"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <Badge variant="destructive" className="text-[10px]">
                  Signal critique
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  Détecté <RelativeTime date={signal.date_detection} />
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug">{signal.titre}</p>
              {signal.description && (
                <p className="mt-1 text-xs text-muted-foreground">{signal.description}</p>
              )}
              {typeof signal.score_impact === 'number' && signal.score_impact > 0 && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Gauge className="h-3 w-3" aria-hidden /> Impact estimé {signal.score_impact}/100
                </p>
              )}
            </div>
          ))}

          {/* Sujets externes marquants, rattachés à un pilier et sourcés. */}
          {articles.map((a) => {
            const pilierId = piliersDeLActu(a)[0];
            const m = mission(pilierId);
            const estPriorite = pilierId ? prioritesActives.has(pilierId) : false;
            const pourquoi =
              a.pourquoi_important ||
              (m ? `Se rattache à ${m.code} — ${m.nom}, un axe suivi par l’ANSUT.` : null);
            const lien = a.source_url;
            return (
              <div key={a.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {m && (
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-[10px] font-semibold text-primary"
                    >
                      {m.code} · {m.nom}
                    </Badge>
                  )}
                  {estPriorite && (
                    <Badge variant="secondary" className="text-[10px]">
                      Priorité ANSUT active
                    </Badge>
                  )}
                  {typeof a.confiance_ia === 'number' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Gauge className="h-3 w-3" aria-hidden /> Confiance {a.confiance_ia}%
                    </span>
                  )}
                </div>

                {lien ? (
                  <a
                    href={lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-2 flex items-start gap-1.5"
                  >
                    <h3 className="text-sm font-semibold leading-snug group-hover:text-primary">
                      {nettoyerTitre(a.titre)}
                    </h3>
                    <ExternalLink
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </a>
                ) : (
                  <h3 className="mt-2 text-sm font-semibold leading-snug">
                    {nettoyerTitre(a.titre)}
                  </h3>
                )}

                {pourquoi && (
                  <p className="mt-1.5 text-xs text-foreground/80">
                    <span className="font-medium">Pourquoi : </span>
                    {pourquoi}
                  </p>
                )}

                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  <span className="truncate">{a.source_nom ?? 'Source non précisée'}</span>
                  {a.date_publication && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        Nouveau <RelativeTime date={a.date_publication} />
                      </span>
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
