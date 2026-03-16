import { useState } from 'react';
import { Search, RefreshCw, ThumbsUp, ThumbsDown, Minus, Lightbulb, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AnalysisResult {
  sentiment: 'positif' | 'negatif' | 'mitige' | 'neutre';
  resume: string;
  points_positifs: string[];
  points_negatifs: string[];
  recommandations: string[];
}

export function ReactionAnalyzerSection() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeReactions = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      toast.error('URL invalide');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('assistant-ia', {
        body: {
          messages: [{ role: 'user', content: `Analyse les réactions du public sur ce post/article : ${trimmed}` }],
          mode: 'reaction-analysis',
        },
      });

      if (error) throw error;

      // Parse streaming or direct response
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

      // Try to parse structured JSON from the response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setResult({
            sentiment: parsed.sentiment || 'neutre',
            resume: parsed.resume || text,
            points_positifs: parsed.points_positifs || [],
            points_negatifs: parsed.points_negatifs || [],
            recommandations: parsed.recommandations || [],
          });
        } else {
          setResult({
            sentiment: 'neutre',
            resume: text,
            points_positifs: [],
            points_negatifs: [],
            recommandations: [],
          });
        }
      } catch {
        setResult({
          sentiment: 'neutre',
          resume: text,
          points_positifs: [],
          points_negatifs: [],
          recommandations: [],
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur d'analyse");
    } finally {
      setLoading(false);
    }
  };

  const sentimentConfig = {
    positif: { icon: ThumbsUp, label: 'Positif', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    negatif: { icon: ThumbsDown, label: 'Négatif', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    mitige: { icon: Minus, label: 'Mitigé', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    neutre: { icon: Minus, label: 'Neutre', className: 'bg-muted text-muted-foreground border-border' },
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Analyseur de Réactions
        </h2>
        <p className="text-sm text-muted-foreground">
          Collez l'URL d'un post ou article pour analyser les réactions du public
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://linkedin.com/posts/... ou https://x.com/..."
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && analyzeReactions()}
            />
            <Button onClick={analyzeReactions} disabled={loading || !url.trim()} className="gap-2 shrink-0">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Analyse…' : 'Analyser'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Résultat de l'analyse</CardTitle>
              {(() => {
                const cfg = sentimentConfig[result.sentiment];
                const Icon = cfg.icon;
                return (
                  <Badge variant="outline" className={cfg.className}>
                    <Icon className="h-3 w-3 mr-1" /> {cfg.label}
                  </Badge>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm">{result.resume}</p>

            {result.points_positifs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-emerald-600 mb-1.5 flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" /> Points positifs
                </p>
                <ul className="space-y-1">
                  {result.points_positifs.map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.points_negatifs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive mb-1.5 flex items-center gap-1">
                  <ThumbsDown className="h-3 w-3" /> Points négatifs
                </p>
                <ul className="space-y-1">
                  {result.points_negatifs.map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-destructive mt-0.5">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommandations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> Recommandations
                </p>
                <ul className="space-y-1">
                  {result.recommandations.map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">→</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
