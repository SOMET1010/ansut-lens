import { ReactNode } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileSearch } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EvidenceSource =
  | { kind: 'actualites'; sinceISO?: string; filter?: 'all' | 'ansut' | 'critical'; limit?: number }
  | { kind: 'publications'; sinceISO?: string; limit?: number }
  | { kind: 'social'; sinceISO?: string; limit?: number }
  | { kind: 'alertes'; sinceISO?: string; niveau?: string; limit?: number }
  | { kind: 'mentions'; limit?: number };

interface EvidenceItem {
  id: string;
  title: string;
  source: string | null;
  url: string | null;
  date: string | null;
  type: string;
}

async function fetchEvidence(src: EvidenceSource): Promise<EvidenceItem[]> {
  const limit = src.limit ?? 5;

  if (src.kind === 'actualites') {
    let q = supabase
      .from('actualites')
      .select('id, titre, source_nom, source_url, date_publication, created_at, impact_ansut')
      .order('importance', { ascending: false })
      .order('date_publication', { ascending: false })
      .limit(limit);
    if (src.sinceISO) q = q.gte('created_at', src.sinceISO);
    if (src.filter === 'ansut') {
      q = q.or('titre.ilike.%ansut%,contenu.ilike.%ansut%,tags.cs.{ANSUT}');
    }
    const { data } = await q;
    return (data ?? []).map((a) => ({
      id: a.id,
      title: a.titre,
      source: a.source_nom,
      url: a.source_url,
      date: a.date_publication ?? a.created_at,
      type: 'ACTU',
    }));
  }

  if (src.kind === 'publications') {
    let q = supabase
      .from('publications_institutionnelles')
      .select('id, contenu, plateforme, url_original, date_publication, auteur')
      .order('date_publication', { ascending: false })
      .limit(limit);
    if (src.sinceISO) q = q.gte('date_publication', src.sinceISO);
    const { data } = await q;
    return (data ?? []).map((p) => ({
      id: p.id,
      title: (p.contenu ?? '').slice(0, 90) || `Publication ${p.plateforme}`,
      source: p.auteur ?? p.plateforme,
      url: p.url_original,
      date: p.date_publication,
      type: p.plateforme?.toUpperCase() ?? 'PUB',
    }));
  }

  if (src.kind === 'social') {
    let q = supabase
      .from('social_insights')
      .select('id, contenu, plateforme, url_original, date_publication, created_at, auteur')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (src.sinceISO) q = q.gte('created_at', src.sinceISO);
    const { data } = await q;
    return (data ?? []).map((s) => ({
      id: s.id,
      title: (s.contenu ?? '').slice(0, 90) || `Mention ${s.plateforme}`,
      source: s.auteur ?? s.plateforme,
      url: s.url_original,
      date: s.date_publication ?? s.created_at,
      type: s.plateforme?.toUpperCase() ?? 'SOCIAL',
    }));
  }

  if (src.kind === 'alertes') {
    let q = supabase
      .from('alertes')
      .select('id, titre, message, niveau, type, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (src.sinceISO) q = q.gte('created_at', src.sinceISO);
    if (src.niveau) q = q.eq('niveau', src.niveau);
    const { data } = await q;
    return (data ?? []).map((a) => ({
      id: a.id,
      title: a.titre,
      source: a.type,
      url: null,
      date: a.created_at,
      type: a.niveau?.toUpperCase() ?? 'ALERTE',
    }));
  }

  if (src.kind === 'mentions') {
    const { data } = await supabase
      .from('mentions')
      .select('id, contenu, auteur, source, source_url, date_mention, created_at')
      .order('score_influence', { ascending: false })
      .limit(limit);
    return (data ?? []).map((m) => ({
      id: m.id,
      title: (m.contenu ?? '').slice(0, 90),
      source: m.auteur ?? m.source,
      url: m.source_url,
      date: m.date_mention ?? m.created_at,
      type: 'MENTION',
    }));
  }

  return [];
}

interface EvidencePopoverProps {
  children: ReactNode;
  title: string;
  description?: string;
  source: EvidenceSource;
  enabled?: boolean;
}

export function EvidencePopover({ children, title, description, source, enabled = true }: EvidencePopoverProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="cursor-help">{children}</div>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 p-0" side="top" align="start">
        {enabled ? (
          <EvidenceContent title={title} description={description} source={source} />
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}

function EvidenceContent({ title, description, source }: Omit<EvidencePopoverProps, 'children' | 'enabled'>) {
  const { data, isLoading } = useQuery({
    queryKey: ['evidence', source],
    queryFn: () => fetchEvidence(source),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-2">
      <div className="border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <FileSearch className="h-3.5 w-3.5 text-primary" />
          <p className="text-sm font-semibold">{title}</p>
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="px-3 pb-3 space-y-2 max-h-72 overflow-y-auto">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucune source disponible pour cet indicateur.
          </p>
        ) : (
          data.map((item) => (
            <div key={item.id} className="rounded-md border bg-muted/30 p-2 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {item.type}
                </Badge>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-xs font-medium line-clamp-2 leading-snug">{item.title}</p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                {item.source && <span className="truncate">{item.source}</span>}
                {item.date && <span className="shrink-0 ml-2">{new Date(item.date).toLocaleDateString('fr-FR')}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
