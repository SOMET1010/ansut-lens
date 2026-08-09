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
  Lightbulb,
  Minus,
  Newspaper,
  Radio,
  ThumbsUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { PageContainer, PageHeader, PhraseSynthese } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useInsightsCommunication, usePresseAnsut } from '@/hooks/useInsightsCommunication';
import {
  calculerInsights,
  calculerEchoMediatique,
  construireSyntheseInsights,
  pointsARetenir,
  serieEcho,
  type EchoMediatique,
  type Evolution,
  type InsightsCommunication,
  type StatCompte,
} from '@/lib/insightsCommunication';

/**
 * 📊 Insights — le récit analytique de la communication de l'ANSUT.
 *
 * L'écran ne se contente plus de COMPTER : il RÉPOND, en trois niveaux de lecture,
 * à la question « qu'est-ce que ces chiffres veulent dire pour la communication de
 * l'ANSUT ? ». Niveau 1 « À retenir » (le résultat), niveau 2 « Les chiffres »
 * (les mesures), niveau 3 « La preuve » (méthode, sources, articles). Comme La
 * Matinale : la conclusion d'abord, les preuves ensuite.
 *
 * Discipline Charte : tout ce qui est affiché (le ratio héroïsé, son évolution,
 * les pourcentages « À retenir », la synthèse) est CALCULÉ sur des publications et
 * des articles réels. Aucune tendance, aucun thème, aucun chiffre inventé : quand
 * une donnée manque, elle n'est simplement pas affichée.
 */

const FENETRES = [7, 30, 90] as const;

/** Palette catégorielle des donuts (tokens de charte, re-thémables). */
const COULEURS_DONUT = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-2))',
  'hsl(var(--primary))',
  'hsl(var(--muted-foreground))',
];

const EVOLUTION: Record<Evolution, { icon: typeof ArrowUp; classe: string; libelle: string }> = {
  hausse: { icon: ArrowUp, classe: 'text-confirme', libelle: 'en hausse' },
  baisse: { icon: ArrowDown, classe: 'text-attention', libelle: 'en baisse' },
  stable: { icon: Minus, classe: 'text-muted-foreground', libelle: 'stable' },
};

/** Titre de niveau de lecture (À retenir · Les chiffres · La preuve). */
function NiveauTitre({ index, titre, sous }: { index: number; titre: string; sous: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{index}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{titre}</h2>
      <span className="text-xs text-muted-foreground">· {sous}</span>
    </div>
  );
}

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
            {/* Barre de volume à série unique : marque de données neutre, pas
                de bleu de navigation (charte couleur). */}
            <span
              className="block h-2.5 rounded-full bg-muted-foreground/45"
              style={{ width: `${Math.max((it.count / max) * 100, 4)}%` }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{it.count}</span>
        </li>
      ))}
    </ul>
  );
}

/** Donut catégoriel + légende chiffrée. Représentation des Types de communication. */
function Donut({ items, vide }: { items: StatCompte[]; vide: string }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">{vide}</p>;
  return (
    <div className="flex items-center gap-4">
      <div className="h-28 w-28 shrink-0" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="count"
              nameKey="libelle"
              innerRadius={34}
              outerRadius={54}
              paddingAngle={2}
              stroke="none"
            >
              {items.map((it, i) => (
                <Cell key={it.cle} fill={COULEURS_DONUT[i % COULEURS_DONUT.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {items.map((it, i) => {
          const pct = Math.round((it.count / total) * 100);
          return (
            <li key={it.cle} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: COULEURS_DONUT[i % COULEURS_DONUT.length] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate" title={it.libelle}>
                {it.libelle}
              </span>
              <span className="text-muted-foreground tabular-nums">{pct}&nbsp;%</span>
              <span className="w-6 text-right font-semibold tabular-nums">{it.count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Initiales d'un nom de partenaire pour l'avatar (« Banque Mondiale » → « BM »). */
function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

/** Liste de partenaires avec pastille d'initiales — casse la monotonie des barres. */
function ListeAvatars({ items, vide }: { items: StatCompte[]; vide: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{vide}</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={it.cle} className="flex items-center gap-3 text-sm">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: COULEURS_DONUT[i % COULEURS_DONUT.length] }}
            aria-hidden
          >
            {initiales(it.libelle)}
          </span>
          <span className="min-w-0 flex-1 truncate" title={it.libelle}>
            {it.libelle}
          </span>
          <span className="text-xs text-muted-foreground">
            {it.count} mention{it.count > 1 ? 's' : ''}
          </span>
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
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          {titre}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Micro-courbe SVG de la trajectoire de l'écho presse sur la fenêtre. Comptages
 * bruts par tranche (aucune interpolation). Rendue uniquement si assez de matière
 * pour dessiner une forme honnête ; sinon l'appelant ne l'affiche pas.
 */
function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const w = 132;
  const h = 30;
  const n = data.length;
  const max = Math.max(...data, 1);
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w);
  const y = (v: number) => h - (v / max) * (h - 2) - 1;
  const ligne = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const aire = `0,${h} ${ligne} ${w},${h}`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label="Trajectoire de la reprise presse sur la période"
      preserveAspectRatio="none"
    >
      <polygon points={aire} fill="hsl(var(--primary))" fillOpacity={0.1} />
      <polyline
        points={ligne}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * NIVEAU 1 — le KPI héroïsé. Le cerveau lit le RÉSULTAT (combien d'articles de
 * presse par publication) avant toute méthode. L'évolution n'apparaît que si elle
 * est réellement calculable (deux fenêtres comparables) ; la micro-courbe que si
 * le volume d'articles suffit à dessiner une forme honnête.
 */
function HeroEcho({ echo }: { echo: EchoMediatique }) {
  const ratioTexte =
    echo.ratio === null ? '—' : echo.ratio.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const v = echo.variationPct;
  const serie = serieEcho(echo, 12);
  // Seuil d'honnêteté : sous ~8 articles, une « courbe » serait du bruit.
  const afficherCourbe = echo.earned >= 8;

  return (
    <Card className="border-border bg-muted/20">
      <CardContent className="flex flex-col items-center gap-1 p-6 text-center">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Newspaper className="h-3.5 w-3.5" aria-hidden />
          Écho médiatique
        </p>
        <p className="text-6xl font-bold leading-none tabular-nums text-foreground">{ratioTexte}</p>
        <p className="text-sm text-muted-foreground">
          {echo.ratio === null ? (
            'articles de presse — aucune publication ANSUT datée sur la période'
          ) : (
            <>
              article{echo.ratio >= 2 ? 's' : ''} de presse pour{' '}
              <span className="font-medium text-foreground">1&nbsp;publication ANSUT</span>
            </>
          )}
        </p>
        {v !== null && (
          <p
            className={cn(
              'mt-1 flex items-center gap-1 text-sm font-medium',
              v > 0 ? 'text-confirme' : v < 0 ? 'text-attention' : 'text-muted-foreground',
            )}
          >
            {v > 0 ? <ArrowUp className="h-4 w-4" aria-hidden /> : v < 0 ? <ArrowDown className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
            {v > 0 ? '+' : ''}
            {v}&nbsp;% sur la fenêtre précédente
          </p>
        )}
        {afficherCourbe && (
          <div className="mt-2 flex flex-col items-center gap-0.5">
            <Sparkline data={serie} className="text-primary" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              reprise presse sur la période
            </span>
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {echo.earned} article{echo.earned > 1 ? 's' : ''} de presse · {echo.owned} publication
          {echo.owned > 1 ? 's' : ''} ANSUT
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * NIVEAU 3 — la preuve. Le même chiffre, mais cette fois entièrement traçable :
 * formule, sources, limites, et les articles comptés en preuves cliquables.
 */
function PreuveEcho({ echo }: { echo: EchoMediatique }) {
  const periode = `${format(new Date(echo.periodeDebutMs), 'd MMM', { locale: fr })} – ${format(
    new Date(echo.periodeFinMs),
    'd MMM yyyy',
    { locale: fr },
  )}`;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Newspaper className="h-4 w-4 text-muted-foreground" aria-hidden />
            Comment ce chiffre est établi
          </h3>
          <p className="text-xs text-muted-foreground">
            Reprise presse rapportée à notre propre communication · {periode}
          </p>
        </div>

        <dl className="space-y-1.5 text-xs text-muted-foreground">
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

/** Badges de transparence : ce qui est compté (vérifié) vs mis de côté (non daté). */
function BadgesDatation({ ins }: { ins: InsightsCommunication }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-confirme-border bg-confirme-soft px-2.5 py-1 font-medium text-confirme">
        <span className="h-1.5 w-1.5 rounded-full bg-confirme" aria-hidden />
        {ins.totalDatees} publication{ins.totalDatees > 1 ? 's' : ''} vérifiée{ins.totalDatees > 1 ? 's' : ''}
      </span>
      {ins.totalNonDatees > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" aria-hidden />
          {ins.totalNonDatees} non datée{ins.totalNonDatees > 1 ? 's' : ''}
        </span>
      )}
      <details className="group relative">
        <summary className="cursor-pointer list-none text-primary hover:underline">Voir pourquoi</summary>
        <p className="mt-1.5 max-w-md rounded-md border bg-popover p-2.5 text-xs text-muted-foreground shadow-sm">
          Une publication n’est comptée que si sa <span className="font-medium text-foreground">date d’origine
          est vérifiée</span> (extraite de la source). Les publications à date non vérifiée sont mises
          de côté plutôt que datées faussement — c’est ce qui garantit que les chiffres ci-dessus
          portent bien sur la fenêtre choisie.
        </p>
      </details>
    </div>
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
    () => calculerEchoMediatique(presse ?? [], ins.totalDatees, fenetre, maintenantMs, ins.totalDateesAvant),
    [presse, ins.totalDatees, ins.totalDateesAvant, fenetre, maintenantMs],
  );

  const synthese = useMemo(() => construireSyntheseInsights(ins, echo), [ins, echo]);
  const retenir = useMemo(() => pointsARetenir(ins, echo), [ins, echo]);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          titre="Insights"
          description="Ce que la communication de l’ANSUT raconte ces derniers jours — le résultat d’abord, les preuves ensuite."
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

        {/* Synthèse d'une phrase — signature RADAR, le DG comprend en 5 secondes. */}
        {synthese && <PhraseSynthese contexte={`${fenetre} j`} phrase={synthese} />}

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
            {/* ─────────── NIVEAU 1 — À RETENIR ─────────── */}
            <section className="space-y-3">
              <NiveauTitre index={1} titre="À retenir" sous="le résultat" />
              <HeroEcho echo={echo} />
              <BadgesDatation ins={ins} />
              {retenir.length > 0 && (
                <Card>
                  <CardContent className="space-y-2 p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Lightbulb className="h-4 w-4 text-muted-foreground" aria-hidden />
                      Ce qu’il faut retenir
                    </h3>
                    <ul className="space-y-1.5">
                      {retenir.map((p) => (
                        <li key={p.cle} className="flex gap-2 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
                          <span>{p.texte}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* ─────────── NIVEAU 2 — LES CHIFFRES ─────────── */}
            <section className="space-y-3">
              <NiveauTitre index={2} titre="Les chiffres" sous="les mesures" />
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Activité par réseau — liste rythmée (évolution + fréquence) */}
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

                {/* Thèmes — histogramme */}
                <Section titre="Thèmes portés" icon={Hash}>
                  <Barres items={ins.themes} vide="Aucun thème stratégique détecté sur la période." />
                </Section>

                {/* Types — donut */}
                <Section titre="Types de communication" icon={Layers}>
                  <Donut items={ins.types} vide="Aucune publication à classer." />
                </Section>

                {/* Partenaires — liste avec avatars */}
                <Section titre="Partenaires les plus cités" icon={Handshake}>
                  <ListeAvatars items={ins.partenaires} vide="Aucun partenaire cité sur la période." />
                </Section>

                {/* Formats — barres */}
                <Section titre="Formats utilisés" icon={Film}>
                  <Barres items={ins.formats} vide="Format non déterminable." />
                </Section>

                {/* Calendrier — barres */}
                <Section titre="Calendrier éditorial (par jour)" icon={CalendarDays}>
                  <Barres items={ins.calendrier.filter((c) => c.count > 0)} vide="Aucune publication datée." />
                </Section>

                {/* Engagement — uniquement si la plateforme fournit les chiffres */}
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
            </section>

            {/* ─────────── NIVEAU 3 — LA PREUVE ─────────── */}
            <section className="space-y-3">
              <NiveauTitre index={3} titre="La preuve" sous="méthode & sources" />
              <PreuveEcho echo={echo} />
            </section>
          </>
        )}
      </div>
    </PageContainer>
  );
}
