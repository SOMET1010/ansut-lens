import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Newspaper, Search, ExternalLink, TrendingUp, Clock, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActualites, calculateFreshness } from '@/hooks/useActualites';
import { FocusBanner } from '@/components/radar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Page dédiée /actualites — vue éditoriale orientée "informations clés + sources".
 * Lit ?q=... pour mettre en avant un sujet venant du Daily Briefing.
 * ?from= et ?item= sont utilisés pour conserver le contexte du briefing.
 */
export default function ActualitesPage() {
  const [searchParams] = useSearchParams();
  const focusQuery = searchParams.get('q') || '';
  const focusFrom = searchParams.get('from') || undefined;
  const focusItem = searchParams.get('item') || undefined;
  const [search, setSearch] = useState(focusQuery);
  const [period, setPeriod] = useState<'24h' | '72h' | '7j' | 'all'>('72h');
  const focusRef = useRef<HTMLDivElement | null>(null);

  const maxAgeHours = period === '24h' ? 24 : period === '72h' ? 72 : period === '7j' ? 168 : undefined;
  const { data: actualites, isLoading, refetch, isFetching } = useActualites({ maxAgeHours });

  const filtered = useMemo(() => {
    if (!actualites) return [];
    const q = search.trim().toLowerCase();
    if (!q) return actualites;
    return actualites.filter(a =>
      a.titre.toLowerCase().includes(q) ||
      a.resume?.toLowerCase().includes(q) ||
      a.source_nom?.toLowerCase().includes(q) ||
      a.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [actualites, search]);

  const focusMatches = useMemo(() => {
    if (!focusQuery || !actualites) return [];
    const q = focusQuery.toLowerCase();
    return actualites
      .filter(a => a.titre.toLowerCase().includes(q) || a.resume?.toLowerCase().includes(q))
      .slice(0, 3);
  }, [actualites, focusQuery]);

  // Top sources for "sources mises en avant"
  const topSources = useMemo(() => {
    if (!actualites) return [];
    const counts = new Map<string, { name: string; count: number; lastUrl: string | null }>();
    actualites.forEach(a => {
      if (!a.source_nom) return;
      const cur = counts.get(a.source_nom) || { name: a.source_nom, count: 0, lastUrl: a.source_url };
      cur.count += 1;
      if (!cur.lastUrl && a.source_url) cur.lastUrl = a.source_url;
      counts.set(a.source_nom, cur);
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [actualites]);

  const highlights = useMemo(() => {
    if (!actualites) return [];
    return [...actualites]
      .filter(a => (a.importance ?? 0) >= 4)
      .slice(0, 3);
  }, [actualites]);

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* En-tête */}
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Actualités</h1>
            <p className="text-sm text-muted-foreground">Informations clés et sources de référence</p>
          </div>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} />
          Rafraîchir
        </Button>
      </header>

      {/* Bandeau "Vu depuis Briefing" */}
      {focusQuery && (
        <FocusBanner
          query={focusQuery}
          originLabel="À retenir"
          matchCount={focusMatches.length}
        />
      )}

      {/* Highlights mis en avant */}
      {highlights.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">À la une</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map(a => {
              const fresh = calculateFreshness(a.date_publication);
              const isMatch = focusQuery && (
                a.titre.toLowerCase().includes(focusQuery.toLowerCase()) ||
                a.resume?.toLowerCase().includes(focusQuery.toLowerCase())
              );
              return (
                <Card
                  key={a.id}
                  className={cn(
                    'group hover:shadow-md transition-all',
                    isMatch && 'ring-2 ring-primary/50 border-primary/40'
                  )}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {a.categorie && <Badge variant="secondary" className="text-[10px]">{a.categorie}</Badge>}
                      <span className={fresh.color}>{fresh.label}</span>
                    </div>
                    <h3 className="text-sm font-semibold leading-snug line-clamp-3">{a.titre}</h3>
                    {a.resume && (
                      <p className="text-xs text-muted-foreground line-clamp-3">{a.resume}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground truncate max-w-[60%]">
                        {a.source_nom || 'Source inconnue'}
                      </span>
                      {a.source_url && (
                        <a
                          href={a.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          Lire <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Filtres + recherche */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les actualités…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(['24h', '72h', '7j', 'all'] as const).map(p => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="h-8 text-xs"
            >
              {p === 'all' ? 'Tout' : p}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Liste principale */}
        <div className="space-y-3">
          {isLoading && (
            <>
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
            </>
          )}

          {!isLoading && filtered.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Aucune actualité ne correspond à votre recherche.
              </CardContent>
            </Card>
          )}

          {filtered.map(a => {
            const fresh = calculateFreshness(a.date_publication);
            const isMatch = focusQuery && (
              a.titre.toLowerCase().includes(focusQuery.toLowerCase()) ||
              a.resume?.toLowerCase().includes(focusQuery.toLowerCase())
            );
            return (
              <Card
                key={a.id}
                className={cn(
                  'transition-all hover:border-primary/40',
                  isMatch && 'ring-2 ring-primary/50 border-primary/40 bg-primary/[0.03]'
                )}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                    {a.categorie && <Badge variant="secondary" className="text-[10px]">{a.categorie}</Badge>}
                    {a.importance != null && a.importance >= 4 && (
                      <Badge className="text-[10px] bg-signal-warning/20 text-signal-warning border-signal-warning/30">Important</Badge>
                    )}
                    <span className={fresh.color}>{fresh.label}</span>
                    {a.date_publication && (
                      <span className="text-muted-foreground/70">
                        · {format(new Date(a.date_publication), 'd MMM', { locale: fr })}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold leading-snug">{a.titre}</h3>
                  {a.resume && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{a.resume}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <strong className="font-medium text-foreground/80">{a.source_nom || 'Source inconnue'}</strong>
                    </span>
                    {a.source_url && (
                      <a
                        href={a.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Lire la source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sources mises en avant */}
        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sources les plus actives
                </h3>
              </div>
              {topSources.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucune source à afficher.</p>
              )}
              <ul className="space-y-2">
                {topSources.map((s, idx) => (
                  <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0 h-5 px-1.5">{idx + 1}</Badge>
                      {s.lastUrl ? (
                        <a
                          href={s.lastUrl} target="_blank" rel="noopener noreferrer"
                          className="truncate hover:text-primary hover:underline"
                        >
                          {s.name}
                        </a>
                      ) : (
                        <span className="truncate">{s.name}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{s.count}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Continuer
              </h3>
              <div className="flex flex-col gap-1.5">
                <Button asChild variant="ghost" size="sm" className="justify-start h-8">
                  <Link to="/radar">← Retour au Centre de Veille</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="justify-start h-8">
                  <Link to="/dossiers">Voir les dossiers stratégiques</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
