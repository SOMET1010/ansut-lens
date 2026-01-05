import { useState } from 'react';
import { format, subDays, subMonths } from 'date-fns';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useGenerateNewsletter } from '@/hooks/useNewsletters';
import type { NewsletterPeriode, NewsletterTon, NewsletterCible, Newsletter } from '@/types/newsletter';

interface NewsletterGeneratorProps {
  onGenerated: (newsletter: Newsletter) => void;
}

export function NewsletterGenerator({ onGenerated }: NewsletterGeneratorProps) {
  const [periode, setPeriode] = useState<NewsletterPeriode>('mensuel');
  const [ton, setTon] = useState<NewsletterTon>('pedagogique');
  const [cible, setCible] = useState<NewsletterCible>('general');

  const generateNewsletter = useGenerateNewsletter();

  const handleGenerate = async () => {
    const endDate = new Date();
    const startDate = periode === 'hebdo' ? subDays(endDate, 7) : subMonths(endDate, 1);

    const result = await generateNewsletter.mutateAsync({
      periode,
      ton,
      cible,
      date_debut: format(startDate, 'yyyy-MM-dd'),
      date_fin: format(endDate, 'yyyy-MM-dd'),
    });

    if (result) {
      onGenerated(result);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Nouvelle Newsletter
        </CardTitle>
        <CardDescription>
          Générez une newsletter intelligente basée sur les actualités de veille
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Période */}
        <div className="space-y-3">
          <Label className="text-base font-medium">1. Période</Label>
          <RadioGroup 
            value={periode} 
            onValueChange={(v) => setPeriode(v as NewsletterPeriode)}
            className="grid grid-cols-2 gap-4"
          >
            <Label 
              htmlFor="hebdo" 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                periode === 'hebdo' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="hebdo" id="hebdo" />
              <div>
                <div className="font-medium">Hebdomadaire</div>
                <div className="text-sm text-muted-foreground">7 derniers jours</div>
              </div>
            </Label>
            <Label 
              htmlFor="mensuel" 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                periode === 'mensuel' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="mensuel" id="mensuel" />
              <div>
                <div className="font-medium">Mensuelle</div>
                <div className="text-sm text-muted-foreground">30 derniers jours</div>
              </div>
            </Label>
          </RadioGroup>
        </div>

        {/* Ton */}
        <div className="space-y-3">
          <Label className="text-base font-medium">2. Ton éditorial</Label>
          <RadioGroup 
            value={ton} 
            onValueChange={(v) => setTon(v as NewsletterTon)}
            className="space-y-2"
          >
            <Label 
              htmlFor="pedagogique" 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                ton === 'pedagogique' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="pedagogique" id="pedagogique" />
              <div className="flex-1">
                <div className="font-medium">Pédagogique</div>
                <div className="text-sm text-muted-foreground">Accessible, moderne et vulgarisateur (recommandé)</div>
              </div>
            </Label>
            <Label 
              htmlFor="institutionnel" 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                ton === 'institutionnel' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="institutionnel" id="institutionnel" />
              <div className="flex-1">
                <div className="font-medium">Institutionnel</div>
                <div className="text-sm text-muted-foreground">Formel et officiel</div>
              </div>
            </Label>
            <Label 
              htmlFor="strategique" 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                ton === 'strategique' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="strategique" id="strategique" />
              <div className="flex-1">
                <div className="font-medium">Stratégique</div>
                <div className="text-sm text-muted-foreground">Analytique et orienté décision</div>
              </div>
            </Label>
          </RadioGroup>
        </div>

        {/* Cible */}
        <div className="space-y-3">
          <Label className="text-base font-medium">3. Cible principale</Label>
          <RadioGroup 
            value={cible} 
            onValueChange={(v) => setCible(v as NewsletterCible)}
            className="space-y-2"
          >
            <Label 
              htmlFor="dg_ca" 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                cible === 'dg_ca' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="dg_ca" id="dg_ca" />
              <div className="flex-1">
                <div className="font-medium">DG / Conseil d'Administration</div>
                <div className="text-sm text-muted-foreground">Focus stratégie et indicateurs clés</div>
              </div>
            </Label>
            <Label 
              htmlFor="partenaires" 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                cible === 'partenaires' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="partenaires" id="partenaires" />
              <div className="flex-1">
                <div className="font-medium">Partenaires</div>
                <div className="text-sm text-muted-foreground">Impact et collaboration</div>
              </div>
            </Label>
            <Label 
              htmlFor="general" 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                cible === 'general' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="general" id="general" />
              <div className="flex-1">
                <div className="font-medium">Grand public</div>
                <div className="text-sm text-muted-foreground">Collaborateurs et citoyens</div>
              </div>
            </Label>
          </RadioGroup>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={generateNewsletter.isPending}
          className="w-full"
          size="lg"
        >
          {generateNewsletter.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Générer avec l'IA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
