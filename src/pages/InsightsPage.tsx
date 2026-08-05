import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  ExternalLink,
  Film,
  Handshake,
  Hash,
  Layers,
  Minus,
  Newspaper,
  Radio,
  ThumbsUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useInsightsCommunication, usePresseAnsut } from '@/hooks/useInsightsCommunication';
import {
  calculerInsights,
  calculerEchoMediatique,
  type EchoMediatique,
  type Evolution,
  type StatCompte,
} from '@/lib/insightsCommunication';

/**
 * 📊 Insights Communication.
 *
 * Une seule promesse : en moins de deux minutes, la DIRCOM comprend COMMENT
 * l'ANSUT a communiqué ces 7 / 30 / 90 derniers jours — réseaux, thèmes, types,
 * formats, partenaires, rythme. Uniquement des faits (des publications réelles),
 * jamais de score ni d'estimation. L'engagement n'apparaît que si la plateforme
 * fournit réellement les chiffres.
 */

const FENETRES = [7, 30, 90] as const;

const EVOLUTION: Record<Evolution, { icon: typeof ArrowUp; classe: string; libelle: string }> = {
  hausse: { icon: ArrowUp, classe: 'text-[hsl(var(--signal-positive))]', libelle: 'en hausse' },
  baisse: { icon: ArrowDown, classe: 'text-attention', libelle: 'en baisse' },
  stable: { icon: Minus, classe: 'text-muted-foreground', libelle: 'stable' },
};

/** Liste de barres horizontales (label · barre · valeur), normalisées au max. */
function Barres({ items, vide }: { items: StatCompte[]; vide: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{vide}</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.cle} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-2 text-sm">
          <span className="truncate" title={it.libelle}>
            {it.libelle}
          </span>
          <span className="h-2.5 rounded-full bg-muted" aria-hidden>
            <span
              className="block h-2.5 rounded-full bg-primary"
              style={{ width: `${Math.max((it.count / max) * 100, 4)}%` }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{it.count}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({
  titre,
  icon: Icon,
  children,
}: {
  titre: string;
  icon: typeof Hash;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          {titre}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Écho médiatique — seul indicateur composé de l'écran, et volontairement le
 * plus transparent : période, volumes réels, formule en clair, sources, limites,
 * et les articles comptés en preuves cliquables. Aucun score, aucune estimation.
 * Ce n'est PAS une part de voix (le dénominateur est la communication propre de
 * l'ANSUT, pas l'ensemble des acteurs) — d'où le nom « écho médiatique ».
 */
function CarteEchoMediatique({ echo }: { echo: EchoMediatique }) {
  const periode = `${format(new Date(echo.periodeDebutMs), 'd MMM', { locale: fr })} – ${format(
    new Date(echo.periodeFinMs),
    'd MMM yyyy',
    { locale: fr },
  )}`;
  const ratioTexte =
    echo.ratio === null ? '—' : echo.ratio.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Newspaper className="h-4 w-4 text-primary" aria-hidden />
              Écho médiatique
            </h2>
            <p className="text-xs text-muted-foreground">Reprise presse rapportée à notre propre communication · {periode}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums leading-none">{ratioTexte}</p>
            <p className="text-[11px] text-muted-foreground">article de presse par publication</p>
          </div>
        </div>

        <p className="text-sm">
          <span className="font-semibold tabular-nums">{echo.earned}</span> article
          {echo.earned > 1 ? 's' : ''} de presse citant l’ANSUT pour{' '}
          <span className="font-semibold tabular-nums">{echo.owned}</span> publication
          {echo.owned > 1 ? 's' : ''} de l’ANSUT sur la période.
        </p>

        <dl className="space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <div>
            <dt className="inline font-medium text-foreground">Formule&nbsp;: </dt>
            <dd className="inline">
              articles de presse collectés citant «&nbsp;ANSUT&nbsp;» ÷ publications officielles de
              l’ANSUT, sur la même fenêtre.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">Sources&nbsp;: </dt>
            <dd className="inline">
              presse et médias collectés par RADAR (mention «&nbsp;ANSUT&nbsp;» dans le titre, le
              texte ou les tags) ; publications officielles de l’ANSUT.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">Limites&nbsp;: </dt>
            <dd className="inline">
              appariement par mot-clé (faux positifs et oublis possibles) ; ne couvre que les sources
              déjà collectées, donc non exhaustif ; compare deux corpus distincts (presse vs
              publications propres) — c’est une amplification externe, pas une part de voix ; les
              dates de presse sont celles fournies par la source.
            </dd>
          </div>
        </dl>

        {echo.articles.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-foreground">
              Voir les {echo.articles.length} article{echo.articles.length > 1 ? 's' : ''} comptés
            </summary>
            <ul className="mt-2 space-y-1.5">
              {echo.articles.map((a) => {
                const contenu = (
                  <>
                    <span className="truncate" title={a.titre}>
                      {a.titre}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {a.source ? `${a.source} · ` : ''}
                      {a.dateMs ? format(new Date(a.dateMs), 'd MMM', { locale: fr }) : ''}
                    </span>
                  </>
                );
                return (
                  <li key={a.id}>
                    {a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-primary hover:bg-accent/40 hover:underline"
                      >
                        {contenu}
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                      </a>
                    ) : (
                      <div className="flex items-center justify-between gap-2 px-1 py-0.5">{contenu}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export default function InsightsPage() {
  const [fenetre, setFenetre] = useState<number>(30);
  const maintenantMs = Date.now();
  const { data: publications, isLoading } = useInsightsCommunication(500);
  const { data: presse } = usePresseAnsut(500);

  const ins = useMemo(
    () => calculerInsights(publications ?? [], fenetre, maintenantMs),
    [publications, fenetre, maintenantMs],
  );

  const echo = useMemo(
    () => calculerEchoMediatique(presse ?? [], ins.totalDatees, fenetre, maintenantMs),
    [presse, ins.totalDatees, fenetre, maintenantMs],
  );

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          titre="Insights Communication"
          description="Comment l’ANSUT a communiqué ces derniers jours : réseaux, thèmes, types, formats, partenaires, rythme."
          icon={BarChart3}
          actions={
            <div className="flex items-center gap-1 rounded-lg border p-0.5">
              {FENETRES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFenetre(f)}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
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
          }
        />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : ins.totalDatees === 0 ? (
          <Card className="border-dashed">
            <CardContent className="space-y-1 py-8 text-center">
              <p className="text-sm font-medium">
                Aucune publication datée sur les {fenetre} derniers jours.
              </p>
              {ins.totalNonDatees > 0 && (
                <p className="text-xs text-muted-foreground">
                  {ins.totalNonDatees} publication{ins.totalNonDatees > 1 ? 's' : ''} récente
                  {ins.totalNonDatees > 1 ? 's' : ''} à date d’origine non vérifiée — non comptée
                  {ins.totalNonDatees > 1 ? 's' : ''} pour rester honnête.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Transparence : ce qui est compté vs non daté. */}
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{ins.totalDatees}</span> publication
              {ins.totalDatees > 1 ? 's' : ''} datée{ins.totalDatees > 1 ? 's' : ''} comptée
              {ins.totalDatees > 1 ? 's' : ''} sur {fenetre} j.
              {ins.totalNonDatees > 0 && (
                <> {ins.totalNonDatees} à date non vérifiée, non comptée{ins.totalNonDatees > 1 ? 's' : ''}.</>
              )}
            </p>

            {/* Écho médiatique — indicateur composé, entièrement traçable. */}
            <CarteEchoMediatique echo={echo} />

            <div className="grid gap-4 lg:grid-cols-2">
              {/* 1. Activité par réseau */}
              <Section titre="Activité par réseau" icon={Radio}>
                {ins.parReseau.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune publication datée sur la période.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {ins.parReseau.map((r) => {
                      const evo = EVOLUTION[r.evolution];
                      const EvoIcon = evo.icon;
                      return (
                        <li key={r.cle} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{r.libelle}</span>
                          <span className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className={cn('inline-flex items-center gap-0.5', evo.classe)}>
                              <EvoIcon className="h-3 w-3" aria-hidden />
                              {evo.libelle}
                            </span>
                            <span>~{r.frequenceParSemaine}/sem.</span>
                            <span className="text-base font-semibold text-foreground tabular-nums">
                              {r.count}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>

              {/* 2. Thèmes portés */}
              <Section titre="Thèmes portés" icon={Hash}>
                <Barres items={ins.themes} vide="Aucun thème stratégique détecté sur la période." />
              </Section>

              {/* 3. Types de communication */}
              <Section titre="Types de communication" icon={Layers}>
                <Barres items={ins.types} vide="Aucune publication à classer." />
              </Section>

              {/* 4. Partenaires cités */}
              <Section titre="Partenaires les plus cités" icon={Handshake}>
                <Barres items={ins.partenaires} vide="Aucun partenaire cité sur la période." />
              </Section>

              {/* 5. Formats */}
              <Section titre="Formats utilisés" icon={Film}>
                <Barres items={ins.formats} vide="Format non déterminable." />
              </Section>

              {/* 6. Calendrier éditorial */}
              <Section titre="Calendrier éditorial (par jour)" icon={CalendarDays}>
                <Barres items={ins.calendrier.filter((c) => c.count > 0)} vide="Aucune publication datée." />
              </Section>

              {/* 7. Engagement — uniquement si la plateforme fournit les chiffres */}
              <Section titre="Engagement" icon={ThumbsUp}>
                <div className="space-y-2">
                  {ins.engagement.map((e) =>
                    e.disponible ? (
                      <div key={e.cle} className="text-sm">
                        <span className="font-medium">{e.libelle}</span>
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                          {e.vues > 0 && <>{e.vues.toLocaleString('fr-FR')} vues · </>}
                          {e.likes.toLocaleString('fr-FR')} j’aime · {e.comments.toLocaleString('fr-FR')} comm. ·{' '}
                          {e.shares.toLocaleString('fr-FR')} partages
                        </span>
                      </div>
                    ) : (
                      <div key={e.cle} className="text-sm">
                        <span className="font-medium">{e.libelle}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          Données d’engagement indisponibles pour cette plateforme.
                        </span>
                      </div>
                    ),
                  )}
                  {ins.engagement.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune donnée d’engagement sur la période.</p>
                  )}
                </div>
              </Section>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
