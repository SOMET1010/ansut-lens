import { useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Megaphone,
  Minus,
  Sparkle,
  Sunrise,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { changementsDuJour, type SensChangement } from '@/lib/changementsDuJour';
import type { Actualite } from '@/types';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';

/**
 * « Ce qui change aujourd'hui » — bloc de tête de « Ce matin ».
 *
 * En quelques lignes, le responsable de la communication comprend la journée en
 * moins de 30 secondes : ce qui monte/baisse dans la veille, s'il y a une
 * nouvelle prise de parole ANSUT, une mention négative. Synthèse, pas liste.
 */

interface Props {
  externes: Actualite[];
  publications: PublicationAnsut[];
  maintenantMs: number;
  isLoading?: boolean;
}

const CFG: Record<SensChangement, { icon: LucideIcon; classe: string }> = {
  hausse: { icon: ArrowUp, classe: 'text-[hsl(var(--signal-positive))]' },
  emergent: { icon: Sparkle, classe: 'text-primary' },
  baisse: { icon: ArrowDown, classe: 'text-amber-600 dark:text-amber-400' },
  disparu: { icon: ArrowDown, classe: 'text-muted-foreground' },
  ansut: { icon: Megaphone, classe: 'text-foreground/70' },
  negatif: { icon: TriangleAlert, classe: 'text-amber-600 dark:text-amber-400' },
  calme: { icon: Minus, classe: 'text-muted-foreground' },
};

export function ChangementsDuJour({ externes, publications, maintenantMs, isLoading }: Props) {
  const changements = useMemo(
    () => changementsDuJour(externes ?? [], publications ?? [], maintenantMs),
    [externes, publications, maintenantMs],
  );

  return (
    <section aria-labelledby="changements-jour-titre" className="space-y-2">
      <h2
        id="changements-jour-titre"
        className="flex items-center gap-2 text-base font-semibold text-foreground"
      >
        <Sunrise className="h-4 w-4 text-primary" aria-hidden />
        Ce qui change aujourd'hui
      </h2>

      {isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="p-4">
            {changements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien de notable depuis hier.</p>
            ) : (
              <ul className="space-y-1.5">
                {changements.map((c, i) => {
                  const cfg = CFG[c.sens];
                  const Icone = cfg.icon;
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.classe}`} aria-hidden />
                      <span>{c.texte}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
