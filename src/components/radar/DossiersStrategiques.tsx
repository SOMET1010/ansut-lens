import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, HelpCircle, Layers, Megaphone, Radar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { motsClesDetectes, piliersDeLActu } from '@/lib/missions';
import { communicationsRecentesParPilier } from '@/lib/pertinenceAnsut';
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';
import type { Actualite } from '@/types';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';

/**
 * « Axes stratégiques suivis » — section 1 de « Ce matin ».
 *
 * On ne montre plus une pile de publications réseaux triées par date. On montre
 * les AXES de l'ANSUT et, pour chacun, ce qui le fait vivre — en séparant
 * explicitement trois couches :
 *   1. Connaissance : l'axe et son objectif (référentiel).
 *   2. Communication ANSUT : la dernière communication propre encore vivante
 *      (datée réellement, dans son TTL) — sinon rien.
 *   3. Veille externe : le nombre de nouveaux éléments (72 h) qui le touchent.
 *
 * IMPORTANT (règle de preuve) : tant que le VRAI plan stratégique de l'ANSUT
 * n'est pas intégré comme couche de connaissance, ces axes sont un MODÈLE
 * PROVISOIRE. Le système ne doit pas affirmer « les piliers du plan ». La
 * maturité de chaque élément est affichée (validé / déduit) et chaque
 * rattachement est explicable (« Pourquoi ? » : règle de décision, pas seulement
 * mots-clés). Le silence est autorisé.
 */

/**
 * Le vrai plan stratégique n'est pas encore intégré comme base de connaissance
 * structurée (mission → programme → projet → partenaire → objectif → indicateur).
 * Les axes restent donc un modèle de travail provisoire. Passera à `true` le jour
 * où le plan officiel sera intégré et validé — le titre et la maturité
 * basculeront alors automatiquement, sans autre changement.
 */
const PLAN_INTEGRE = false;

interface Props {
  /** Publications ANSUT (fenêtre large ; le TTL décide de ce qui est vivant). */
  publications: PublicationAnsut[];
  /** Veille EXTERNE récente (déjà filtrée hors voix ANSUT, ~72 h). */
  externes: Actualite[];
  /** Horodatage de référence (Date.now()), injecté pour rester testable. */
  maintenantMs: number;
  isLoading?: boolean;
}

const CATEGORIE_LABEL: Record<string, string> = {
  strategique: 'Annonce stratégique',
  evenementiel: 'Événement',
  communautaire: 'Communication',
};

function ageLabel(ageJours: number): string {
  if (ageJours < 1) return 'aujourd’hui';
  if (ageJours < 2) return 'hier';
  return `il y a ${Math.round(ageJours)} j`;
}

/**
 * Fiabilité heuristique d'une déduction par appariement lexical : plus il y a de
 * mots-clés distincts détectés, plus le rattachement est solide. Reste une
 * ESTIMATION (à valider), jamais une certitude.
 */
function fiabiliteLexicale(nbMots: number): number {
  return Math.min(0.95, 0.55 + 0.1 * nbMots);
}

type NiveauMaturite = 'valide' | 'communication' | 'veille' | 'provisoire';

const MATURITE: Record<NiveauMaturite, { couleur: string; texte: string }> = {
  valide: { couleur: 'bg-[hsl(var(--signal-positive))]', texte: 'Validé par document institutionnel' },
  communication: { couleur: 'bg-[hsl(var(--signal-warning))]', texte: 'Déduit des communications ANSUT' },
  veille: { couleur: 'bg-blue-500', texte: 'Déduit de la veille' },
  provisoire: { couleur: 'bg-[hsl(var(--signal-warning))]', texte: 'Modèle provisoire (non validé)' },
};

function Maturite({ niveau }: { niveau: NiveauMaturite }) {
  const cfg = MATURITE[niveau];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.couleur}`} aria-hidden />
      {cfg.texte}
    </span>
  );
}

/** Bulle « Pourquoi ? » exposant la règle de décision (pas seulement les mots). */
function Pourquoi({ lignes }: { lignes: string[] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70 hover:text-primary"
          aria-label="Pourquoi cette information ?"
        >
          <HelpCircle className="h-3 w-3" aria-hidden />
          Pourquoi ?
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <ul className="space-y-1 text-[11px] leading-relaxed">
          {lignes.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export function DossiersStrategiques({ publications, externes, maintenantMs, isLoading }: Props) {
  const commParPilier = useMemo(
    () => communicationsRecentesParPilier(publications ?? [], maintenantMs),
    [publications, maintenantMs],
  );

  // Comptage de la veille externe par pilier (couche « veille »).
  const externesParPilier = useMemo(() => {
    const compte = new Map<string, Actualite[]>();
    for (const a of externes ?? []) {
      for (const id of piliersDeLActu(a)) {
        if (!compte.has(id)) compte.set(id, []);
        compte.get(id)!.push(a);
      }
    }
    return compte;
  }, [externes]);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="dossiers-titre" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="dossiers-titre"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Radar className="h-4 w-4 text-primary" aria-hidden />
            {PLAN_INTEGRE ? 'Dossiers stratégiques de l’ANSUT' : 'Axes stratégiques suivis'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {PLAN_INTEGRE
              ? 'Piliers du Plan Stratégique ANSUT 2026-2030. Rattachements explicables (« Pourquoi ? »).'
              : 'Modèle provisoire, en attendant l’intégration du plan stratégique officiel. Les axes et rattachements sont déduits et explicables (« Pourquoi ? »).'}
          </p>
        </div>
        <Button asChild variant="link" size="sm" className="h-auto shrink-0 p-0">
          <Link to="/communication">
            Notre communication
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      {/* Légende de maturité : distinguer l'officiel de l'interprétation moteur. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Maturité
        </span>
        <Maturite niveau="valide" />
        <Maturite niveau="communication" />
        <Maturite niveau="veille" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MISSIONS_STRATEGIQUES.map((pilier) => {
          const comm = commParPilier.get(pilier.id);
          const nouveaux = externesParPilier.get(pilier.id) ?? [];
          const vivant = Boolean(comm) || nouveaux.length > 0;

          return (
            <div key={pilier.id} className="flex flex-col gap-2.5 rounded-xl border bg-card p-4">
              {/* Couche 1 — Connaissance (axe + objectif). */}
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      vivant ? 'bg-[hsl(var(--signal-positive))]' : 'bg-muted-foreground/30'
                    }`}
                    aria-hidden
                  />
                  <Link
                    to={`/veille?mission=${pilier.id}`}
                    className="text-sm font-semibold leading-tight hover:text-primary"
                  >
                    <span className="text-muted-foreground/70">{pilier.code} · </span>
                    {pilier.nom}
                  </Link>
                </div>
                <p className="mt-1 line-clamp-2 pl-4 text-xs text-muted-foreground">
                  {pilier.objectif}
                </p>
                <div className="mt-1 pl-4">
                  <Maturite niveau={PLAN_INTEGRE ? 'valide' : 'provisoire'} />
                </div>
              </div>

              {/* Couche 2 — Communication ANSUT (datée, vivante). */}
              <div className="flex items-start gap-2 border-t border-border/50 pt-2">
                <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  {comm ? (
                    (() => {
                      const mots = motsClesDetectes(comm.publication.contenu ?? '', pilier.id);
                      const conf = fiabiliteLexicale(mots.length);
                      const dateReelle = comm.publication.date_publication
                        ? format(new Date(comm.publication.date_publication), 'd MMM yyyy', { locale: fr })
                        : 'inconnue';
                      return (
                        <>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                            <span className="font-medium">
                              Communication ANSUT {ageLabel(comm.ageJours)}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {CATEGORIE_LABEL[comm.categorie]}
                            </Badge>
                            <Pourquoi
                              lignes={[
                                `Rattaché à ${pilier.code} — ${pilier.nom} : le contenu mentionne ${
                                  mots.slice(0, 4).map((m) => `« ${m} »`).join(', ') || '—'
                                }.`,
                                'Règle appliquée : appariement lexical au référentiel provisoire (RL-1).',
                                `Fiabilité estimée : ${conf.toFixed(2).replace('.', ',')} (déduction lexicale, à valider).`,
                                `Durée de vie : ${CATEGORIE_LABEL[comm.categorie].toLowerCase()}. Passé ce délai, l’élément nourrit la connaissance mais ne s’affiche plus.`,
                                `Date de publication réelle : ${dateReelle}.`,
                              ]}
                            />
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {nettoyerExtrait(comm.publication.contenu)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Maturite niveau="communication" />
                            {comm.publication.url_original && (
                              <a
                                href={comm.publication.url_original}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                              >
                                Voir la source
                                <ExternalLink className="h-3 w-3" aria-hidden />
                              </a>
                            )}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Aucune communication stratégique récente de l’ANSUT.
                    </p>
                  )}
                </div>
              </div>

              {/* Couche 3 — Veille externe (nouveaux éléments). */}
              <div className="flex items-start gap-2 border-t border-border/50 pt-2">
                <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  {nouveaux.length > 0 ? (
                    <>
                      <Link
                        to={`/veille?mission=${pilier.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {nouveaux.length === 1
                          ? '1 nouvel élément externe (72 h)'
                          : `${nouveaux.length} nouveaux éléments externes (72 h)`}
                      </Link>
                      <div className="mt-1">
                        <Maturite niveau="veille" />
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Aucun changement externe depuis 72 h.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
