import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Clock, Star, TrendingUp, Tag, Database } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  keywords: string[];
  freshnessHours?: number;
  /** Optional: pre-rendered analyzed items (e.g. signaux, recommandations strings) */
  analyzedItems?: { label: string; value?: string | number }[];
  /** Optional: titles surfaced by the AI in this section (for fuzzy match) */
  highlightedTitles?: string[];
}

function isValidUrl(u?: string): boolean {
  if (!u) return false;
  try {
    const p = new URL(u);
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch {
    return false;
  }
}

function sentimentBadge(s: number | null | undefined) {
  if (s === null || s === undefined) return null;
  const v = Number(s);
  const cls =
    v > 0.2
      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
      : v < -0.2
      ? 'bg-red-500/15 text-red-600 border-red-500/30'
      : 'bg-muted text-muted-foreground';
  const label = v > 0.2 ? 'Positif' : v < -0.2 ? 'Négatif' : 'Neutre';
  return (
    <Badge variant="outline" className={`${cls} text-[10px]`}>
      {label} ({v.toFixed(2)})
    </Badge>
  );
}

export function MatinaleDrillDownModal({
  open,
  onOpenChange,
  title,
  description,
  keywords,
  freshnessHours = 24,
  analyzedItems,
  highlightedTitles,
}: Props) {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['matinale-drilldown', title, keywords, freshnessHours],
    enabled: open,
    queryFn: async () => {
      const since = new Date(Date.now() - (freshnessHours + 24) * 3600 * 1000).toISOString();
      let query = supabase
        .from('actualites')
        .select(
          'id, titre, resume, source_nom, source_url, date_publication, created_at, score_pertinence, importance, sentiment, tags, categorie, analyse_ia'
        )
        .gte('created_at', since)
        .order('importance', { ascending: false })
        .limit(60);

      const data = (await query).data || [];

      const norm = (s: string) =>
        s
          ?.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') || '';

      const kw = keywords.filter(Boolean).map(norm);
      const titles = (highlightedTitles || []).map(norm);

      // No filter → return top by importance
      if (kw.length === 0 && titles.length === 0) return data.slice(0, 25);

      const scored = data
        .map((a: any) => {
          const hay = norm(`${a.titre || ''} ${a.resume || ''} ${(a.tags || []).join(' ')}`);
          let score = 0;
          for (const k of kw) if (k.length > 2 && hay.includes(k)) score += 2;
          for (const t of titles) {
            if (!t) continue;
            const tokens = t.split(/\W+/).filter((x) => x.length > 4);
            const matched = tokens.filter((tok) => hay.includes(tok)).length;
            if (matched >= Math.max(2, Math.floor(tokens.length * 0.4))) score += 5;
          }
          return { a, score };
        })
        .filter((x) => x.score > 0)
        .sort((x, y) => y.score - x.score || (y.a.importance ?? 0) - (x.a.importance ?? 0));

      return scored.slice(0, 25).map((x) => x.a);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Drill-down — {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-4">
            {/* Métadonnées */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" /> Fenêtre {freshnessHours}h
              </Badge>
              {keywords.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Tag className="h-3 w-3" /> {keywords.length} mot(s)-clé(s)
                </Badge>
              )}
              <Badge variant="secondary">
                {isLoading ? '…' : `${articles?.length ?? 0} article(s) sources`}
              </Badge>
            </div>

            {/* Items analysés (synthèse IA reprise) */}
            {analyzedItems && analyzedItems.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Éléments analysés par l'IA
                </div>
                <ul className="space-y-1 text-sm">
                  {analyzedItems.map((it, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="flex-1">
                        {it.label}
                        {it.value !== undefined && (
                          <span className="text-muted-foreground"> — {String(it.value)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Articles sources */}
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Articles sources & scores
              </div>
              {isLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              )}
              {!isLoading && (!articles || articles.length === 0) && (
                <div className="text-sm text-muted-foreground italic p-4 text-center border rounded-lg">
                  Aucun article correspondant trouvé dans la fenêtre {freshnessHours}h.
                </div>
              )}
              <ul className="space-y-2">
                {articles?.map((a: any) => {
                  const ok = isValidUrl(a.source_url);
                  return (
                    <li
                      key={a.id}
                      className="rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {ok ? (
                            <a
                              href={a.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-sm hover:underline inline-flex items-start gap-1"
                            >
                              {a.titre}
                              <ExternalLink className="h-3 w-3 opacity-60 mt-0.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="font-medium text-sm">{a.titre}</span>
                          )}
                          {a.resume && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {nettoyerExtrait(a.resume)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                        {a.source_nom && (
                          <Badge variant="outline" className="text-[10px]">
                            {a.source_nom}
                          </Badge>
                        )}
                        {a.date_publication && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Clock className="h-2.5 w-2.5" />
                            {format(new Date(a.date_publication), 'dd MMM HH:mm', { locale: fr })}
                          </Badge>
                        )}
                        {a.score_pertinence !== null && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Star className="h-2.5 w-2.5" />
                            Pertinence {a.score_pertinence}
                          </Badge>
                        )}
                        {a.importance !== null && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <TrendingUp className="h-2.5 w-2.5" />
                            Importance {a.importance}
                          </Badge>
                        )}
                        {sentimentBadge(a.sentiment)}
                        {a.categorie && (
                          <Badge variant="secondary" className="text-[10px]">
                            {a.categorie}
                          </Badge>
                        )}
                      </div>

                      {a.tags && a.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {a.tags.slice(0, 6).map((t: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
