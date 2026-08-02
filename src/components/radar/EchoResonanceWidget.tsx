import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio, Share2, Users, MessageCircle, Lightbulb } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';
import { TermeMetier } from '@/components/common/TermeMetier';

interface EchoItem {
  id: string;
  publication_contenu: string;
  plateforme: string;
  score_resonance: number;
  nb_reprises_presse: number;
  nb_citations_influenceurs: number;
  portee_estimee: number;
  recommandation_ia: string | null;
}

function useEchoResonance() {
  return useQuery({
    queryKey: ['echo-resonance-latest'],
    queryFn: async (): Promise<EchoItem[]> => {
      const { data: echos } = await supabase
        .from('echo_metrics')
        .select('*, publications_institutionnelles!echo_metrics_publication_id_fkey(contenu, plateforme)')
        .order('created_at', { ascending: false })
        .limit(5);

      return (echos || []).map((e: any) => ({
        id: e.id,
        publication_contenu: e.publications_institutionnelles?.contenu?.substring(0, 120) || '—',
        plateforme: e.publications_institutionnelles?.plateforme || '?',
        score_resonance: e.score_resonance || 0,
        nb_reprises_presse: e.nb_reprises_presse || 0,
        nb_citations_influenceurs: e.nb_citations_influenceurs || 0,
        portee_estimee: e.portee_estimee || 0,
        recommandation_ia: e.recommandation_ia,
      }));
    },
    refetchInterval: 10 * 60 * 1000,
  });
}

function ScoreBadge({ score }: { score: number }) {
  // Remplacement des couleurs littérales par les tokens sémantiques de signal
  const color = score >= 70 ? 'bg-[hsl(var(--signal-positive))]/15 text-[hsl(var(--signal-positive))]' :
    score >= 40 ? 'bg-[hsl(var(--signal-warning))]/15 text-[hsl(var(--signal-warning))]' :
    'bg-[hsl(var(--signal-critical))]/15 text-[hsl(var(--signal-critical))]';
  
  // Ajout d'un équivalent textuel pour la couleur
  const niveau = score >= 70 ? 'Élevée' : score >= 40 ? 'Moyenne' : 'Faible';
  
  return (
    <Badge className={color}>
      <TermeMetier cle="resonance" discret>Résonance</TermeMetier>&nbsp;{niveau} ({score}/100)
    </Badge>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  // Remplacement des abréviations par des noms complets plus explicites
  const label = platform === 'linkedin' ? 'LinkedIn' : platform === 'twitter' ? 'X' : platform === 'facebook' ? 'Facebook' : platform === 'website' ? 'Web' : platform;
  return <Badge variant="outline" className="text-[10px] px-1.5">{label}</Badge>;
}

export default function EchoResonanceWidget() {
  const { data, isLoading } = useEchoResonance();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="glass border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
            Portée de nos publications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune publication institutionnelle analysée pour l'instant. Les données apparaîtront après la prochaine collecte.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
          Portée de nos publications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((echo) => (
          <div key={echo.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <PlatformIcon platform={echo.plateforme} />
                  <ScoreBadge score={echo.score_resonance} />
                </div>
                {/* Nettoyage de l'extrait pour retirer le balisage Markdown */}
                <p className="text-sm line-clamp-2">{nettoyerExtrait(echo.publication_contenu)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Share2 className="h-3 w-3" aria-hidden="true" />
                {/* Accord pluriel corrigé */}
                {echo.nb_reprises_presse} {echo.nb_reprises_presse > 1 ? 'reprises presse' : 'reprise presse'}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                {/* Accord pluriel corrigé */}
                {echo.nb_citations_influenceurs} {echo.nb_citations_influenceurs > 1 ? 'influenceurs' : 'influenceur'}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" aria-hidden="true" />
                {echo.portee_estimee.toLocaleString()} de portée
              </span>
            </div>

            {echo.recommandation_ia && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                {/* Remplacement de la couleur littérale par le token sémantique */}
                <Lightbulb className="h-3 w-3 text-[hsl(var(--signal-warning))] mt-0.5 shrink-0" aria-hidden="true" />
                <p className="line-clamp-3">{echo.recommandation_ia}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
