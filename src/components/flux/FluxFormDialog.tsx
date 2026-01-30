import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { FluxVeille, FluxFormData, useCreateFlux, useUpdateFlux } from '@/hooks/useFluxVeille';
import { useCategoriesVeille } from '@/hooks/useMotsClesVeille';

interface FluxFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flux?: FluxVeille | null;
  initialData?: Partial<FluxFormData> | null;
}

const quadrantOptions = [
  { id: 'tech', label: 'Technologie', color: 'bg-blue-500' },
  { id: 'regulation', label: 'Régulation', color: 'bg-purple-500' },
  { id: 'market', label: 'Marché', color: 'bg-green-500' },
  { id: 'reputation', label: 'Réputation', color: 'bg-orange-500' },
];

export function FluxFormDialog({ open, onOpenChange, flux, initialData }: FluxFormDialogProps) {
  const { data: categories } = useCategoriesVeille();
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
    frequence_digest: 'instantane',
  });

  const [keywordInput, setKeywordInput] = useState('');

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
        frequence_digest: initialData.frequence_digest || 'instantane',
      });
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
        frequence_digest: 'instantane',
      });
    }
    setKeywordInput('');
  }, [flux, initialData, open]);

  const handleAddKeyword = () => {
    const keywords = keywordInput.split(',').map(k => k.trim()).filter(k => k);
    if (keywords.length > 0) {
      setFormData(prev => ({
        ...prev,
        mots_cles: [...new Set([...prev.mots_cles, ...keywords])],
      }));
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      mots_cles: prev.mots_cles.filter(k => k !== keyword),
    }));
  };

  const handleToggleCategory = (catId: string) => {
    setFormData(prev => ({
      ...prev,
      categories_ids: prev.categories_ids.includes(catId)
        ? prev.categories_ids.filter(id => id !== catId)
        : [...prev.categories_ids, catId],
    }));
  };

  const handleToggleQuadrant = (quadrant: string) => {
    setFormData(prev => ({
      ...prev,
      quadrants: prev.quadrants.includes(quadrant)
        ? prev.quadrants.filter(q => q !== quadrant)
        : [...prev.quadrants, quadrant],
    }));
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {flux ? 'Modifier le flux' : 'Créer un flux de veille'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du flux *</Label>
            <Input
              id="nom"
              placeholder="Ex: Cybersécurité Afrique"
              value={formData.nom}
              onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez ce flux..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Mots-clés */}
          <div className="space-y-2">
            <Label>Mots-clés personnalisés</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter des mots-clés (séparés par des virgules)"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
              />
              <Button type="button" variant="secondary" onClick={handleAddKeyword}>
                Ajouter
              </Button>
            </div>
            {formData.mots_cles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.mots_cles.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1">
                    {kw}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveKeyword(kw)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Catégories de veille */}
          <div className="space-y-2">
            <Label>Catégories de veille</Label>
            <div className="grid grid-cols-2 gap-2">
              {categories?.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={formData.categories_ids.includes(cat.id)}
                    onCheckedChange={() => handleToggleCategory(cat.id)}
                  />
                  <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">
                    {cat.nom}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Quadrants */}
          <div className="space-y-2">
            <Label>Quadrants Radar</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quadrantOptions.map((q) => (
                <div key={q.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`quad-${q.id}`}
                    checked={formData.quadrants.includes(q.id)}
                    onCheckedChange={() => handleToggleQuadrant(q.id)}
                  />
                  <Label htmlFor={`quad-${q.id}`} className="text-sm cursor-pointer flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${q.color}`} />
                    {q.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Importance minimum */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Importance minimum</Label>
              <span className="text-sm text-muted-foreground">{formData.importance_min}%</span>
            </div>
            <Slider
              value={[formData.importance_min]}
              onValueChange={([value]) => setFormData(prev => ({ ...prev, importance_min: value }))}
              max={100}
              step={5}
            />
          </div>

          {/* Notifications */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base">Notifications</Label>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="alerte_push"
                checked={formData.alerte_push}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alerte_push: !!checked }))}
              />
              <Label htmlFor="alerte_push" className="cursor-pointer">
                Notifications dans l'application
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="alerte_email"
                checked={formData.alerte_email}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alerte_email: !!checked }))}
              />
              <Label htmlFor="alerte_email" className="cursor-pointer">
                Alertes par email
              </Label>
            </div>

            {formData.alerte_push && (
              <div className="space-y-2 pl-6">
                <Label className="text-sm">Fréquence</Label>
                <RadioGroup
                  value={formData.frequence_digest}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, frequence_digest: value }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="instantane" id="freq-instant" />
                    <Label htmlFor="freq-instant" className="text-sm cursor-pointer">Instantané</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="quotidien" id="freq-daily" />
                    <Label htmlFor="freq-daily" className="text-sm cursor-pointer">Quotidien</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="hebdo" id="freq-weekly" />
                    <Label htmlFor="freq-weekly" className="text-sm cursor-pointer">Hebdomadaire</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.nom.trim()}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {flux ? 'Mettre à jour' : 'Créer le flux'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
