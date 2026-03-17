import { useState } from 'react';
import { Newspaper, RefreshCw, ExternalLink, Globe, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface TitreJournal {
  journal: string;
  titre: string;
  resume: string;
  url: string;
  type: string;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  nationale: { label: 'Presse Nationale', icon: <Newspaper className="h-3.5 w-3.5" />, color: 'bg-primary/10 text-primary' },
  en_ligne: { label: 'Presse en Ligne', icon: <Globe className="h-3.5 w-3.5" />, color: 'bg-accent/10 text-accent-foreground' },
  economique: { label: 'Économique & Tech', icon: <BarChart3 className="h-3.5 w-3.5" />, color: 'bg-secondary/80 text-secondary-foreground' },
};

async function fetchTitrologie(): Promise<TitreJournal[]> {
  const { data, error } = await supabase.functions.invoke('generer-matinale', {
    body: { previewOnly: true },
  });

  if (error) throw error;
  return data?.titrologie || [];
}

export function TitrologieWidget() {
  const { data: titres, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['titrologie'],
    queryFn: fetchTitrologie,
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });

  const handleRefresh = () => {
    refetch();
    toast.info('Actualisation de la titrologie...');
  };

  const grouped = {
    nationale: (titres || []).filter(t => t.type === 'nationale'),
    en_ligne: (titres || []).filter(t => t.type === 'en_ligne'),
    economique: (titres || []).filter(t => t.type === 'economique'),
  };

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Revue de Presse
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground capitalize">{dateStr}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!titres || titres.length === 0) ? (
          <div className="text-center py-6">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Aucun titre disponible</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
              Charger la titrologie
            </Button>
          </div>
        ) : (
          Object.entries(grouped).map(([type, items]) => {
            if (items.length === 0) return null;
            const config = typeConfig[type] || typeConfig.nationale;
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${config.color}`}>
                    {config.icon}
                    <span className="ml-1">{config.label}</span>
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{items.length} titre{items.length > 1 ? 's' : ''}</span>
                </div>
                {items.map((t, i) => (
                  <div
                    key={`${type}-${i}`}
                    className="pl-3 border-l-2 border-primary/30 hover:border-primary transition-colors"
                  >
                    <p className="text-[11px] font-semibold text-primary">{t.journal}</p>
                    <p className="text-sm font-medium leading-tight">{t.titre}</p>
                    {t.resume && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.resume}</p>
                    )}
                    {t.url && (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                      >
                        Lire <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
