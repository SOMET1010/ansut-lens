import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Users, Radio, FolderOpen, Radar, Bot, Search } from 'lucide-react';
import { CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface SearchResults {
  actualites: { id: string; titre: string; source_nom: string | null }[];
  personnalites: { id: string; nom: string; prenom: string | null; fonction: string | null; organisation: string | null }[];
  sources: { id: string; nom: string; type: string }[];
  dossiers: { id: string; titre: string; categorie: string }[];
}

const emptyResults: SearchResults = { actualites: [], personnalites: [], sources: [], dossiers: [] };

const quickActions = [
  { label: 'Centre de Veille', icon: Radar, path: '/radar' },
  { label: 'Actualités', icon: Newspaper, path: '/actualites' },
  { label: 'Acteurs & Influence', icon: Users, path: '/acteurs' },
  { label: 'Dossiers', icon: FolderOpen, path: '/dossiers' },
  { label: 'Assistant IA', icon: Bot, path: '/assistant' },
];

interface SpotlightSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpotlightSearch({ open, onOpenChange }: SpotlightSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(emptyResults);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${query.trim()}%`;
      const [act, pers, src, dos] = await Promise.all([
        supabase.from('actualites').select('id, titre, source_nom').ilike('titre', q).limit(5),
        supabase.from('personnalites').select('id, nom, prenom, fonction, organisation').or(`nom.ilike.${q},fonction.ilike.${q},organisation.ilike.${q}`).limit(5),
        supabase.from('sources_media').select('id, nom, type').ilike('nom', q).limit(5),
        supabase.from('dossiers').select('id, titre, categorie').ilike('titre', q).limit(5),
      ]);
      setResults({
        actualites: act.data ?? [],
        personnalites: pers.data ?? [],
        sources: src.data ?? [],
        dossiers: dos.data ?? [],
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const go = useCallback((path: string) => {
    onOpenChange(false);
    setQuery('');
    navigate(path);
  }, [navigate, onOpenChange]);

  const hasResults = results.actualites.length + results.personnalites.length + results.sources.length + results.dossiers.length > 0;
  const isSearching = query.trim().length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Rechercher actualités, acteurs, sources, dossiers…" value={query} onValueChange={setQuery} />
      <CommandList>
        {isSearching && !loading && !hasResults && (
          <CommandEmpty>Aucun résultat pour « {query} »</CommandEmpty>
        )}

        {loading && (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        )}

        {!isSearching && (
          <CommandGroup heading="Accès rapide">
            {quickActions.map(a => (
              <CommandItem key={a.path} onSelect={() => go(a.path)}>
                <a.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.actualites.length > 0 && (
          <CommandGroup heading="Actualités">
            {results.actualites.map(a => (
              <CommandItem key={a.id} onSelect={() => go('/actualites')}>
                <Newspaper className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{a.titre}</span>
                {a.source_nom && <span className="ml-auto text-xs text-muted-foreground">{a.source_nom}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.personnalites.length > 0 && (
          <CommandGroup heading="Personnalités">
            {results.personnalites.map(p => (
              <CommandItem key={p.id} onSelect={() => go('/acteurs')}>
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{p.prenom ? `${p.prenom} ` : ''}{p.nom}</span>
                {(p.fonction || p.organisation) && (
                  <span className="ml-auto text-xs text-muted-foreground truncate max-w-[200px]">
                    {[p.fonction, p.organisation].filter(Boolean).join(' · ')}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.sources.length > 0 && (
          <CommandGroup heading="Sources Média">
            {results.sources.map(s => (
              <CommandItem key={s.id} onSelect={() => go('/admin/sources')}>
                <Radio className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{s.nom}</span>
                <span className="ml-auto text-xs text-muted-foreground">{s.type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.dossiers.length > 0 && (
          <CommandGroup heading="Dossiers">
            {results.dossiers.map(d => (
              <CommandItem key={d.id} onSelect={() => go('/dossiers')}>
                <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{d.titre}</span>
                <span className="ml-auto text-xs text-muted-foreground">{d.categorie}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
