import { useMemo, useState } from 'react';
import { ScrollText, ExternalLink, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer, PageHeader } from '@/components/common';
import { useActualites } from '@/hooks/useActualites';
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';
import type { Actualite } from '@/types';

/** Périodes proposées, en heures (undefined = tout l'historique). */
const PERIODES: { cle: string; label: string; heures?: number }[] = [
  { cle: '24h', label: "Aujourd'hui", heures: 24 },
  { cle: '72h', label: '3 jours', heures: 72 },
  { cle: '7d', label: '7 jours', heures: 168 },
  { cle: '30d', label: '30 jours', heures: 720 },
  { cle: 'all', label: 'Tout', heures: undefined },
];

/** Date de parution lisible, ou aveu honnête si la source ne l'a pas fournie. */
function dateLisible(iso?: string): string {
  if (!iso) return 'Date non précisée';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Date non précisée' : format(d, 'd MMMM yyyy', { locale: fr });
}

/**
 * Page « Pige presse ».
 *
 * Revue de presse dédiée, SÉPARÉE du reste de la Veille : elle ne lit que les
 * contenus issus de la pige professionnelle (`source_type = 'pige'`), déposés
 * par le prestataire via l'endpoint `import-pige`. Chaque article y est nommé
 * (journal), daté (date réelle de parution ou aveu « non précisée ») et sourcé
 * (lien quand il existe). Vue PURE : aucun calcul métier ici, on ne fait que
 * regrouper par journal ce que le pipeline a qualifié. Voir
 * docs/PIGE_PRO_INGESTION.md.
 */
export default function PigePage() {
  const [periode, setPeriode] = useState<string>('7d');
  const [recherche, setRecherche] = useState('');

  const heures = PERIODES.find((p) => p.cle === periode)?.heures;
  const { data: actualites, isLoading } = useActualites({ maxAgeHours: heures });

  // Corpus pige uniquement.
  const pige = useMemo(
    () => (actualites ?? []).filter((a) => a.source_type === 'pige'),
    [actualites],
  );

  const pigeFiltree = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return pige;
    return pige.filter(
      (a) =>
        a.titre?.toLowerCase().includes(terme) ||
        a.resume?.toLowerCase().includes(terme) ||
        a.source_nom?.toLowerCase().includes(terme) ||
        a.tags?.some((t) => t.toLowerCase().includes(terme)),
    );
  }, [pige, recherche]);

  // Regroupement par journal, journaux triés par nombre d'articles décroissant,
  // articles d'un journal triés par date de parution décroissante (dates nulles
  // en fin de liste).
  const parJournal = useMemo(() => {
    const map = new Map<string, Actualite[]>();
    for (const a of pigeFiltree) {
      const journal = (a.source_nom || 'Journal non identifié').trim();
      const liste = map.get(journal) ?? [];
      liste.push(a);
      map.set(journal, liste);
    }
    for (const liste of map.values()) {
      liste.sort((x, y) => {
        const tx = x.date_publication ? new Date(x.date_publication).getTime() : 0;
        const ty = y.date_publication ? new Date(y.date_publication).getTime() : 0;
        return ty - tx;
      });
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [pigeFiltree]);

  const totalJournaux = parJournal.length;

  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader
          titre="Pige presse"
          description="Revue de presse des journaux suivis — articles fournis par le prestataire de pige, nommés et datés. Séparée du reste de la Veille."
          icon={ScrollText}
        />

        {/* Sélecteur de période */}
        <div className="flex flex-wrap items-center gap-2">
          {PERIODES.map((p) => (
            <Button
              key={p.cle}
              variant={periode === p.cle ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setPeriode(p.cle)}
            >
              {p.label}
            </Button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher (titre, journal, thème)…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 p-5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pige.length === 0 ? (
          // Aucune pige : on distingue « pas encore branchée » d'une recherche vide.
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <ScrollText className="h-12 w-12 text-muted-foreground/50" aria-hidden />
              <p className="text-sm font-medium">La pige presse n’est pas encore alimentée</p>
              <p className="max-w-md text-xs text-muted-foreground">
                Cet écran affiche les articles livrés par le prestataire de pige
                (l’Argus, Cision ou une agence), via le point d’entrée sécurisé
                <code className="mx-1 rounded bg-muted px-1 py-0.5">import-pige</code>.
                Dès qu’une livraison est branchée, les journaux et leurs articles
                apparaissent ici, nommés et datés.
              </p>
            </CardContent>
          </Card>
        ) : pigeFiltree.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Search className="h-10 w-10 text-muted-foreground/50" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Aucun article de pige ne correspond à « {recherche} » sur cette période.
              </p>
              <Button variant="outline" size="sm" onClick={() => setRecherche('')}>
                Effacer la recherche
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {pigeFiltree.length} article{pigeFiltree.length > 1 ? 's' : ''} ·{' '}
              {totalJournaux} journal{totalJournaux > 1 ? 'aux' : ''}
            </p>

            <div className="space-y-6">
              {parJournal.map(([journal, articles]) => (
                <div key={journal} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 bg-primary/10 text-primary">
                      <ScrollText className="h-3.5 w-3.5" aria-hidden />
                      {journal}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {articles.length} article{articles.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <Card>
                    <CardContent className="divide-y p-0">
                      {articles.map((a) => (
                        <div key={a.id} className="p-4">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" aria-hidden />
                            {dateLisible(a.date_publication)}
                          </div>
                          <p className="mt-0.5 text-sm font-medium leading-tight">
                            {nettoyerExtrait(a.titre)}
                          </p>
                          {a.resume && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {nettoyerExtrait(a.resume)}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {(a.tags ?? [])
                              .filter((t) => t.toLowerCase() !== 'pige')
                              .slice(0, 4)
                              .map((t) => (
                                <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">
                                  {t}
                                </Badge>
                              ))}
                            {a.source_url && (
                              <a
                                href={a.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                              >
                                Lire <ExternalLink className="h-3 w-3" aria-hidden />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
