import { useState, useEffect } from 'react';
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
  Star
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

// Quadrant options with visual styling
const quadrantOptions = [
  { id: 'tech', label: 'Technologie', icon: Cpu, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500' },
  { id: 'market', label: 'Marché', icon: TrendingUp, colorClass: 'text-green-500', bgClass: 'bg-green-500/10', borderClass: 'border-green-500' },
  { id: 'regulation', label: 'Régulation', icon: Scale, colorClass: 'text-purple-500', bgClass: 'bg-purple-500/10', borderClass: 'border-purple-500' },
  { id: 'reputation', label: 'Réputation', icon: Star, colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500' },
];

// Volume estimation based on criteria
function estimateVolume(keywords: string[], quadrants: string[], importance: number) {
  const keywordScore = keywords.length * 10;
  const quadrantScore = (4 - quadrants.length) * 15;
  const importanceScore = 100 - importance;
  const totalScore = keywordScore + quadrantScore + importanceScore;
  
  if (totalScore < 40) return { level: 1, label: 'Faible (~5/sem)', colorClass: 'bg-yellow-500' };
  if (totalScore < 80) return { level: 2, label: 'Modéré (~15/sem)', colorClass: 'bg-green-500' };
  return { level: 3, label: 'Élevé (~30+/sem)', colorClass: 'bg-orange-500' };
}

// Helper components
function QuadrantButton({ 
  id, 
  label, 
  icon: Icon, 
  colorClass, 
  bgClass,
  borderClass,
  active, 
  onClick 
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
        active 
          ? `${borderClass} ${bgClass} ${colorClass}` 
          : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5 mb-2", active ? colorClass : "")} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function VolumeIndicator({ keywords, quadrants, importance }: { keywords: string[], quadrants: string[], importance: number }) {
  const { level, label, colorClass } = estimateVolume(keywords, quadrants, importance);
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground font-medium">Volume estimé :</span>
      <div className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={cn(
              "w-6 h-1.5 rounded-full transition-colors",
              i <= level ? colorClass : "bg-muted"
            )} 
          />
        ))}
      </div>
      <span className={cn(
        "font-medium",
        level === 1 ? "text-yellow-600" : level === 2 ? "text-green-600" : "text-orange-600"
      )}>
        {label}
      </span>
    </div>
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
      console.error(error);
    }
  };

  const isLoading = createFlux.isPending || updateFlux.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        
        {/* Header distinctif */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {flux ? 'Modifier l\'agent' : 'Configurer un nouvel agent'}
          </DialogTitle>
          <DialogDescription>
            Définissez les paramètres de surveillance pour votre flux de veille.
          </DialogDescription>
        </DialogHeader>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Section 1: Nom du flux */}
          <section className="space-y-2">
            <Label className="font-semibold">Nom du flux</Label>
            <div className="flex gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6" />
              </div>
              <Input 
                placeholder="Ex: Concurrence Fintech, E-Réputation..." 
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
              <Label className="font-semibold flex items-center gap-2">
                <Search className="h-4 w-4" />
                Requête de surveillance
              </Label>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={handleAiGenerate}
                disabled={isGenerating || !formData.nom.trim()}
                className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
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
              className="font-mono text-sm bg-background min-h-[80px]"
              placeholder="Saisissez vos mots-clés (séparés par des virgules) ou laissez l'IA les générer..."
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
            />
            
            {/* Indicateur de volume */}
            <VolumeIndicator 
              keywords={formData.mots_cles} 
              quadrants={formData.quadrants}
              importance={formData.importance_min}
            />
          </section>

          {/* Section 3: Quadrants visuels */}
          <section className="space-y-3">
            <Label className="font-semibold">Quadrants Radar</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <Label className="font-semibold">Seuil d'importance minimum</Label>
              <Badge variant="secondary">≥ {formData.importance_min}%</Badge>
            </div>
            <Slider 
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
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

      </DialogContent>
    </Dialog>
  );
}
