import { useState } from 'react';
import { Newspaper, RefreshCw, ExternalLink, Globe, BarChart3 } from 'lucide-react';
import { TermeMetier } from '@/components/common/TermeMetier';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';
import { libelleJournal } from '@/lib/journalTitrologie';

interface TitreJournal {
  journal: string;
  titre: string;
  resume: string;
  url: string;
  type: string;
}

// Remplacement des couleurs Tailwind litterales par des classes semantiques du theme
const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  nationale: { label: 'Presse Nationale', icon: <Newspaper className="h-3.5 w-3.5" aria-hidden />, color: 'bg-primary/10 text-primary' },
  en_ligne: { label: 'Presse en Ligne', icon: <Globe className="h-3.5 w-3.5" aria-hidden />, color: 'bg-accent/10 text-accent-foreground' },
  economique: { label: 'Économique & Tech', icon: <BarChart3 className="h-3.5 w-3.5" aria-hidden />, color: 'bg-muted text-muted-foreground' },
};

function classerType(journal: string, url: string): string {
  const j = (journal || '').toLowerCase();
  const u = (url || '').toLowerCase();
  if (/(sika|eco|business|finance|tech|jeune afrique)/.test(j + u)) return 'economique';
  if (/(abidjan\.net|net|online|info|linfodrome|koaci)/.test(j + u)) return 'en_ligne';
  return 'nationale';
}


async function fetchTitrologie(): Promise<TitreJournal[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('titrologie_unes')
    .select('journal,titre_une,sujet,source_url,collected_at,date_parution')
    .lte('date_parution', today)
    .order('date_parution', { ascending: false })
    .order('collected_at', { ascending: false })
    .limit(40);

  if (error) throw error;

  const rows = (data || []) as any[];
  const latestDate = rows[0]?.date_parution;
  return rows
    .filter((r) => r.date_parution === latestDate)
    .map((r) => ({
      journal: r.journal ?? '—',
      titre: r.titre_une ?? '',
      resume: r.sujet ?? '',
      url: r.source_url ?? '',
      type: classerType(r.journal, r.source_url),
    }));
}

export function TitrologieWidget() {
  const { data: titres, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['titrologie-widget'],
    queryFn: fetchTitrologie,
    staleTime: 10 * 60 * 1000,
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
            <Newspaper className="h-5 w-5 text-primary" aria-hidden />
            Revue de presse — unes du jour
          </CardTitle>
          {/* Ajout d'un aria-label pour le bouton reduit a une icone */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-8 w-8 p-0"
            aria-label="Actualiser la titrologie"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground capitalize">{dateStr}</p>
        {/*
          Cadrage honnête : c'est l'actualité GÉNÉRALE — les unes de la presse
          ivoirienne, toutes rubriques — donnée à titre de contexte, chaque titre
          étant nommé (journal) et sourcé (lien). On n'en fait pas une veille
          ANSUT filtrée : on dit ce que c'est.
        */}
        <p className="text-[11px] text-muted-foreground/80">
          Unes de la presse ivoirienne, toutes rubriques — à titre de contexte.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!titres || titres.length === 0) ? (
          <div className="text-center py-6">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" aria-hidden />
            <p className="text-sm text-muted-foreground">Aucun titre disponible</p>
              {/* Enveloppement du terme metier "titrologie" */}
              <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
                Charger la <TermeMetier cle="titrologie">titrologie</TermeMetier>
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
                  {/* Suppression du point median et calcul de l'accord reel */}
                  <span className="text-[10px] text-muted-foreground">
                    {items.length === 1 ? '1 titre' : `${items.length} titres`}
                  </span>
                </div>
                {items.map((t, i) => (
                  <div
                    key={`${type}-${i}`}
                    className="pl-3 border-l-2 border-primary/30 hover:border-primary transition-colors"
                  >
                    {(() => {
                      const src = libelleJournal(t.journal);
                      return (
                        <p
                          className={`text-[11px] font-semibold ${
                            src.identifie ? 'text-primary' : 'italic text-muted-foreground'
                          }`}
                          title={src.identifie ? undefined : 'Le nom du journal n’a pas pu être lu sur la une'}
                        >
                          {src.texte}
                        </p>
                      );
                    })()}
                    {/* Nettoyage du titre issu de la collecte */}
                    <p className="text-sm font-medium leading-tight">{nettoyerExtrait(t.titre)}</p>
                    {t.resume && (
                      <p className="text-xs text-muted-foreground mt-0.5">{nettoyerExtrait(t.resume)}</p>
                    )}
                    {t.url && (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                      >
                        Lire <ExternalLink className="h-3 w-3" aria-hidden />
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
