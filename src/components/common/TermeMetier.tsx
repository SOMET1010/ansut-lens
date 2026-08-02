import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GLOSSAIRE_INDEX } from '@/config/glossaire';

interface TermeMetierProps {
  /** Cle du terme dans le glossaire (voir src/config/glossaire.ts). */
  cle: string;
  /** Libelle a afficher. Par defaut, le terme officiel du glossaire. */
  children?: React.ReactNode;
  /** Masque l'icone d'aide et ne garde que le soulignement discret. */
  discret?: boolean;
  className?: string;
}

/**
 * Enveloppe un terme metier d'une definition accessible au survol et au clavier.
 *
 * L'audit a montre que la plateforme employait un vocabulaire interne dense
 * (SPDI, quadrant, titrologie, matinale) sans jamais l'expliquer, ce qui
 * obligeait les nouveaux utilisateurs a deviner. Ce composant rend chaque terme
 * auto-explicatif sans alourdir l'interface.
 *
 * Le declencheur est un `<button>` afin d'etre atteignable au clavier : le
 * survol souris ne doit jamais etre le seul moyen d'acceder a une information.
 */
export function TermeMetier({ cle, children, discret = false, className }: TermeMetierProps) {
  const terme = GLOSSAIRE_INDEX[cle];

  // Terme inconnu : on rend le contenu tel quel plutot que de casser l'affichage.
  if (!terme) return <>{children ?? cle}</>;

  const libelle = children ?? terme.terme;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Definition de ${terme.terme}`}
          className={`inline-flex items-center gap-1 underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm ${className ?? ''}`}
        >
          {libelle}
          {!discret && <HelpCircle className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs space-y-1">
        <p className="font-semibold">
          {terme.terme}
          {terme.sigle && (
            <span className="ml-1 font-normal text-muted-foreground">— {terme.sigle}</span>
          )}
        </p>
        <p className="text-xs leading-relaxed">{terme.definition}</p>
      </TooltipContent>
    </Tooltip>
  );
}
