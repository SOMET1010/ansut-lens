import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export type TonProchaineAction = 'neutre' | 'attention' | 'urgent';

interface ProchaineActionProps {
  /** Ce que l'utilisateur doit faire, formule a l'imperatif. */
  titre: string;
  /** Pourquoi cette action est proposee maintenant. */
  raison: string;
  /** Libelle du bouton, formule comme un verbe d'action. */
  actionLabel: string;
  /** Destination interne du bouton. */
  to: string;
  icon?: LucideIcon;
  ton?: TonProchaineAction;
}

const TONS: Record<TonProchaineAction, { conteneur: string; pastille: string }> = {
  neutre: {
    conteneur: 'border-primary/25 bg-gradient-to-r from-primary/[0.07] to-transparent',
    pastille: 'bg-primary/10 text-primary',
  },
  attention: {
    conteneur: 'border-amber-500/30 bg-gradient-to-r from-amber-500/[0.09] to-transparent',
    pastille: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  urgent: {
    conteneur: 'border-destructive/35 bg-gradient-to-r from-destructive/[0.09] to-transparent',
    pastille: 'bg-destructive/15 text-destructive',
  },
};

/**
 * Bandeau de guidage indiquant la prochaine action attendue.
 *
 * L'audit a montre que l'application presentait beaucoup d'information mais ne
 * disait jamais quoi faire ensuite. Pour un utilisateur qui n'est pas un expert
 * de l'outil, cette absence de direction est le principal facteur d'abandon.
 *
 * Ce composant materialise un fil d'Ariane dynamique : sur chaque ecran, une
 * seule action est mise en avant, accompagnee de la raison pour laquelle elle
 * est proposee. Une seule action a la fois, jamais deux, afin de ne pas
 * reintroduire de choix a faire.
 */
export function ProchaineAction({
  titre,
  raison,
  actionLabel,
  to,
  icon: Icon,
  ton = 'neutre',
}: ProchaineActionProps) {
  const styles = TONS[ton];

  return (
    <section
      aria-labelledby="prochaine-action-titre"
      className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${styles.conteneur}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.pastille}`}
            aria-hidden
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Prochaine action
          </p>
          <h2 id="prochaine-action-titre" className="text-sm font-semibold leading-snug">
            {titre}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{raison}</p>
        </div>
      </div>
      <Button asChild size="sm" className="min-h-11 shrink-0 sm:min-h-9">
        <Link to={to}>
          {actionLabel}
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
