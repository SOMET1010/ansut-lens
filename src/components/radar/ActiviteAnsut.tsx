import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Facebook,
  Globe,
  Heart,
  Linkedin,
  MessageCircle,
  Megaphone,
  Twitter,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/ui/relative-time';
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
  const { data: publications, isLoading } = useAnsutPublications(4, maxAgeHours);

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
          <CardContent className="flex flex-col items-start gap-1 py-5">
            <p className="text-sm font-medium">L’ANSUT n’a rien publié depuis 24 heures.</p>
            <p className="text-xs text-muted-foreground">
              Un silence est aussi un signal de visibilité. Voir la communication pour agir.
            </p>
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
