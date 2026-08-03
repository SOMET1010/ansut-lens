import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { analyserCommunication, type TypeSignalCom } from '@/lib/analyseCommunication';
import type { Actualite } from '@/types';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';

/**
 * « Analyse — notre communication vs écosystème » — la couche de valeur de
 * RADAR. Elle compare ce que l'ANSUT met en avant et ce dont parle l'écosystème,
 * et en tire des observations utiles à la communication (opportunités, écho
 * faible, convergences, risques réputationnels). Le moteur observe et suggère,
 * il ne décide pas et ne pilote rien.
 *
 * Section AJOUTÉE (progressive) : elle ne remplace pas encore les sections
 * existantes.
 */

interface Props {
  publications: PublicationAnsut[];
  externes: Actualite[];
  isLoading?: boolean;
}

const CONFIG: Record<
  TypeSignalCom,
  { icon: LucideIcon; libelle: string; classe: string }
> = {
  risque: {
    icon: AlertTriangle,
    libelle: 'Signal réputationnel à examiner',
    classe: 'text-amber-600 dark:text-amber-400',
  },
  opportunite: {
    icon: TrendingUp,
    libelle: 'Opportunité de prise de parole',
    classe: 'text-primary',
  },
  convergence: {
    icon: ArrowLeftRight,
    libelle: 'Convergence',
    classe: 'text-muted-foreground',
  },
  'echo-faible': {
    icon: TrendingDown,
    libelle: 'Écho faible',
    classe: 'text-amber-600 dark:text-amber-400',
  },
};

export function AnalyseCommunication({ publications, externes, isLoading }: Props) {
  const signaux = useMemo(
    () => analyserCommunication(publications ?? [], externes ?? []),
    [publications, externes],
  );

  return (
    <section aria-labelledby="analyse-com-titre" className="space-y-3">
      <div>
        <h2
          id="analyse-com-titre"
          className="flex items-center gap-2 text-base font-semibold text-foreground"
        >
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Analyse — notre communication vs écosystème
        </h2>
        <p className="text-xs text-muted-foreground">
          Ce que le moteur observe en comparant la communication de l’ANSUT et la veille externe.
          Il observe et suggère — il ne décide pas.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : signaux.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">
              Données insuffisantes pour une analyse fiable aujourd’hui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {signaux.map((s) => {
            const cfg = CONFIG[s.type];
            const Icone = cfg.icon;
            // Vocabulaire réputationnel PROGRESSIF, reflétant le niveau de
            // certitude : le mot « risque » est réservé à des signaux multiples.
            const libelle =
              s.type === 'risque'
                ? s.negatifsEcosysteme <= 1
                  ? 'Mention négative détectée'
                  : s.negatifsEcosysteme <= 3
                    ? 'Signal réputationnel à examiner'
                    : 'Sujet sensible à surveiller'
                : cfg.libelle;
            return (
              <li key={s.pilierId} className="rounded-lg border bg-card p-3">
                <div className="flex items-start gap-2.5">
                  <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.classe}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-xs font-semibold ${cfg.classe}`}>{libelle}</span>
                      <span className="text-[11px] text-muted-foreground/70" title={`${s.code} — ${s.nom}`}>
                        {s.nomCourt}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{s.observation}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
