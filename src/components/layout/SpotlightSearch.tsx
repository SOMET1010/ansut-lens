import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, HelpCircle, Newspaper, Radio, Users } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { NAV_SECTIONS } from '@/config/navigation';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { nettoyerTitre } from '@/lib/nettoyerExtrait';

interface SearchResults {
  actualites: { id: string; titre: string; source_nom: string | null }[];
  personnalites: {
    id: string;
    nom: string;
    prenom: string | null;
    fonction: string | null;
    organisation: string | null;
  }[];
  sources: { id: string; nom: string; type: string }[];
  dossiers: { id: string; titre: string; categorie: string }[];
}

const emptyResults: SearchResults = {
  actualites: [],
  personnalites: [],
  sources: [],
  dossiers: [],
};

interface SpotlightSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Recherche globale, ouverte au clavier ou depuis l'en-tete.
 *
 * Deux corrections issues de l'audit sont appliquees ici.
 *
 * Les acces rapides etaient une liste codee en dur, qui portait encore les
 * anciens libelles et n'etait pas filtree par permission : un utilisateur
 * pouvait s'y voir proposer une section a laquelle il n'avait pas droit. Ils
 * proviennent desormais du registre central `src/config/navigation.ts`, filtres
 * par permission comme la barre laterale.
 *
 * Les resultats renvoyaient tous vers la page de section, sans identifiant :
 * chercher un acteur precis amenait sur la liste complete, a charge pour
 * l'utilisateur de le retrouver. Chaque resultat cible maintenant sa fiche.
 */
export function SpotlightSearch({ open, onOpenChange }: SpotlightSearchProps) {
  const navigate = useNavigate();
  const { hasPermission } = useUserPermissions();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);

  const accesRapides = NAV_SECTIONS.filter((section) => hasPermission(section.permission));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(emptyResults);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const motif = `%${query.trim()}%`;
      // Les « Sources » renvoient vers /admin/sources (réservé à manage_sources).
      // On ne propose donc ce groupe qu'aux utilisateurs habilités, pour ne pas
      // les mener à une impasse « Accès refusé » (cohérence avec les accès rapides).
      const peutVoirSources = hasPermission('manage_sources');
      const [actualites, personnalites, sources, dossiers] = await Promise.all([
        supabase.from('actualites').select('id, titre, source_nom').ilike('titre', motif).limit(5),
        supabase
          .from('personnalites')
          .select('id, nom, prenom, fonction, organisation')
          .or(`nom.ilike.${motif},fonction.ilike.${motif},organisation.ilike.${motif}`)
          .limit(5),
        peutVoirSources
          ? supabase.from('sources_media').select('id, nom, type').ilike('nom', motif).limit(5)
          : Promise.resolve({ data: [] as { id: string; nom: string; type: string }[] }),
        supabase.from('dossiers').select('id, titre, categorie').ilike('titre', motif).limit(5),
      ]);
      setResults({
        actualites: actualites.data ?? [],
        personnalites: personnalites.data ?? [],
        sources: sources.data ?? [],
        dossiers: dossiers.data ?? [],
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const aller = useCallback(
    (path: string) => {
      onOpenChange(false);
      setQuery('');
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  const nbResultats =
    results.actualites.length +
    results.personnalites.length +
    results.sources.length +
    results.dossiers.length;
  const enRecherche = query.trim().length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Rechercher un article, un acteur, une source, une note…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {enRecherche && !loading && nbResultats === 0 && (
          <CommandEmpty>
            <div className="space-y-1 py-4 text-center">
              <p className="text-sm">Aucun résultat pour « {query} »</p>
              <p className="text-xs text-muted-foreground">
                Essayez un mot-clé plus court, ou lancez une recherche approfondie depuis la
                section Recherche.
              </p>
            </div>
          </CommandEmpty>
        )}

        {loading && (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        )}

        {!enRecherche && (
          <>
            <CommandGroup heading="Aller à">
              {accesRapides.map((section) => (
                <CommandItem key={section.id} onSelect={() => aller(section.path)}>
                  <section.icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{section.label}</span>
                  <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">
                    {section.question}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Aide">
              <CommandItem onSelect={() => aller('/aide')}>
                <HelpCircle className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Glossaire des termes</span>
                <span className="ml-auto pl-3 text-xs text-muted-foreground">
                  SPDI, quadrant, titrologie…
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {results.actualites.length > 0 && (
          <CommandGroup heading="Articles">
            {results.actualites.map((actualite) => (
              <CommandItem
                key={actualite.id}
                onSelect={() => aller(`/veille?article=${actualite.id}`)}
              >
                <Newspaper className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{nettoyerTitre(actualite.titre)}</span>
                {actualite.source_nom && (
                  <span className="ml-auto shrink-0 pl-3 text-xs text-muted-foreground">
                    {actualite.source_nom}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.personnalites.length > 0 && (
          <CommandGroup heading="Acteurs">
            {results.personnalites.map((personnalite) => (
              <CommandItem
                key={personnalite.id}
                onSelect={() => aller(`/acteurs?id=${personnalite.id}`)}
              >
                <Users className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {personnalite.prenom ? `${personnalite.prenom} ` : ''}
                  {personnalite.nom}
                </span>
                {(personnalite.fonction || personnalite.organisation) && (
                  <span className="ml-auto max-w-[200px] shrink-0 truncate pl-3 text-xs text-muted-foreground">
                    {[personnalite.fonction, personnalite.organisation].filter(Boolean).join(' · ')}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.sources.length > 0 && (
          <CommandGroup heading="Sources">
            {results.sources.map((source) => (
              <CommandItem key={source.id} onSelect={() => aller(`/admin/sources?id=${source.id}`)}>
                <Radio className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{source.nom}</span>
                <span className="ml-auto shrink-0 pl-3 text-xs text-muted-foreground">
                  {source.type}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.dossiers.length > 0 && (
          <CommandGroup heading="Notes et dossiers">
            {results.dossiers.map((dossier) => (
              <CommandItem key={dossier.id} onSelect={() => aller(`/publier?id=${dossier.id}`)}>
                <FolderOpen className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{dossier.titre}</span>
                <span className="ml-auto shrink-0 pl-3 text-xs text-muted-foreground">
                  {dossier.categorie}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
