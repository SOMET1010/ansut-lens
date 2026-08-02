import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  ExternalLink,
  Facebook,
  Globe,
  Handshake,
  Linkedin,
  MapPin,
  Megaphone,
  RefreshCw,
  Tag,
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
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';
import { useAnsutPublications } from '@/hooks/useAnsutPublications';
import { synthetiserPublications } from '@/lib/syntheseAnsut';
import { choisirDatePublication } from '@/lib/datesPublication';

/**
 * Couche 1 — « Notre communication ».
 *
 * Répond à : « quels thèmes l'ANSUT met-elle actuellement en avant ? ». Les
 * réseaux et le site de l'ANSUT sont un CAPTEUR de communication : ce qu'elle
 * publie révèle ses priorités du moment. C'est un signal de communication, pas
 * une vérité stratégique (le plan validé, lui, vit dans la connaissance).
 *
 * On montre les thèmes portés (déduits des publications, explicables) et les
 * dernières prises de parole datées honnêtement. Aucun KPI, aucun pilotage.
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

/** Fenêtre de la communication ANSUT (jours). */
const FENETRE_JOURS = 30;

function LigneChips({
  icon: Icon,
  valeurs,
}: {
  icon: LucideIcon;
  valeurs: string[];
}) {
  if (valeurs.length === 0) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
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

export function NotreCommunication() {
  const { data: publications, isLoading, refetch } = useAnsutPublications(6, FENETRE_JOURS * 24);
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
      console.error('[NotreCommunication] collecte impossible :', e);
      toast.error('La collecte n’a pas pu démarrer', {
        description: 'Vérifiez les comptes ANSUT et la clé Firecrawl dans les réglages.',
      });
    } finally {
      setCollecteEnCours(false);
    }
  };

  const aDesPublications = (publications ?? []).length > 0;
  const aDesThemes =
    synthese.programmes.length > 0 ||
    synthese.partenaires.length > 0 ||
    synthese.localites.length > 0 ||
    synthese.echeances.length > 0;

  return (
    <section aria-labelledby="notre-com-titre" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="notre-com-titre"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Megaphone className="h-4 w-4 text-primary" aria-hidden />
            Notre communication
          </h2>
          <p className="text-xs text-muted-foreground">
            Les thèmes que l’ANSUT met en avant en ce moment — un signal de communication, pas une
            vérité stratégique.
          </p>
        </div>
        <Button asChild variant="link" size="sm" className="h-auto shrink-0 p-0">
          <Link to="/communication">
            Tout voir
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : !aDesPublications ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-2 py-5">
            <p className="text-sm font-medium">
              Aucune communication récente de l’ANSUT collectée ({FENETRE_JOURS} j).
            </p>
            <p className="text-xs text-muted-foreground">
              Soit rien n’a été publié, soit la collecte des réseaux officiels n’a pas encore tourné.
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
          {/* Thèmes / partenaires / territoires / échéances mis en avant. */}
          {aDesThemes && (
            <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/[0.03] p-3.5">
              <LigneChips
                icon={Tag}
                valeurs={synthese.programmes.map((p) => `${p.code} · ${p.nom}`)}
              />
              <LigneChips icon={Handshake} valeurs={synthese.partenaires} />
              <LigneChips icon={MapPin} valeurs={synthese.localites} />
              <LigneChips icon={CalendarClock} valeurs={synthese.echeances} />
            </div>
          )}

          {/* Dernières prises de parole, datées honnêtement et sourcées. */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(publications ?? []).slice(0, 4).map((pub) => {
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
                      {dateInfo && (
                        <>
                          <span aria-hidden>·</span>
                          <span>
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
