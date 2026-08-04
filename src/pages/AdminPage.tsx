import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search, Settings, SlidersHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SystemHealthWidget } from '@/components/admin/SystemHealthWidget';
import { PageContainer, PageHeader } from '@/components/common';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import {
  GROUPES_REGLAGES, ZONES_REGLAGES, ORDRE_ZONES,
  type EntreeReglage,
} from '@/config/reglages';
import { cn } from '@/lib/utils';

/**
 * Page des reglages, anciennement « Administration ».
 *
 * L'audit d'experience a releve vingt-cinq cartes reparties dans quatre
 * sections dont le classement pretait a confusion : la formation, la
 * presentation et la documentation technique se trouvaient sous
 * « Communication », les reglages de fraicheur et de notation sous
 * « Communication » egalement, alors qu'ils concernent le traitement des
 * donnees. Chaque carte occupait par ailleurs une surface importante, imposant
 * un defilement long sans possibilite de recherche.
 *
 * La refonte apporte trois changements. Les entrees sont regroupees par
 * question metier plutot que par module technique. Une recherche filtre
 * l'ensemble, en tenant compte des anciens noms pour que les habitues
 * retrouvent leurs reperes. Enfin les cartes deviennent des lignes compactes,
 * ce qui permet d'embrasser un groupe entier d'un seul regard.
 */
export default function AdminPage() {
  const { data: stats, isLoading } = useAdminStats();
  const { hasPermission } = useUserPermissions();
  const [recherche, setRecherche] = useState('');

  /** Formate la pastille de statistique associee a une entree. */
  const pastille = (entree: EntreeReglage): string | undefined => {
    if (!entree.statistique || !stats) return undefined;
    switch (entree.statistique) {
      case 'usersActifs':
        return stats.usersActifs ? `${stats.usersActifs} actifs` : undefined;
      case 'actionsAudit24h':
        return stats.actionsAudit24h ? `${stats.actionsAudit24h} sur 24 h` : undefined;
      case 'motsClesActifs':
        return stats.motsClesActifs ? `${stats.motsClesActifs} actifs` : undefined;
      case 'sourcesActives':
        return stats.sourcesActives ? `${stats.sourcesActives} actives` : undefined;
      case 'alertesNonLues':
        return stats.alertesNonLues ? `${stats.alertesNonLues} non lues` : undefined;
      case 'totalActeurs':
        return stats.totalActeurs ? `${stats.totalActeurs} acteurs` : undefined;
      case 'newslettersEnAttente':
        return stats.newslettersEnAttente
          ? `${stats.newslettersEnAttente} en attente`
          : undefined;
      case 'derniereCollecte':
        return stats.derniereCollecte
          ? formatDistanceToNow(new Date(stats.derniereCollecte), {
              addSuffix: true,
              locale: fr,
            })
          : 'jamais exécutée';
      default:
        return undefined;
    }
  };

  /** Une pastille d'alerte se distingue visuellement d'une simple information. */
  const estAlerte = (entree: EntreeReglage): boolean => {
    if (entree.statistique === 'alertesNonLues') return (stats?.alertesNonLues ?? 0) > 0;
    if (entree.statistique === 'newslettersEnAttente')
      return (stats?.newslettersEnAttente ?? 0) > 0;
    if (entree.statistique === 'derniereCollecte') return !stats?.derniereCollecte;
    return false;
  };

  const groupesVisibles = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return GROUPES_REGLAGES.map((groupe) => ({
      ...groupe,
      entrees: groupe.entrees.filter((entree) => {
        if (!hasPermission(entree.permission)) return false;
        if (!terme) return true;
        return (
          entree.titre.toLowerCase().includes(terme) ||
          entree.description.toLowerCase().includes(terme) ||
          groupe.titre.toLowerCase().includes(terme) ||
          (entree.synonymes ?? []).some((synonyme) => synonyme.toLowerCase().includes(terme))
        );
      }),
    })).filter((groupe) => groupe.entrees.length > 0);
  }, [recherche, hasPermission, stats]);

  // La Console technique (exploitation) est réservée aux profils habilités :
  // elle ne doit jamais encombrer le quotidien de la DIRCOM. Le droit dédié
  // `access_console_technique` (activable par rôle) la masque entièrement pour
  // qui ne l'a pas — indépendamment des permissions fines de chaque entrée.
  const voitConsoleTechnique = hasPermission('access_console_technique');

  /** Regroupe les groupes visibles par espace, dans l'ordre défini. */
  const zonesVisibles = useMemo(() => {
    return ORDRE_ZONES.filter((zone) => zone !== 'console' || voitConsoleTechnique)
      .map((zone) => ({
        zone,
        meta: ZONES_REGLAGES[zone],
        groupes: groupesVisibles.filter((g) => g.zone === zone),
      }))
      .filter((z) => z.groupes.length > 0);
  }, [groupesVisibles, voitConsoleTechnique]);

  // Compte et état vide se basent sur ce qui est RÉELLEMENT affiché (Console
  // masquée comprise), pour que la recherche ne promette pas un résultat caché.
  const nbVisibles = zonesVisibles.reduce(
    (total, z) => total + z.groupes.reduce((n, g) => n + g.entrees.length, 0),
    0,
  );

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          titre="Administration"
          description="Configuration et exploitation de la plateforme — hors du produit éditorial de la DIRCOM."
          icon={Settings}
        />

        <SystemHealthWidget
          lastCollecteTime={stats?.derniereCollecte ?? null}
          lastCollecteStatus={stats?.lastCollecteStatus ?? null}
          lastCollecteDuration={stats?.lastCollecteDuration ?? null}
          articlesLast24h={stats?.articlesLast24h ?? 0}
          isLoading={isLoading}
        />

        <div className="space-y-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un réglage…"
              aria-label="Rechercher un réglage"
              className="min-h-11 pl-9"
            />
          </div>
          {recherche && (
            <p className="text-xs text-muted-foreground" role="status">
              {nbVisibles === 0
                ? 'Aucun réglage ne correspond à cette recherche.'
                : `${nbVisibles} réglage${nbVisibles > 1 ? 's' : ''} trouvé${nbVisibles > 1 ? 's' : ''}.`}
            </p>
          )}
        </div>

        {zonesVisibles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <SlidersHorizontal className="h-10 w-10 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {recherche
                  ? 'Essayez un autre mot, ou parcourez les groupes en effaçant la recherche.'
                  : 'Aucun réglage accessible avec vos permissions actuelles.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {zonesVisibles.map(({ zone, meta, groupes }) => (
              <section key={zone} aria-labelledby={`zone-${zone}`} className="space-y-5">
                <div
                  className={cn(
                    'rounded-xl border-l-4 bg-muted/30 px-4 py-3',
                    meta.ton === 'technique' && 'border-l-amber-500 bg-amber-500/5',
                    meta.ton === 'neutre' && 'border-l-primary',
                  )}
                >
                  <h2 id={`zone-${zone}`} className="text-base font-semibold">
                    {meta.titre}
                    {meta.ton === 'technique' && (
                      <Badge variant="secondary" className="ml-2 align-middle text-[10px] font-normal">
                        profils techniques
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>

                {groupes.map((groupe) => (
                  <section key={groupe.id} aria-labelledby={`groupe-${groupe.id}`} className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <groupe.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0">
                        <h3 id={`groupe-${groupe.id}`} className="text-sm font-semibold">
                          {groupe.titre}
                        </h3>
                        <p className="text-xs text-muted-foreground">{groupe.question}</p>
                      </div>
                    </div>

                    <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {groupe.entrees.map((entree) => {
                        const valeur = pastille(entree);
                        return (
                          <li key={entree.id}>
                            <Link
                              to={entree.path}
                              className="flex min-h-11 items-start gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span
                                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                                aria-hidden
                              >
                                <entree.icon className="h-4.5 w-4.5" />
                              </span>
                              <span className="min-w-0 flex-1 space-y-0.5">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">{entree.titre}</span>
                                  {valeur && (
                                    <Badge
                                      variant={estAlerte(entree) ? 'destructive' : 'secondary'}
                                      className="shrink-0 text-[10px] font-normal"
                                    >
                                      {valeur}
                                    </Badge>
                                  )}
                                </span>
                                <span className="block text-xs leading-relaxed text-muted-foreground">
                                  {entree.description}
                                </span>
                              </span>
                              <ChevronRight
                                className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/50"
                                aria-hidden
                              />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </section>
            ))}
          </div>
        )}

        <footer className="border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            ANSUT Radar · hébergé sur Lovable Cloud ·{' '}
            <Link
              to="/admin/documentation"
              className="rounded-sm transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              documentation technique
            </Link>
          </p>
        </footer>
      </div>
    </PageContainer>
  );
}
