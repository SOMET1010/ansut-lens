import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PhraseSyntheseProps {
  /** Contexte de la synthèse, ex. « Cette semaine », « 30 j », « Aujourd'hui ». */
  contexte: string;
  /** La phrase de synthèse — un constat lisible en 5 s. ReactNode pour autoriser
   *  une emphase (comptes en gras), jamais une interprétation fabriquée. */
  phrase: ReactNode;
  /** Note de méthode facultative (« Constat d'agrégats mesurés, sans interprétation »). */
  note?: string;
  isLoading?: boolean;
}

/**
 * La SIGNATURE éditoriale de RADAR, commune à tous les écrans.
 *
 * Chaque page « produit » (Ce matin, Acteurs, Insights, Veille, Publier) ouvre
 * sur une même phrase de synthèse : le directeur lit l'essentiel en cinq
 * secondes, puis les tableaux et cartes ne servent qu'à le prouver. C'est ce
 * qui transforme une collection d'écrans en produit d'intelligence éditoriale.
 *
 * Charte : la phrase n'énonce qu'un constat d'agrégats RÉELS. Jamais une
 * causalité, une intention ou un chiffre inventé — l'appelant est responsable
 * de ne composer que du mesuré.
 */
export function PhraseSynthese({ contexte, phrase, note, isLoading }: PhraseSyntheseProps) {
  return (
    <div className="border-l-2 border-primary/40 pl-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/80">
        Synthèse · {contexte}
      </p>
      <div className="mt-1.5">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : (
          <p className="text-base leading-relaxed text-foreground/90 sm:text-lg">{phrase}</p>
        )}
      </div>
      {note && !isLoading && (
        <p className="mt-1.5 text-[11px] text-muted-foreground/70">{note}</p>
      )}
    </div>
  );
}
