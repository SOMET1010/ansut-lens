import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  /** Titre de la page, en francais courant. */
  titre: string;
  /**
   * Phrase expliquant ce que l'utilisateur peut faire ici.
   * Obligatoire : l'audit a montre que les titres seuls ne suffisaient pas a
   * situer l'utilisateur dans une application de plus de quarante ecrans.
   */
  description: string;
  icon?: LucideIcon;
  /** Actions principales, alignees a droite sur grand ecran. */
  actions?: React.ReactNode;
  /** Contenu secondaire place sous le titre (filtres, onglets, compteurs). */
  children?: React.ReactNode;
}

/**
 * En-tete de page unique pour toute l'application.
 *
 * Avant la refonte, chaque page composait son propre en-tete avec des tailles
 * de titre, des espacements et des positions d'action differents. Ce composant
 * garantit une structure identique partout : icone, titre, phrase explicative,
 * actions a droite. La coherence de cet element est ce qui permet a
 * l'utilisateur de savoir instantanement ou il se trouve.
 */
export function PageHeader({ titre, description, icon: Icon, actions, children }: PageHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              aria-hidden
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{titre}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
