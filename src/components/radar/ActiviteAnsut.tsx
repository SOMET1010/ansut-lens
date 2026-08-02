import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  ExternalLink,
  Facebook,
  Globe,
  Handshake,
  Heart,
  Linkedin,
  MapPin,
  MessageCircle,
  Megaphone,
  RefreshCw,
  Target,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/ui/relative-time';
import { supabase } from '@/integrations/supabase/client';
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';
import { useAnsutPublications } from '@/hooks/useAnsutPublications';
import { synthetiserPublications } from '@/lib/syntheseAnsut';

/**
 * « L'ANSUT récemment » — la voix propre de l'ANSUT, en tête d'accueil.
 *
 * Première des quatre questions de l'écran : « qu'a fait ou annoncé l'ANSUT
 * récemment ? ». On part de ce que l'agence publie elle-même — le signal le plus
 * direct de ses priorités — sur une fenêtre large (30 j par défaut), avec une
 * synthèse des programmes, partenaires, territoires et échéances cités. Chaque
 * élément est tiré du texte réel des publications, donc adossé à une source
 * datée. L'absence de publication reste un signal, affiché honnêtement.
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

/**
 * Choix d'affichage de la date, honnête par construction.
 *
 * On ne dispose pas toujours de la date de publication d'origine (les réseaux
 * scrappés ne l'exposent pas toujours). Quand elle est connue et nettement
 * antérieure à la collecte, on l'affiche (« Publié … »). Sinon on n'invente
 * rien : on indique la date de COLLECTE (« Collecté … ») en précisant que la
 * date d'origine n'est pas vérifiée. Fini les vidéos d'un an affichées « il y a
 * 39 minutes ».
 */
function choisirDate(pub: {
  date_publication: string | null;
  collecte_le: string | null;
}): { mode: 'publie' | 'collecte'; date: string } | null {
  const pubMs = pub.date_publication ? new Date(pub.date_publication).getTime() : NaN;
  const colMs = pub.collecte_le ? new Date(pub.collecte_le).getTime() : NaN;
  const dateReelle = !Number.isNaN(pubMs) && (Number.isNaN(colMs) || colMs - pubMs > 24 * 3600 * 1000);
  if (dateReelle) return { mode: 'publie', date: pub.date_publication as string };
  if (!Number.isNaN(colMs)) return { mode: 'collecte', date: pub.collecte_le as string };
  return null;
}

interface Props {
  /** Fenêtre de fraîcheur, en jours. */
  joursFenetre?: number;
}

/** Ligne de synthèse (programmes / partenaires / territoires / échéances). */
function LigneSynthese({
  icon: Icon,
  libelle,
  valeurs,
}: {
  icon: LucideIcon;
  libelle: string;
  valeurs: string[];
}) {
  if (valeurs.length === 0) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span className="sr-only">{libelle} : </span>
      <div className="flex flex-wrap gap-1.5">
        {valeurs.map((v) => (
          <Badge key={v} variant="secondary" className="text-[11px] font-normal">
            {v}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function ActiviteAnsut({ joursFenetre = 30 }: Props) {
  const { data: publications, isLoading, refetch } = useAnsutPublications(6, joursFenetre * 24);
  const [collecteEnCours, setCollecteEnCours] = useState(false);

  const synthese = useMemo(
    () => synthetiserPublications(publications ?? []),
    [publications],
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
      console.error('[ActiviteAnsut] collecte impossible :', e);
      toast.error('La collecte n’a pas pu démarrer', {
        description: 'Vérifiez les comptes ANSUT et la clé Firecrawl dans les réglages.',
      });
    } finally {
      setCollecteEnCours(false);
    }
  };

  const aDesPublications = (publications ?? []).length > 0;

  return (
    <section aria-labelledby="activite-ansut-titre" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="activite-ansut-titre"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Megaphone className="h-4 w-4 text-primary" aria-hidden />
            L’ANSUT récemment
          </h2>
          <p className="text-xs text-muted-foreground">
            Ce que l’ANSUT a publié et annoncé ces {joursFenetre} derniers jours.
          </p>
        </div>
        <Button asChild variant="link" size="sm" className="h-auto shrink-0 p-0">
          <Link to="/communication">
            Notre communication
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !aDesPublications ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-2 py-5">
            <p className="text-sm font-medium">
              Aucune publication de l’ANSUT sur les {joursFenetre} derniers jours.
            </p>
            <p className="text-xs text-muted-foreground">
              Soit rien n’a été publié (un silence est aussi un signal), soit la collecte des
              réseaux officiels de l’ANSUT n’a pas encore tourné.
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
          {/* Synthèse : programmes mis en avant, partenaires, territoires, échéances. */}
          {(synthese.programmes.length > 0 ||
            synthese.partenaires.length > 0 ||
            synthese.localites.length > 0 ||
            synthese.echeances.length > 0) && (
            <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/[0.03] p-3.5">
              <LigneSynthese
                icon={Target}
                libelle="Programmes mis en avant"
                valeurs={synthese.programmes.map((p) => `${p.code} · ${p.nom}`)}
              />
              <LigneSynthese
                icon={Handshake}
                libelle="Partenaires cités"
                valeurs={synthese.partenaires}
              />
              <LigneSynthese icon={MapPin} libelle="Territoires cités" valeurs={synthese.localites} />
              <LigneSynthese
                icon={CalendarClock}
                libelle="Échéances annoncées"
                valeurs={synthese.echeances}
              />
            </div>
          )}

          {/* Publications récentes : plateforme, date honnête et source visible. */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(publications ?? []).map((pub) => {
              const plateforme = (pub.plateforme || '').toLowerCase();
              const Icone = ICONES[plateforme] ?? Globe;
              const label = LABELS[plateforme] ?? 'Source ANSUT';
              const lien = pub.url_original;
              const dateInfo = choisirDate(pub);
              return (
                <Card key={pub.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Icone className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="font-medium text-foreground">{pub.auteur || 'ANSUT'}</span>
                      <span aria-hidden>·</span>
                      <span>{label}</span>
                      {dateInfo && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1">
                            {dateInfo.mode === 'publie' ? 'Publié' : 'Collecté'}{' '}
                            <RelativeTime date={dateInfo.date} />
                          </span>
                        </>
                      )}
                    </div>

                    {dateInfo?.mode === 'collecte' && (
                      <p className="text-[10px] italic text-muted-foreground/70">
                        Date d’origine non vérifiée.
                      </p>
                    )}

                    <p className="line-clamp-3 text-sm">{nettoyerExtrait(pub.contenu)}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3" aria-hidden /> {pub.likes_count}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" aria-hidden /> {pub.comments_count}
                        </span>
                      </div>
                      {lien && (
                        <a
                          href={lien}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          Voir sur {label}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      )}
                    </div>
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
