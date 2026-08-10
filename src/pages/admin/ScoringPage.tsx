import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sliders, RotateCcw, Save, AlertTriangle } from 'lucide-react';
import {
  useScoringSettings,
  useUpdateScoringSettings,
  DEFAULT_SCORING,
  type ScoringSettings,
} from '@/hooks/useScoringSettings';

export default function ScoringPage() {
  const { data, isLoading } = useScoringSettings();
  const update = useUpdateScoringSettings();
  const [form, setForm] = useState<ScoringSettings>(DEFAULT_SCORING);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const setField = <K extends keyof ScoringSettings>(k: K, v: ScoringSettings[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const numField = (k: keyof ScoringSettings, label: string, hint?: string, min = 0, max = 100, step = 1) => (
    <div className="space-y-1">
      <Label htmlFor={k} className="text-sm">{label}</Label>
      <Input
        id={k}
        type="number"
        min={min}
        max={max}
        step={step}
        value={form[k] as number}
        onChange={e => setField(k, Number(e.target.value))}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  const ordreInvalide = form.threshold_rouge <= form.threshold_orange
    || form.threshold_orange <= form.threshold_vert;

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Sliders className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Règles de scoring & seuils</h1>
          <p className="text-sm text-muted-foreground">
            Ajustez l'intelligence exécutive (Matinale, Briefing, Radar) sans modifier le code.
          </p>
        </div>
      </div>

      {ordreInvalide && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          L'ordre doit être : ROUGE &gt; ORANGE &gt; VERT.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seuils de criticité</CardTitle>
          <CardDescription>
            Score d'impact (0–100) à partir duquel un signal est classé dans chaque niveau.
            En dessous du seuil VERT, le signal est noté <Badge variant="secondary">BLEU</Badge>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {numField('threshold_rouge', '🔴 Seuil ROUGE', 'Décision DG sous 24h')}
          {numField('threshold_orange', '🟠 Seuil ORANGE', 'Vigilance, instruction CODIR')}
          {numField('threshold_vert', '🟢 Seuil VERT', 'Suivi standard')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pertinence & filtrage</CardTitle>
          <CardDescription>Score minimal pour qu'un signal soit retenu dans les analyses.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {numField('pertinence_min', 'Pertinence minimale', 'Items en deçà : ignorés', 0, 100)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Volumes minimaux (Matinale CODIR)</CardTitle>
          <CardDescription>
            Si l'IA produit moins, des fallback sectoriels complètent automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {numField('min_signaux_total', 'Signaux exploités (cible)', 'Pour rapport "Bonne qualité"', 0, 100)}
          {numField('min_actions_immediates', 'Actions immédiates', '', 0, 10)}
          {numField('min_signaux_faibles', 'Signaux faibles', '', 0, 10)}
          {numField('min_synthese_60s', 'Synthèse 60s', '', 0, 10)}
          {numField('min_impact_projets', 'Impact projets ANSUT', '', 0, 10)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pondérations indicateur qualité</CardTitle>
          <CardDescription>
            Poids de chaque type de signal dans le calcul du score qualité du livrable.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {numField('weight_press', 'Presse vérifiée', '', 0, 5, 0.1)}
          {numField('weight_synthese', 'Synthèse 60s', '', 0, 5, 0.1)}
          {numField('weight_pilier', 'Veille par pilier', '', 0, 5, 0.1)}
          {numField('weight_signaux_faibles', 'Signaux faibles', '', 0, 5, 0.1)}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setForm(DEFAULT_SCORING)}
          disabled={isLoading || update.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
        <Button
          onClick={() => update.mutate(form)}
          disabled={isLoading || update.isPending || ordreInvalide}
        >
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
