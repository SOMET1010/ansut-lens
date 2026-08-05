import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Handshake,
  Lightbulb,
  Megaphone,
  Minus,
  Newspaper,
  Sparkle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/ui/relative-time';
import { nettoyerExtrait, nettoyerTitre } from '@/lib/nettoyerExtrait';
import { choisirDatePublication } from '@/lib/datesPublication';
import type { MouvementSujet, Sujet } from '@/lib/sujets';
import type { RecitSujet } from '@/hooks/useRecitsSujets';

/**
 * Carte-sujet — la nouvelle unité de lecture de RADAR : 1 carte = 1 sujet,
 * raconté et prouvé. L'article n'est plus l'information principale, il devient
 * une preuve.
 *
 * Ordre de lecture : titre → état factuel → récit (IA ou factuel) → pourquoi
 * aujourd'hui → preuves dépliables. La carte reste utile même si le récit IA
 * échoue : elle affiche alors le résumé factuel et les preuves.
 */

interface Props {
  sujet: Sujet;
  recit?: RecitSujet;
  recitLoading?: boolean;
  /** Le sujet a-t-il assez de matière pour un récit IA fiable ? */
  suffisant: boolean;
}

const MOUVEMENT: Record<MouvementSujet, { icon: LucideIcon; libelle: string; classe: string }> = {
  emergent: { icon: Sparkle, libelle: 'Émerge depuis hier', classe: 'text-primary' },
  hausse: { icon: ArrowUp, libelle: 'En hausse', classe: 'text-[hsl(var(--signal-positive))]' },
  baisse: { icon: ArrowDown, libelle: 'En baisse', classe: 'text-attention' },
  stable: { icon: Minus, libelle: 'Stable', classe: 'text-muted-foreground' },
};

export function CarteSujet({ sujet, recit, recitLoading, suffisant }: Props) {
  const [preuvesOuvertes, setPreuvesOuvertes] = useState(false);
  const mvt = MOUVEMENT[sujet.mouvement];
  const MvtIcon = mvt.icon;

  const nbPreuves = sujet.nbArticles + sujet.nbPublications;
  const citEx = new Set(recit?.external_content_ids ?? []);
  const citAn = new Set(recit?.ansut_content_ids ?? []);

  // « Pourquoi aujourd'hui » : la lecture IA si disponible, sinon la raison
  // déterministe et explicable calculée à partir des faits.
  const pourquoi = recit?.why_today?.trim() || sujet.pourquoi;

  return (
    <Card className="border-primary/20">
      <CardContent className="space-y-4 p-5">
        {/* Titre + mouvement */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-foreground" title={`${sujet.code} — ${sujet.nom}`}>
            {sujet.nomCourt}
          </h3>
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${mvt.classe}`}>
            <MvtIcon className="h-3.5 w-3.5" aria-hidden />
            {mvt.libelle}
          </span>
        </div>

        {/* État factuel — les chiffres viennent directement des preuves. */}
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{sujet.nbArticles}</span>{' '}
          article{sujet.nbArticles > 1 ? 's' : ''} de veille ·{' '}
          <span className="font-semibold text-foreground">{sujet.nbPublications}</span>{' '}
          publication{sujet.nbPublications > 1 ? 's' : ''} ANSUT
          <span className="text-muted-foreground/70"> — {sujet.periodeJours} derniers jours</span>
        </p>

        {/* Récit — trois états de sécurité. */}
        {!suffisant ? (
          <p className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
            Les sources disponibles ne permettent pas encore de produire un récit fiable sur ce
            sujet. Les contenus existants sont listés ci-dessous, sans conclusion.
          </p>
        ) : recitLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
          </div>
        ) : recit ? (
          <div className="space-y-1.5">
            {recit.headline && <p className="text-sm font-semibold text-foreground">{recit.headline}</p>}
            <p className="text-sm leading-relaxed text-foreground/90">{recit.narrative}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary/80">
              <Sparkles className="h-3 w-3" aria-hidden />
              Lecture IA — adossée aux preuves ci-dessous
            </span>
            {recit.limitations && (
              <p className="text-xs text-muted-foreground">Limites : {recit.limitations}</p>
            )}
          </div>
        ) : (
          // Échec IA : la carte reste utile avec le résumé factuel déterministe.
          <p className="text-sm leading-relaxed text-foreground/90">{sujet.resumeFactuel}</p>
        )}

        {/* Pourquoi ce sujet apparaît aujourd'hui — explicable, sans score. */}
        <div className="flex items-start gap-2 rounded-lg bg-primary/[0.04] p-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              Pourquoi ce sujet aujourd'hui
            </p>
            <p className="mt-0.5 text-sm text-foreground/85">{pourquoi}</p>
          </div>
        </div>

        {/* Preuves dépliables. */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto gap-1.5 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            onClick={() => setPreuvesOuvertes((v) => !v)}
            aria-expanded={preuvesOuvertes}
          >
            {preuvesOuvertes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Voir les preuves ({nbPreuves})
          </Button>

          {preuvesOuvertes && (
            <div className="mt-3 space-y-4">
              {/* Articles de veille */}
              {sujet.articles.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Newspaper className="h-3.5 w-3.5" aria-hidden />
                    Articles de veille ({sujet.articles.length})
                  </p>
                  <ul className="space-y-2">
                    {sujet.articles.map((a) => (
                      <li key={a.id} className="text-sm">
                        <div className="flex items-start gap-1.5">
                          {a.source_url ? (
                            <a
                              href={a.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary hover:underline"
                            >
                              {nettoyerTitre(a.titre)}
                            </a>
                          ) : (
                            <span className="font-medium">{nettoyerTitre(a.titre)}</span>
                          )}
                          {citEx.has(a.id) && (
                            <Badge variant="secondary" className="mt-0.5 shrink-0 text-[9px]">
                              cité
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {a.source_nom ?? 'Source inconnue'}
                          {a.date_publication && (
                            <>
                              {' · '}
                              <RelativeTime date={a.date_publication} />
                            </>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Publications officielles ANSUT */}
              {sujet.publications.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Megaphone className="h-3.5 w-3.5" aria-hidden />
                    Publications ANSUT ({sujet.publications.length})
                  </p>
                  <ul className="space-y-2">
                    {sujet.publications.map((p) => {
                      const d = choisirDatePublication(p);
                      return (
                        <li key={p.id} className="text-sm">
                          <div className="flex items-start gap-1.5">
                            <p className="line-clamp-2 flex-1 text-foreground/90">
                              {nettoyerExtrait(p.contenu) || 'Publication ANSUT'}
                            </p>
                            {citAn.has(p.id) && (
                              <Badge variant="secondary" className="mt-0.5 shrink-0 text-[9px]">
                                cité
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {p.plateforme || 'ANSUT'}
                            {d && (
                              <>
                                {' · '}
                                {d.mode === 'publie' ? 'Publié ' : 'Collecté '}
                                <RelativeTime date={d.date} />
                              </>
                            )}
                            {p.url_original && (
                              <>
                                {' · '}
                                <a
                                  href={p.url_original}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-primary hover:underline"
                                >
                                  voir <ExternalLink className="h-3 w-3" aria-hidden />
                                </a>
                              </>
                            )}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Partenaires / institutions cités */}
              {sujet.partenaires.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Handshake className="h-3.5 w-3.5" aria-hidden />
                    Partenaires / institutions cités
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sujet.partenaires.map((nom) => (
                      <Badge key={nom} variant="outline" className="text-[11px]">
                        {nom}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources originales */}
              {sujet.sources.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" aria-hidden />
                    Sources originales ({sujet.sources.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sujet.sources.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[11px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
