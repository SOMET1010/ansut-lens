import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Facebook,
  Globe,
  Heart,
  Linkedin,
  MessageCircle,
  Megaphone,
  RefreshCw,
  Twitter,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/ui/relative-time';
import { supabase } from '@/integrations/supabase/client';
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';
import { useAnsutPublications } from '@/hooks/useAnsutPublications';

/**
 * « L'ANSUT ce matin » — les publications propres de l'ANSUT en tête d'accueil.
 *
 * Le pilotage commence par notre propre voix : avant la presse extérieure, la
 * page montre ce que l'ANSUT a publié. L'absence de publication est elle-même un
 * signal (un silence de visibilité), affiché honnêtement plutôt que masqué.
 */

const ICONES: Record<string, LucideIcon> = {
  linkedin: Linkedin,
  twitter: Twitter,
  x: Twitter,
  facebook: Facebook,
  site: Globe,
  web: Globe,
};

interface Props {
  /** Fenêtre de fraîcheur, en heures (accueil « ce matin »). */
  maxAgeHours?: number;
}

export function ActiviteAnsut({ maxAgeHours = 24 }: Props) {
  const { data: publications, isLoading, refetch } = useAnsutPublications(4, maxAgeHours);
  const [collecteEnCours, setCollecteEnCours] = useState(false);

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

  return (
    <section aria-labelledby="activite-ansut-titre" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="activite-ansut-titre"
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
          >
            <Megaphone className="h-4 w-4" aria-hidden />
            L’ANSUT ce matin
          </h2>
          <p className="text-xs text-muted-foreground">
            Ce que nous avons publié et communiqué récemment.
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
      ) : (publications ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-2 py-5">
            <p className="text-sm font-medium">Aucune publication de l’ANSUT sur les dernières 24 heures.</p>
            <p className="text-xs text-muted-foreground">
              Soit rien n’a été publié (un silence est aussi un signal), soit la collecte des
              réseaux ANSUT n’a pas encore tourné.
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
        <div className="grid gap-3 sm:grid-cols-2">
          {(publications ?? []).map((pub) => {
            const Icone = ICONES[(pub.plateforme || '').toLowerCase()] ?? Globe;
            const lien = pub.url_original;
            const contenu = (
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icone className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate font-medium text-foreground">
                    {pub.auteur || 'ANSUT'}
                  </span>
                  {pub.date_publication && (
                    <>
                      <span aria-hidden>·</span>
                      <RelativeTime date={pub.date_publication} />
                    </>
                  )}
                </div>
                <p className="line-clamp-3 text-sm">{nettoyerExtrait(pub.contenu)}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3 w-3" aria-hidden /> {pub.likes_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" aria-hidden /> {pub.comments_count}
                  </span>
                </div>
              </CardContent>
            );
            return lien ? (
              <Card key={pub.id} className="transition-colors hover:border-primary/40">
                <a href={lien} target="_blank" rel="noopener noreferrer" className="block">
                  {contenu}
                </a>
              </Card>
            ) : (
              <Card key={pub.id}>{contenu}</Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
