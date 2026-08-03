import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  ExternalLink,
  Facebook,
  Globe,
  Handshake,
  Linkedin,
  Megaphone,
  Minus,
  RefreshCw,
  Sparkle,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/ui/relative-time';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';
import { useAnsutPublications } from '@/hooks/useAnsutPublications';
import { choisirDatePublication } from '@/lib/datesPublication';
import {
  profilCommunication,
  type EvolutionType,
  type TypeCommunication,
} from '@/lib/profilCommunication';

/**
 * Couche 1 — « Notre communication ».
 *
 * Ce n'est plus une simple liste de publications : c'est un profil de la
 * communication de l'ANSUT dans le temps. À partir de la date RÉELLE de
 * publication et d'une fenêtre glissante (30/60/90 j), on montre :
 *   - un résumé des thèmes principaux (fréquence) ;
 *   - leur évolution (émergent / en hausse / en baisse / disparu) ;
 *   - les publications récentes encore vivantes (non expirées).
 *
 * Les contenus sans date réelle ou expirés sont archivés d'office : on préfère
 * « Aucune communication récente » plutôt que de remonter d'anciens contenus.
 */

const ICONES: Record<string, LucideIcon> = {
  linkedin: Linkedin,
  twitter: Twitter,
  x: Twitter,
  facebook: Facebook,
  youtube: Youtube,
  site: Globe,
  web: Globe,
  website: Globe,
};

const LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  x: 'X',
  facebook: 'Facebook',
  youtube: 'YouTube',
  site: 'Site ANSUT',
  web: 'Site ANSUT',
  website: 'Site ANSUT',
};

const TYPE_LABEL: Record<TypeCommunication, string> = {
  evenement: 'Événement',
  campagne: 'Campagne',
  institutionnel: 'Institutionnel',
  actualite: 'Actualité',
};

const EVOLUTION_CFG: Record<
  EvolutionType,
  { icon: LucideIcon; libelle: string; classe: string }
> = {
  emergent: { icon: Sparkle, libelle: 'Émergent', classe: 'text-primary' },
  hausse: { icon: ArrowUp, libelle: 'En hausse', classe: 'text-[hsl(var(--signal-positive))]' },
  baisse: { icon: ArrowDown, libelle: 'En baisse', classe: 'text-amber-600 dark:text-amber-400' },
  disparu: { icon: Minus, libelle: 'Disparu', classe: 'text-muted-foreground' },
  stable: { icon: Minus, libelle: 'Stable', classe: 'text-muted-foreground' },
};

const FENETRES = [30, 60, 90] as const;

export function NotreCommunication() {
  const [fenetre, setFenetre] = useState<number>(30);
  const [collecteEnCours, setCollecteEnCours] = useState(false);
  const maintenantMs = Date.now();

  // Fenêtre de collecte large : le profil filtre ensuite par date de publication
  // réelle et par TTL. On charge donc un historique suffisant (≈ 1 an).
  const { data: publications, isLoading, refetch } = useAnsutPublications(300, 365 * 24);

  const profil = useMemo(
    () => profilCommunication(publications ?? [], fenetre, maintenantMs),
    [publications, fenetre, maintenantMs],
  );

  const collecter = async () => {
    setCollecteEnCours(true);
    try {
      const { error } = await supabase.functions.invoke('collecte-institutionnelle');
      if (error) throw error;
      toast.success('Collecte lancée', {
        description: 'Les publications de l’ANSUT sont en cours de récupération.',
      });
      await refetch();
    } catch (e) {
      console.error('[NotreCommunication] collecte impossible :', e);
      toast.error('La collecte n’a pas pu démarrer', {
        description: 'Vérifiez les comptes ANSUT et la clé Firecrawl dans les réglages.',
      });
    } finally {
      setCollecteEnCours(false);
    }
  };

  const evolutionsNotables = profil.evolution.filter((e) => e.evolution !== 'stable');

  return (
    <section aria-labelledby="notre-com-titre" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="notre-com-titre"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Megaphone className="h-4 w-4 text-primary" aria-hidden />
            Notre communication
          </h2>
          <p className="text-xs text-muted-foreground">
            Ce que l’ANSUT met en avant dans le temps — un profil de communication, pas une liste.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Fenêtre glissante configurable. */}
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            {FENETRES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFenetre(f)}
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                  fenetre === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={fenetre === f}
              >
                {f} j
              </button>
            ))}
          </div>
          <Button asChild variant="link" size="sm" className="h-auto shrink-0 p-0">
            <Link to="/communication">
              Tout voir
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : profil.total === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-2 py-5">
            <p className="text-sm font-medium">
              Aucune communication récente de l’ANSUT sur les {fenetre} derniers jours.
            </p>
            <p className="text-xs text-muted-foreground">
              Seules les publications à date réelle et non expirées sont comptées. Élargissez la
              fenêtre, ou lancez une collecte.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 gap-2"
              onClick={collecter}
              disabled={collecteEnCours}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${collecteEnCours ? 'animate-spin' : ''}`} aria-hidden />
              Collecter maintenant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Résumé : thèmes principaux de la période. */}
          <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
            <p className="text-sm">
              Ces <span className="font-semibold">{fenetre} derniers jours</span>, l’ANSUT a
              principalement communiqué sur :
            </p>
            <ul className="mt-2 space-y-1.5">
              {profil.themes.slice(0, 5).map((t) => (
                <li key={t.pilierId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 font-medium" title={`${t.code} — ${t.nom}`}>
                    {t.nomCourt}
                  </span>
                  <Badge variant="secondary" className="text-[11px]">
                    {t.count} publication{t.count > 1 ? 's' : ''}
                  </Badge>
                </li>
              ))}
            </ul>

            {/* Profil d'évolution des thèmes. */}
            {evolutionsNotables.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-primary/10 pt-2.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Évolution
                </span>
                {evolutionsNotables.map((e) => {
                  const cfg = EVOLUTION_CFG[e.evolution];
                  const Icone = cfg.icon;
                  return (
                    <span
                      key={e.pilierId}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                        cfg.classe,
                      )}
                      title={`${cfg.libelle} — ${e.avant} → ${e.count} sur ${fenetre} j`}
                    >
                      <Icone className="h-3 w-3" aria-hidden />
                      {e.nomCourt} · {cfg.libelle}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lecture des réseaux officiels : campagnes, événements, partenaires
              portés par l'ANSUT sur la période. */}
          {(profil.campagnes.length > 0 ||
            profil.evenements.length > 0 ||
            profil.partenaires.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {profil.campagnes.length > 0 && (
                <div className="rounded-xl border p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Megaphone className="h-3.5 w-3.5 text-primary" aria-hidden />
                    Campagnes en cours
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {profil.campagnes.map((c) => (
                      <li key={c.id} className="text-sm">
                        {c.url_original ? (
                          <a
                            href={c.url_original}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {c.titre}
                          </a>
                        ) : (
                          c.titre
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {profil.evenements.length > 0 && (
                <div className="rounded-xl border p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />
                    Événements récents
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {profil.evenements.map((e) => (
                      <li key={e.id} className="text-sm">
                        {e.url_original ? (
                          <a
                            href={e.url_original}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {e.titre}
                          </a>
                        ) : (
                          e.titre
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {profil.partenaires.length > 0 && (
                <div className="rounded-xl border p-3 sm:col-span-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Handshake className="h-3.5 w-3.5 text-primary" aria-hidden />
                    Partenaires cités
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profil.partenaires.map((p) => (
                      <Badge key={p} variant="secondary" className="text-[11px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Publications récentes vivantes, datées réellement et sourcées. */}
          <p className="pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Publications récentes
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {profil.publicationsRecentes.map((pub) => {
              const plateforme = (pub.plateforme || '').toLowerCase();
              const Icone = ICONES[plateforme] ?? Globe;
              const label = LABELS[plateforme] ?? 'Source ANSUT';
              const dateInfo = choisirDatePublication(pub);
              return (
                <Card key={pub.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Icone className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="font-medium text-foreground">{pub.auteur || 'ANSUT'}</span>
                      <span aria-hidden>·</span>
                      <span>{label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_LABEL[pub.type]}
                      </Badge>
                      {dateInfo && (
                        <>
                          <span aria-hidden>·</span>
                          <span>
                            Publié <RelativeTime date={dateInfo.date} />
                          </span>
                        </>
                      )}
                    </div>
                    <p className="line-clamp-3 text-sm">{nettoyerExtrait(pub.contenu)}</p>
                    {pub.url_original && (
                      <a
                        href={pub.url_original}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        Voir sur {label}
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
