import { useState } from 'react';
import { Calendar, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGenerateNewsletter } from '@/hooks/useNewsletters';
import { getWeek } from 'date-fns';

interface NewsletterWidgetProps {
  onGenerate?: () => void;
}

export function NewsletterWidget({ onGenerate }: NewsletterWidgetProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const generateNewsletter = useGenerateNewsletter();

  // Fetch preview stats
  const { data: previewStats } = useQuery({
    queryKey: ['newsletter-preview-stats'],
    queryFn: async () => {
      // Count actualites from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const [actualitesResult, destinatairesResult] = await Promise.all([
        supabase
          .from('actualites')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('newsletter_destinataires')
          .select('id', { count: 'exact', head: true })
          .eq('actif', true)
      ]);

      return {
        actualites: actualitesResult.count || 0,
        destinataires: destinatairesResult.count || 0
      };
    },
    staleTime: 60000, // 1 minute
  });

  const weekNumber = getWeek(new Date());

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      await generateNewsletter.mutateAsync({
        periode: 'hebdo',
        date_debut: sevenDaysAgo.toISOString().split('T')[0],
        date_fin: today.toISOString().split('T')[0],
        cible: 'dg_ca',
        ton: 'strategique'
      });
      
      onGenerate?.();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-lg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        {/* Week indicator */}
        <div className="flex items-center gap-2 mb-2 opacity-80 text-sm font-medium">
          <Calendar className="h-4 w-4" />
          Semaine {weekNumber}
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-bold mb-4">
          La Newsletter est prête à être générée.
        </h3>
        
        {/* Stats */}
        <p className="text-sm opacity-80 mb-6 leading-relaxed">
          L'IA a sélectionné{' '}
          <span className="font-bold">{previewStats?.actualites || '...'} articles</span> pertinents 
          pour votre audience de{' '}
          <span className="font-bold">{previewStats?.destinataires || '...'} décideurs</span>.
        </p>
        
        {/* Generate button */}
        <Button 
          onClick={handleGenerate}
          disabled={isGenerating || generateNewsletter.isPending}
          className="w-full py-3 bg-background text-primary font-bold shadow-md hover:shadow-lg hover:bg-background/90 transition-all"
        >
          {isGenerating || generateNewsletter.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2 text-orange-500" />
              Générer le brouillon
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
