import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Megaphone, Newspaper, Users, AlertTriangle, TrendingUp, Lightbulb, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { EvidencePopover } from './EvidencePopover';

interface VoiceData {
  pubAnsut: number;
  articlesPresse: number;
  mentionsSocial: number;
  ratio: number;
  gap: string | null;
  recommandation: string | null;
}

function useShareOfVoice() {
  return useQuery({
    queryKey: ['share-of-voice'],
    queryFn: async (): Promise<VoiceData> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Get from part_de_voix table (pre-calculated)
      const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { data: voixData } = await supabase
        .from('part_de_voix')
        .select('*')
        .eq('periode', periode)
        .limit(1)
        .maybeSingle();

      if (voixData) {
        return {
          pubAnsut: voixData.nb_publications_ansut || 0,
          articlesPresse: voixData.nb_articles_presse || 0,
          mentionsSocial: voixData.nb_mentions_social || 0,
          ratio: voixData.ratio_earned_owned || 0,
          gap: voixData.gap_analyse,
          recommandation: voixData.recommandation_ia,
        };
      }

      // Fallback: calculate live
      const { count: pubCount } = await supabase
        .from('publications_institutionnelles')
        .select('*', { count: 'exact', head: true })
        .gte('date_publication', startOfMonth);

      const { count: pressCount } = await supabase
        .from('actualites')
        .select('*', { count: 'exact', head: true })
        .gte('date_publication', startOfMonth)
        .or('titre.ilike.%ansut%,contenu.ilike.%ansut%,tags.cs.{ANSUT}');

      const { count: socialCount } = await supabase
        .from('social_insights')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth);

      const pubs = pubCount || 0;
      const press = pressCount || 0;
      const ratio = pubs > 0 ? press / pubs : 0;

      return {
        pubAnsut: pubs,
        articlesPresse: press,
        mentionsSocial: socialCount || 0,
        ratio: Math.round(ratio * 100) / 100,
        gap: null,
        recommandation: null,
      };
    },
    refetchInterval: 10 * 60 * 1000,
  });
}

export default function ShareOfVoiceWidget() {
  const { data, isLoading } = useShareOfVoice();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const total = data.pubAnsut + data.articlesPresse + data.mentionsSocial;
  const ownedPct = total > 0 ? Math.round((data.pubAnsut / total) * 100) : 0;
  const earnedPct = total > 0 ? Math.round((data.articlesPresse / total) * 100) : 0;
  const socialPct = total > 0 ? Math.round((data.mentionsSocial / total) * 100) : 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const gapLevel = data.ratio < 0.3 ? 'critical' : data.ratio < 0.7 ? 'warning' : 'good';
  const gapColor = gapLevel === 'critical' ? 'text-destructive' : gapLevel === 'warning' ? 'text-amber-500' : 'text-emerald-500';
  const gapBg = gapLevel === 'critical' ? 'bg-destructive/10' : gapLevel === 'warning' ? 'bg-amber-500/10' : 'bg-emerald-500/10';

  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Visibilité Globale — Ce mois
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <EvidencePopover
            title="Communication ANSUT — Publications"
            description="Publications institutionnelles diffusées ce mois"
            source={{ kind: 'publications', sinceISO: startOfMonth, limit: 5 }}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium">Nos Publications</span>
                </div>
                <span className="text-sm font-bold">{data.pubAnsut}</span>
              </div>
              <Progress value={ownedPct} className="h-2 mt-2" />
            </div>
          </EvidencePopover>

          <EvidencePopover
            title="Earned — Articles presse mentionnant ANSUT"
            description="Couverture média obtenue ce mois"
            source={{ kind: 'actualites', sinceISO: startOfMonth, filter: 'ansut', limit: 5 }}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium">Écho Médiatique</span>
                </div>
                <span className="text-sm font-bold">{data.articlesPresse}</span>
              </div>
              <Progress value={earnedPct} className="h-2 mt-2 [&>div]:bg-emerald-500" />
            </div>
          </EvidencePopover>

          <EvidencePopover
            title="Social — Mentions sur les réseaux"
            description="Posts et conversations détectés ce mois"
            source={{ kind: 'social', sinceISO: startOfMonth, limit: 5 }}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">Bruit Social</span>
                </div>
                <span className="text-sm font-bold">{data.mentionsSocial}</span>
              </div>
              <Progress value={socialPct} className="h-2 mt-2 [&>div]:bg-blue-500" />
            </div>
          </EvidencePopover>
        </div>

        {/* Gap indicator */}
        <div className={`rounded-lg p-3 ${gapBg}`}>
          <div className="flex items-start gap-2">
            {gapLevel === 'critical' ? (
              <AlertTriangle className={`h-4 w-4 mt-0.5 ${gapColor}`} />
            ) : (
              <TrendingUp className={`h-4 w-4 mt-0.5 ${gapColor}`} />
            )}
            <div>
              <p className={`text-sm font-medium ${gapColor}`}>
                Indice de Reprise : {data.ratio}
              </p>
              {data.gap && (
                <p className="text-xs text-muted-foreground mt-1">{data.gap}</p>
              )}
            </div>
          </div>
        </div>

        {/* IA Recommendation */}
        {data.recommandation && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-xs text-muted-foreground">{data.recommandation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
