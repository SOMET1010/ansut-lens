import { useState } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

interface SectionRepliableProps {
  titre: string;
  /** Precision affichee a cote du titre (nombre d'elements, periode). */
  indication?: string;
  icon?: LucideIcon;
  /** Ouverte par defaut. Sur mobile, preferer `false` pour les analyses. */
  defautOuvert?: boolean;
  /**
   * Point de rupture au-dela duquel la section est toujours affichee sans
   * mecanisme de pliage. Permet de replier sur mobile tout en gardant un
   * affichage classique sur grand ecran.
   */
  toujoursOuvertDes?: 'md' | 'lg' | 'xl' | 'jamais';
  children: React.ReactNode;
}

/**
 * Section repliable, utilisee pour rendre accessible sur mobile un contenu
 * qui etait auparavant purement masque.
 *
 * L'audit a releve vingt-trois blocs supprimes en dessous du point de rupture
 * `lg` (barre laterale analytique, titrologie, colonnes de tableaux). La
 * strategie de masquage privait l'utilisateur mobile d'information au lieu de
 * la reorganiser. Ce composant la restitue sous forme repliee : presente mais
 * non envahissante.
 */
export function SectionRepliable({
  titre,
  indication,
  icon: Icon,
  defautOuvert = false,
  toujoursOuvertDes = 'lg',
  children,
}: SectionRepliableProps) {
  const [ouvert, setOuvert] = useState(defautOuvert);

  const classesEntete =
    toujoursOuvertDes === 'jamais'
      ? 'flex'
      : toujoursOuvertDes === 'md'
        ? 'flex md:hidden'
        : toujoursOuvertDes === 'xl'
          ? 'flex xl:hidden'
          : 'flex lg:hidden';

  const classesContenu =
    toujoursOuvertDes === 'jamais'
      ? ouvert
        ? 'block'
        : 'hidden'
      : toujoursOuvertDes === 'md'
        ? ouvert
          ? 'block'
          : 'hidden md:block'
        : toujoursOuvertDes === 'xl'
          ? ouvert
            ? 'block'
            : 'hidden xl:block'
          : ouvert
            ? 'block'
            : 'hidden lg:block';

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setOuvert((precedent) => !precedent)}
        aria-expanded={ouvert}
        className={`${classesEntete} min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2.5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
          <span className="truncate text-sm font-semibold">{titre}</span>
          {indication && (
            <span className="shrink-0 text-xs text-muted-foreground">{indication}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${ouvert ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <div className={classesContenu}>{children}</div>
    </section>
  );
}
