import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Map, BarChart3, TrendingUp, Swords } from 'lucide-react';

const STORAGE_KEY = 'acteurs-tour-dismissed';

/**
 * Presentation des vues de la page Acteurs.
 *
 * Ce panneau decrivait les anciens libelles — « Dashboard SPDI », « Revue
 * Stabilite », « Benchmark » — que la refonte a remplaces. Il contredisait donc
 * l'interface qu'il etait charge d'expliquer, ce qui est pire que l'absence
 * d'aide : l'utilisateur cherchait des onglets inexistants.
 *
 * Les descriptions sont reformulees sans sigle non explique, chaque vue etant
 * presentee par la question a laquelle elle repond.
 */
const VUES = [
  {
    icon: Map,
    label: 'Cartographie',
    desc: 'Qui sont les acteurs du secteur, comment ils se situent les uns par rapport aux autres et quel est leur niveau de proximité avec l’ANSUT.',
  },
  {
    icon: BarChart3,
    label: 'Scores de présence',
    desc: 'À quel point chaque personnalité ou organisation est visible et active en ligne, sur une échelle de 0 à 100.',
  },
  {
    icon: TrendingUp,
    label: 'Revue de stabilité',
    desc: 'Comment ces scores de présence évoluent dans le temps, pour repérer les progressions et les décrochages.',
  },
  {
    icon: Swords,
    label: 'Comparer des acteurs',
    desc: 'Mettre deux acteurs côte à côte pour situer leur influence respective. Accessible par le bouton en haut de la page.',
  },
] as const;

interface ActeursQuickTourProps {
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ActeursQuickTour({ forceOpen, onOpenChange }: ActeursQuickTourProps) {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    /**
     * Cette aide ne s'ouvre plus d'elle-meme.
     *
     * Une fenetre modale surgissant devant un ecran qui n'a pas fini de charger
     * oblige l'utilisateur a la congedier avant d'avoir vu le contenu qu'il
     * venait consulter. Elle reste accessible a la demande, par l'icone d'aide
     * de l'en-tete de page.
     */
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
  }, [forceOpen]);

  const handleClose = (value: boolean) => {
    if (!value) {
      if (dontShow) localStorage.setItem(STORAGE_KEY, 'true');
      setOpen(false);
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open || !!forceOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Comment lire cette page</DialogTitle>
          <DialogDescription>
            Quatre vues répondent chacune à une question différente sur les acteurs du secteur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {VUES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="border-l-2 border-primary/40 pl-3 text-xs text-muted-foreground">
          Les termes techniques employés sur cette page sont définis dans la page Aide et
          glossaire, accessible depuis le menu.
        </p>

        <DialogFooter className="flex-row items-center justify-between gap-4 sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={dontShow} onCheckedChange={(v) => setDontShow(!!v)} />
            <span className="text-xs text-muted-foreground">Ne plus afficher</span>
          </label>
          <Button onClick={() => handleClose(false)} className="min-h-11 sm:min-h-9">
            J’ai compris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
