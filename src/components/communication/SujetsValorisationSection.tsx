import { useState } from 'react';
import { TrendingUp, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SujetValorisation {
  titre: string;
  angle: string;
  pourquoi: string;
  priorite: 'haute' | 'moyenne' | 'basse';
}

interface Props {
  onGeneratePost?: (sujet: string) => void;
}

export function SujetsValorisationSection({ onGeneratePost }: Props) {
  const [sujets, setSujets] = useState<SujetValorisation[]>([]);
  const [loading, setLoading] = useState(false);

  const generateSujets = async () => {
    setLoading(true);
    setSujets([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      // Fetch recent news for context
      const { data: actualites } = await supabase
        .from('actualites')
        .select('titre, resume, categorie, importance')
        .order('created_at', { ascending: false })
        .limit(15);

      const context = (actualites || [])
        .map(a => `- ${a.titre} (${a.categorie || 'général'}, importance: ${a.importance || 'N/A'})`)
        .join('\n');

      const { data, error } = await supabase.functions.invoke('assistant-ia', {
        body: {
          messages: [{
            role: 'user',
            content: `Voici les actualités récentes :\n${context}\n\nIdentifie 3 à 5 sujets que l'ANSUT devrait valoriser dans sa communication digitale.`,
          }],
          mode: 'sujets-valorisation',
        },
      });

      if (error) throw error;

      let text = '';
      if (data instanceof ReadableStream) {
        const reader = data.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const json = line.slice(6);
            if (json === '[DONE]') continue;
            try {
              const parsed = JSON.parse(json);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) text += delta;
            } catch {}
          }
        }
      } else if (typeof data === 'string') {
        text = data;
      } else {
        text = JSON.stringify(data);
      }

      // Parse JSON array from response
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as SujetValorisation[];
          setSujets(parsed.slice(0, 5));
        } else {
          // Fallback: show as single suggestion
          setSujets([{ titre: 'Suggestion IA', angle: text, pourquoi: '', priorite: 'moyenne' }]);
        }
      } catch {
        setSujets([{ titre: 'Suggestion IA', angle: text, pourquoi: '', priorite: 'moyenne' }]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur de génération');
    } finally {
      setLoading(false);
    }
  };

  const prioriteColors = {
    haute: 'bg-destructive/10 text-destructive border-destructive/20',
    moyenne: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    basse: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Sujets à Valoriser
          </h2>
          <p className="text-sm text-muted-foreground">
            Thématiques porteuses identifiées par l'IA à partir de l'actualité
          </p>
        </div>
        <Button onClick={generateSujets} disabled={loading} variant="outline" className="gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Analyse…' : 'Identifier les sujets'}
        </Button>
      </div>

      {loading && (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sujets.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {sujets.map((s, i) => (
            <Card key={i} className="border-l-4 border-l-primary">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{s.titre}</p>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${prioriteColors[s.priorite] || prioriteColors.moyenne}`}>
                    {s.priorite}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">📐 Angle : {s.angle}</p>
                {s.pourquoi && (
                  <p className="text-xs text-muted-foreground italic">💡 {s.pourquoi}</p>
                )}
                {onGeneratePost && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs h-7 px-2 mt-1"
                    onClick={() => onGeneratePost(`Rédige un post pour valoriser ce sujet : ${s.titre}. Angle suggéré : ${s.angle}`)}
                  >
                    Générer un post <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && sujets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Cliquez sur « Identifier les sujets » pour découvrir les thématiques à valoriser
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
