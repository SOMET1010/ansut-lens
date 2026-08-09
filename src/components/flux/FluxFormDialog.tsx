import { useState, useEffect, useId } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Zap,
  Sparkles,
  Search,
  Bell,
  Mail,
  Cpu,
  TrendingUp,
  Scale,
  Star,
} from 'lucide-react';
import { FluxVeille, FluxFormData, useCreateFlux, useUpdateFlux } from '@/hooks/useFluxVeille';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FluxFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flux?: FluxVeille | null;
  initialData?: Partial<FluxFormData> | null;
}

// Quadrants Radar : simples catégories sélectionnables. Conformément à la charte
// couleur, la sélection est portée par le bleu de navigation (primary) ; l'état
// non sélectionné reste neutre. Pas de couleur décorative par quadrant.
const quadrantOptions = [
  { id: 'tech', label: 'Technologie', icon: Cpu },
  { id: 'market', label: 'Marché', icon: TrendingUp },
  { id: 'regulation', label: 'Régulation', icon: Scale },
  { id: 'reputation', label: 'Réputation', icon: Star },
];

// Helper components
function QuadrantButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200',
        active
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-muted hover:border-muted-foreground/30 text-muted-foreground',
      )}
    >
      <Icon className="h-5 w-5 mb-2" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function AlertOption({
  icon: Icon, 
  title, 
  description, 
  checked, 
  onChange 
}: { 
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function FluxFormDialog({ open, onOpenChange, flux, initialData }: FluxFormDialogProps) {
  const createFlux = useCreateFlux();
  const updateFlux = useUpdateFlux();

  // Identifiants stables pour associer chaque libellé à son champ (a11y).
  const nomId = useId();
  const requeteId = useId();
  const quadrantsLabelId = useId();
  const importanceId = useId();

  const [formData, setFormData] = useState<FluxFormData>({
    nom: '',
    description: '',
    mots_cles: [],
    categories_ids: [],
    quadrants: [],
    importance_min: 0,
    alerte_email: false,
    alerte_push: true,
    frequence_digest: 'quotidien',
  });

  const [keywordsText, setKeywordsText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset form when flux or initialData changes
  useEffect(() => {
    if (flux) {
      setFormData({
        nom: flux.nom,
        description: flux.description || '',
        mots_cles: flux.mots_cles || [],
        categories_ids: flux.categories_ids || [],
        quadrants: flux.quadrants || [],
        importance_min: flux.importance_min || 0,
        alerte_email: flux.alerte_email,
        alerte_push: flux.alerte_push,
        frequence_digest: flux.frequence_digest,
      });
      setKeywordsText((flux.mots_cles || []).join(', '));
    } else if (initialData) {
      setFormData({
        nom: initialData.nom || '',
        description: initialData.description || '',
        mots_cles: initialData.mots_cles || [],
        categories_ids: initialData.categories_ids || [],
        quadrants: initialData.quadrants || [],
        importance_min: initialData.importance_min || 0,
        alerte_email: initialData.alerte_email ?? false,
        alerte_push: initialData.alerte_push ?? true,
        frequence_digest: initialData.frequence_digest || 'quotidien',
      });
      setKeywordsText((initialData.mots_cles || []).join(', '));
    } else {
      setFormData({
        nom: '',
        description: '',
        mots_cles: [],
        categories_ids: [],
        quadrants: [],
        importance_min: 0,
        alerte_email: false,
        alerte_push: true,
        frequence_digest: 'quotidien',
      });
      setKeywordsText('');
    }
  }, [flux, initialData, open]);

  // Parse keywords from text
  useEffect(() => {
    const keywords = keywordsText
      .split(/[,\n]/)
      .map(k => k.trim())
      .filter(k => k.length > 0);
    setFormData(prev => ({ ...prev, mots_cles: keywords }));
  }, [keywordsText]);

  const handleToggleQuadrant = (quadrant: string) => {
    setFormData(prev => ({
      ...prev,
      quadrants: prev.quadrants.includes(quadrant)
        ? prev.quadrants.filter(q => q !== quadrant)
        : [...prev.quadrants, quadrant],
    }));
  };

  const handleAiGenerate = async () => {
    if (!formData.nom.trim()) {
      toast.error('Entrez un nom de flux pour la génération IA');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generer-requete-flux', {
        body: { 
          nom: formData.nom.trim(), 
          description: formData.description.trim() || undefined 
        }
      });

      if (error) throw error;

      if (data) {
        // Apply AI suggestions
        setKeywordsText(data.mots_cles?.join(', ') || '');
        setFormData(prev => ({
          ...prev,
          mots_cles: data.mots_cles || prev.mots_cles,
          quadrants: data.quadrants || prev.quadrants,
          importance_min: data.importance_min ?? prev.importance_min,
          description: data.description || prev.description,
        }));
        toast.success('Configuration générée par l\'IA !');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Erreur lors de la génération IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nom.trim()) return;

    try {
      if (flux) {
        await updateFlux.mutateAsync({ id: flux.id, data: formData });
      } else {
        await createFlux.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Les hooks (useCreateFlux/useUpdateFlux) affichent déjà un toast d'erreur.
      // On journalise et on GARDE le dialogue ouvert pour que l'utilisateur
      // puisse corriger sa saisie sans tout ressaisir.
      console.error('Enregistrement de la veille échoué :', error);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  const isLoading = createFlux.isPending || updateFlux.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        
        {/* Header distinctif */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {flux ? 'Modifier la veille' : 'Nouvelle veille'}
          </DialogTitle>
          <DialogDescription>
            Définissez les mots-clés et les sources suivis, et le seuil d’alerte.
          </DialogDescription>
        </DialogHeader>

        {/* Corps scrollable — enveloppé dans un <form> pour que Entrée soumette */}
        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Section 1: Nom du flux */}
          <section className="space-y-2">
            <Label htmlFor={nomId} className="font-semibold">Nom du flux</Label>
            <div className="flex gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6" />
              </div>
              <Input
                id={nomId}
                placeholder="Ex : Zones blanches, FTTH & 5G, Réputation ANSUT…"
                className="h-12 text-base"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                autoFocus
              />
            </div>
          </section>

          {/* Section 2: Ciblage IA */}
          <section className="bg-muted/50 rounded-xl p-5 border space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label htmlFor={requeteId} className="font-semibold flex items-center gap-2">
                <Search className="h-4 w-4" />
                Requête de surveillance
              </Label>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={handleAiGenerate}
                disabled={isGenerating || !formData.nom.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Générer avec l'IA
              </Button>
            </div>
            
            {/* Zone de mots-clés avec style terminal */}
            <Textarea
              id={requeteId}
              className="font-mono text-sm bg-background min-h-[80px]"
              placeholder="Saisissez vos mots-clés (séparés par des virgules) ou laissez l'IA les générer..."
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
            />
          </section>

          {/* Section 3: Quadrants visuels */}
          <section className="space-y-3">
            <Label id={quadrantsLabelId} className="font-semibold">Quadrants Radar</Label>
            <div
              role="group"
              aria-labelledby={quadrantsLabelId}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {quadrantOptions.map(q => (
                <QuadrantButton 
                  key={q.id} 
                  {...q} 
                  active={formData.quadrants.includes(q.id)}
                  onClick={() => handleToggleQuadrant(q.id)}
                />
              ))}
            </div>
          </section>

          {/* Section 4: Importance */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor={importanceId} className="font-semibold">Seuil d'importance minimum</Label>
              <Badge variant="secondary">≥ {formData.importance_min}%</Badge>
            </div>
            <Slider
              id={importanceId}
              aria-label="Seuil d'importance minimum"
              value={[formData.importance_min]}
              onValueChange={([value]) => setFormData(prev => ({ ...prev, importance_min: value }))}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Plus le seuil est élevé, moins vous recevrez d'articles (uniquement les plus pertinents).
            </p>
          </section>

          {/* Section 5: Alertes (groupées) */}
          <section className="rounded-xl border p-4 space-y-4">
            <AlertOption 
              icon={Bell}
              title="Notifications en temps réel"
              description="Alerte dans l'app dès qu'un article critique est détecté"
              checked={formData.alerte_push}
              onChange={(checked) => setFormData(prev => ({ ...prev, alerte_push: checked }))}
            />
            
            {formData.alerte_push && (
              <div className="pl-10">
                <RadioGroup 
                  value={formData.frequence_digest}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, frequence_digest: value }))}
                  className="flex flex-wrap gap-4"
                >
                  {[
                    { value: 'instantane', label: 'Instantané' },
                    { value: 'quotidien', label: 'Quotidien' },
                    { value: 'hebdo', label: 'Hebdomadaire' },
                  ].map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <RadioGroupItem value={opt.value} id={`freq-${opt.value}`} />
                      <Label htmlFor={`freq-${opt.value}`} className="text-sm cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
            
            <Separator />
            
            <AlertOption 
              icon={Mail}
              title="Alertes par email"
              description="Recevoir un email pour chaque article critique"
              checked={formData.alerte_email}
              onChange={(checked) => setFormData(prev => ({ ...prev, alerte_email: checked }))}
            />
          </section>

        </div>

        {/* Footer avec CTA fort */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !formData.nom.trim()}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {flux ? 'Mettre à jour' : 'Lancer la surveillance'}
          </Button>
        </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}
