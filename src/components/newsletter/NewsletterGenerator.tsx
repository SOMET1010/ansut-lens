import { useState } from 'react';
import { format, subDays, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Sparkles, 
  Loader2, 
  Calendar, 
  Users, 
  MessageSquare,
  CheckCircle,
  FileText,
  Zap,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGenerateNewsletter } from '@/hooks/useNewsletters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NewsletterPeriode, NewsletterTon, NewsletterCible, Newsletter } from '@/types/newsletter';

interface NewsletterGeneratorProps {
  onGenerated: (newsletter: Newsletter) => void;
}

type GenerationStep = 'config' | 'fetching' | 'analyzing' | 'generating' | 'formatting' | 'saving' | 'done' | 'error';

const stepLabels: Record<GenerationStep, string> = {
  config: 'Configuration',
  fetching: 'Récupération des données',
  analyzing: 'Analyse IA en cours',
  generating: 'Rédaction du contenu',
  formatting: 'Mise en forme HTML',
  saving: 'Sauvegarde',
  done: 'Terminé',
  error: 'Erreur'
};

const stepProgress: Record<GenerationStep, number> = {
  config: 0,
  fetching: 15,
  analyzing: 35,
  generating: 60,
  formatting: 80,
  saving: 95,
  done: 100,
  error: 0
};

export function NewsletterGenerator({ onGenerated }: NewsletterGeneratorProps) {
  const [periode, setPeriode] = useState<NewsletterPeriode>('mensuel');
  const [ton, setTon] = useState<NewsletterTon>('pedagogique');
  const [cible, setCible] = useState<NewsletterCible>('general');
  const [step, setStep] = useState<GenerationStep>('config');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateNewsletter = useGenerateNewsletter();

  // Preview data - count available content
  const endDate = new Date();
  const startDate = periode === 'hebdo' ? subDays(endDate, 7) : subMonths(endDate, 1);

  const { data: previewStats } = useQuery({
    queryKey: ['newsletter-preview-stats', periode],
    queryFn: async () => {
      const [actualitesRes, dossiersRes] = await Promise.all([
        supabase
          .from('actualites')
          .select('id, categorie', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('dossiers')
          .select('id', { count: 'exact' })
          .eq('statut', 'publie')
          .gte('updated_at', startDate.toISOString())
      ]);

      const actualites = actualitesRes.data || [];
      const ansutCount = actualites.filter(a => 
        a.categorie?.toLowerCase().includes('ansut') || 
        a.categorie?.toLowerCase().includes('institutionnel')
      ).length;
      const techCount = actualites.filter(a => 
        a.categorie?.toLowerCase().includes('tech') || 
        a.categorie?.toLowerCase().includes('ia') ||
        a.categorie?.toLowerCase().includes('numér')
      ).length;

      return {
        total: actualitesRes.count || 0,
        ansut: ansutCount,
        tech: techCount,
        dossiers: dossiersRes.count || 0
      };
    },
    staleTime: 30000
  });

  const handleGenerate = async () => {
    setErrorMessage(null);
    
    try {
      // Simulate step progression
      setStep('fetching');
      await new Promise(r => setTimeout(r, 500));
      
      setStep('analyzing');
      await new Promise(r => setTimeout(r, 300));
      
      setStep('generating');
      
      const result = await generateNewsletter.mutateAsync({
        periode,
        ton,
        cible,
        date_debut: format(startDate, 'yyyy-MM-dd'),
        date_fin: format(endDate, 'yyyy-MM-dd'),
      });

      setStep('formatting');
      await new Promise(r => setTimeout(r, 300));
      
      setStep('saving');
      await new Promise(r => setTimeout(r, 200));
      
      setStep('done');

      if (result) {
        setTimeout(() => onGenerated(result), 500);
      }
    } catch (error) {
      setStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  };

  const handleRetry = () => {
    setStep('config');
    setErrorMessage(null);
  };

  const isGenerating = step !== 'config' && step !== 'done' && step !== 'error';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Nouvelle Newsletter IA</CardTitle>
            <CardDescription>
              Génération intelligente basée sur les actualités de veille
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Generation in progress */}
        {isGenerating && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h3 className="text-lg font-semibold">{stepLabels[step]}</h3>
              <p className="text-sm text-muted-foreground">
                {step === 'fetching' && 'Récupération des actualités et dossiers...'}
                {step === 'analyzing' && 'L\'IA analyse le contenu disponible...'}
                {step === 'generating' && 'Rédaction de la newsletter en cours...'}
                {step === 'formatting' && 'Création du template HTML...'}
                {step === 'saving' && 'Enregistrement dans la base...'}
              </p>
            </div>
            
            <Progress value={stepProgress[step]} className="h-2" />
            
            <div className="flex justify-center gap-2 flex-wrap">
              {(['fetching', 'analyzing', 'generating', 'formatting', 'saving'] as GenerationStep[]).map((s, i) => {
                const currentIndex = ['fetching', 'analyzing', 'generating', 'formatting', 'saving'].indexOf(step);
                const stepIndex = i;
                const isComplete = stepIndex < currentIndex;
                const isCurrent = stepIndex === currentIndex;
                
                return (
                  <div 
                    key={s}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isComplete 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : isCurrent 
                          ? 'bg-primary/10 text-primary animate-pulse' 
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isComplete && <CheckCircle className="h-3 w-3" />}
                    {isCurrent && <Loader2 className="h-3 w-3 animate-spin" />}
                    {stepLabels[s]}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error state */}
        {step === 'error' && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-destructive">Erreur de génération</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {errorMessage || 'Une erreur est survenue lors de la génération de la newsletter.'}
              </p>
            </div>
            
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleRetry}>
                Reconfigurer
              </Button>
              <Button onClick={handleGenerate}>
                <Zap className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </div>
        )}

        {/* Configuration form */}
        {step === 'config' && (
          <div className="space-y-8">
            {/* Preview Stats */}
            {previewStats && (
              <div className="bg-accent/30 rounded-xl p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Contenu disponible pour la période</span>
                  <Badge variant="secondary" className="ml-auto">
                    {format(startDate, 'd MMM', { locale: fr })} - {format(endDate, 'd MMM yyyy', { locale: fr })}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-primary">{previewStats.total}</div>
                    <div className="text-xs text-muted-foreground">Actualités</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">{previewStats.ansut}</div>
                    <div className="text-xs text-muted-foreground">ANSUT</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">{previewStats.dossiers}</div>
                    <div className="text-xs text-muted-foreground">Dossiers</div>
                  </div>
                </div>
              </div>
            )}

            {/* Période */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label className="text-base font-semibold">1. Période</Label>
              </div>
              <RadioGroup 
                value={periode} 
                onValueChange={(v) => setPeriode(v as NewsletterPeriode)}
                className="grid grid-cols-2 gap-4"
              >
                <Label 
                  htmlFor="hebdo" 
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    periode === 'hebdo' 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-border hover:bg-accent/50 hover:border-primary/30'
                  }`}
                >
                  <RadioGroupItem value="hebdo" id="hebdo" />
                  <div>
                    <div className="font-semibold">Hebdomadaire</div>
                    <div className="text-sm text-muted-foreground">7 derniers jours</div>
                  </div>
                </Label>
                <Label 
                  htmlFor="mensuel" 
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    periode === 'mensuel' 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-border hover:bg-accent/50 hover:border-primary/30'
                  }`}
                >
                  <RadioGroupItem value="mensuel" id="mensuel" />
                  <div>
                    <div className="font-semibold">Mensuelle</div>
                    <div className="text-sm text-muted-foreground">30 derniers jours</div>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            {/* Ton */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <Label className="text-base font-semibold">2. Ton éditorial</Label>
              </div>
              <RadioGroup 
                value={ton} 
                onValueChange={(v) => setTon(v as NewsletterTon)}
                className="space-y-3"
              >
                {[
                  { value: 'pedagogique', label: 'Pédagogique', desc: 'Accessible, moderne et vulgarisateur', recommended: true },
                  { value: 'institutionnel', label: 'Institutionnel', desc: 'Formel et officiel' },
                  { value: 'strategique', label: 'Stratégique', desc: 'Analytique et orienté décision' }
                ].map(({ value, label, desc, recommended }) => (
                  <Label 
                    key={value}
                    htmlFor={value}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      ton === value 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border hover:bg-accent/50 hover:border-primary/30'
                    }`}
                  >
                    <RadioGroupItem value={value} id={value} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{label}</span>
                        {recommended && (
                          <Badge variant="secondary" className="text-xs">Recommandé</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{desc}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Cible */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <Label className="text-base font-semibold">3. Cible principale</Label>
              </div>
              <RadioGroup 
                value={cible} 
                onValueChange={(v) => setCible(v as NewsletterCible)}
                className="space-y-3"
              >
                {[
                  { value: 'dg_ca', label: 'DG / Conseil d\'Administration', desc: 'Focus stratégie et indicateurs clés' },
                  { value: 'partenaires', label: 'Partenaires', desc: 'Impact et collaboration' },
                  { value: 'general', label: 'Grand public', desc: 'Collaborateurs et citoyens' }
                ].map(({ value, label, desc }) => (
                  <Label 
                    key={value}
                    htmlFor={value}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      cible === value 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border hover:bg-accent/50 hover:border-primary/30'
                    }`}
                  >
                    <RadioGroupItem value={value} id={value} />
                    <div className="flex-1">
                      <div className="font-semibold">{label}</div>
                      <div className="text-sm text-muted-foreground">{desc}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              disabled={generateNewsletter.isPending}
              className="w-full h-14 text-lg font-semibold"
              size="lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Générer avec l'IA
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              ⏱️ Temps estimé : 15-30 secondes • Modèle : Gemini 2.5 Flash
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
