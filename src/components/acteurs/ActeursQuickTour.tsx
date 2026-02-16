import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Map, BarChart3, TrendingUp, Swords } from 'lucide-react';

const STORAGE_KEY = 'acteurs-tour-dismissed';

const TABS_INFO = [
  { icon: Map, label: 'Cartographie', desc: "Vue d'ensemble des acteurs clés, fiches détaillées et filtres avancés." },
  { icon: BarChart3, label: 'Dashboard SPDI', desc: 'Score de présence digitale par acteur, radar et recommandations IA.' },
  { icon: TrendingUp, label: 'Revue Stabilité', desc: 'Comparaison des tendances SPDI entre tous les acteurs.' },
  { icon: Swords, label: 'Benchmark', desc: "Duel d'influence entre deux acteurs sélectionnés." },
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
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setOpen(true);
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
          <DialogTitle className="text-xl">Bienvenue dans Acteurs & Influence</DialogTitle>
          <DialogDescription>
            Cette page regroupe tous les outils d'analyse des acteurs clés en 4 onglets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {TABS_INFO.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
          Astuce : accédez directement à un onglet via l'URL, par exemple{' '}
          <code className="bg-muted px-1 rounded">/acteurs?tab=spdi</code>
        </p>

        <DialogFooter className="flex-row items-center justify-between gap-4 sm:justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={dontShow} onCheckedChange={(v) => setDontShow(!!v)} />
            <span className="text-xs text-muted-foreground">Ne plus afficher</span>
          </label>
          <Button onClick={() => handleClose(false)}>C'est parti !</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
