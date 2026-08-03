import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  ChevronRight,
  Info,
  Newspaper,
  Radio,
  Share2,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RelativeTime } from '@/components/ui/relative-time';
import { useBriefing } from '@/hooks/useBriefing';
import {
  ANCRES,
  LIBELLE_NON_INJONCTION,
  type Briefing,
  type ConseilBriefing,
  type EchoBriefing,
  type PointRetenir,
  type Preuve,
  type SignalBriefing,
  type SujetBriefing,
} from '@/lib/briefing';

/**
 * La Matinale — vue 100 % PASSIVE d'un {@link Briefing}.
 *
 * Cette page ne calcule rien : elle rend l'objet métier tel qu'il lui est
 * fourni par `useBriefing`. Toute la logique (qualification, regroupement,
 * écho médiatique, terrain vacant) vit en amont dans les moteurs existants et
 * l'adaptateur temporaire. Le jour où le Briefing sera persisté par le
 * pipeline, cette vue ne changera pas.
 *
 * Recette visée : en moins de 30 s, un responsable de la communication comprend
 * ce qui compte aujourd'hui, pourquoi, et où vérifier les preuves.
 *
 * Robustesse : si l'IA échoue, le briefing existe toujours (chapô = résumé
 * factuel) ; les sections sans donnée disparaissent — jamais d'écran vide.
 * Accessibilité : sémantique, sans image, sans animation, navigable au clavier,
 * exploitable sur écran portable.
 */

function capitaliser(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function heure(ms: number): string {
  return format(new Date(ms), 'HH:mm');
}

function courtJourHeure(ms: number): string {
  return format(new Date(ms), 'dd/MM HH:mm');
}

/* ------------------------------------------------------------------ Preuves */

function PreuveLien({ preuve }: { preuve: Preuve }) {
  const contenu = (
    <>
      <span className="matinale-mono shrink-0 text-[0.66rem] text-[var(--m-ink-faint)]">
        {preuve.source}
      </span>
      <span className="text-[var(--m-ink-soft)]">{preuve.titre}</span>
    </>
  );
  const base = 'flex items-baseline gap-2 rounded px-1.5 py-1 text-[0.84rem] leading-snug';
  if (preuve.url) {
    return (
      <a
        href={preuve.url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          base,
          'transition-colors hover:bg-[var(--m-paper-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--m-accent)]',
        )}
      >
        {contenu}
      </a>
    );
  }
  return <span className={base}>{contenu}</span>;
}

function GroupesPreuves({ preuves }: { preuves: Preuve[] }) {
  const groupes = [
    { type: 'ansut' as const, label: 'Publications ANSUT' },
    { type: 'presse' as const, label: 'Reprise presse' },
    { type: 'partenaire' as const, label: 'Partenaires cités' },
  ];
  return (
    <>
      {groupes.map((g) => {
        const items = preuves.filter((p) => p.type === g.type);
        if (items.length === 0) return null;
        return (
          <div key={g.type} className="mt-3 first:mt-0">
            <p className="matinale-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--m-ink-faint)]">
              {g.label}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {items.map((p) => (
                <li key={p.id}>
                  <PreuveLien preuve={p} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

function PourquoiCeSujet({ sujet }: { sujet: SujetBriefing }) {
  if (sujet.nbPreuves === 0) return null;
  return (
    <Collapsible className="mt-5 overflow-hidden rounded-lg border border-[var(--m-line)] bg-[var(--m-paper-2)]">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left text-[0.9rem] font-semibold text-[var(--m-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--m-accent)]">
        <ChevronRight
          className="h-4 w-4 shrink-0 text-[var(--m-accent)] transition-transform group-data-[state=open]:rotate-90"
          aria-hidden
        />
        <span className="matinale-serif italic">Pourquoi ce sujet&nbsp;?</span>
        <span className="matinale-mono ml-auto text-[0.68rem] font-normal tabular-nums text-[var(--m-ink-faint)]">
          {sujet.nbPreuves} {sujet.nbPreuves > 1 ? 'preuves' : 'preuve'}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-[var(--m-line)] px-4 pb-4 pt-1">
        <GroupesPreuves preuves={sujet.preuves} />
        {sujet.limites && (
          <p className="mt-3 border-t border-dashed border-[var(--m-line)] pt-2 text-[0.72rem] italic text-[var(--m-ink-faint)]">
            Limites du récit&nbsp;: {sujet.limites}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* -------------------------------------------------------------- À retenir */

function tonClasses(ton: PointRetenir['ton']): string {
  if (ton === 'attention') return 'text-[var(--m-signal)]';
  return 'text-[var(--m-accent)]';
}

function IconePorte({ ton }: { ton: PointRetenir['ton'] }) {
  const cls = cn('h-5 w-5 shrink-0', tonClasses(ton));
  if (ton === 'attention') return <AlertTriangle className={cls} aria-hidden />;
  if (ton === 'positif') return <Target className={cls} aria-hidden />;
  return <Star className={cls} aria-hidden />;
}

function ARetenir({ points }: { points: PointRetenir[] }) {
  if (points.length === 0) return null;
  return (
    <nav
      aria-label="À retenir ce matin"
      className="mt-5 rounded-xl border border-[var(--m-line)] bg-[var(--m-paper-2)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--m-line-soft)] px-4 py-2.5">
        <p className="matinale-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--m-ink-faint)]">
          À retenir ce matin
        </p>
        <a
          href={`#${ANCRES.sujetUne}`}
          className="matinale-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--m-accent)] hover:underline"
        >
          Voir tous les sujets →
        </a>
      </div>
      <ul className="grid gap-px sm:grid-cols-3">
        {points.map((p) => (
          <li key={p.ancre}>
            <a
              href={p.ancre}
              className="flex h-full gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--m-paper-3)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--m-accent)]"
            >
              <IconePorte ton={p.ton} />
              <span className="min-w-0">
                <span className="block text-[0.92rem] font-semibold text-[var(--m-ink)]">
                  {p.intitule}
                </span>
                <span className="block text-[0.8rem] leading-snug text-[var(--m-ink-soft)]">
                  {p.detail}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------------------------------------------------------------- Sujet Une */

function SujetUne({ sujet, recitLoading }: { sujet: SujetBriefing; recitLoading: boolean }) {
  return (
    <article id={ANCRES.sujetUne} className="scroll-mt-6">
      <p className="matinale-mono flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--m-ink-faint)]">
        <span className="text-[var(--m-accent)]">{sujet.rubrique}</span>
        <span aria-hidden>·</span>
        <span>Le sujet du jour</span>
      </p>
      <h2 className="matinale-serif mt-2 text-balance text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold leading-[1.08] tracking-tight text-[var(--m-ink)]">
        {sujet.titre}
      </h2>

      <p className="matinale-serif mt-3 max-w-[42rem] text-[1.08rem] leading-relaxed text-[var(--m-ink)]">
        {sujet.chapo}
      </p>

      <p className="matinale-mono mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.64rem] uppercase tracking-[0.08em] text-[var(--m-ink-faint)]">
        {recitLoading ? (
          <span>Récit en cours d’assemblage…</span>
        ) : sujet.recitParIA ? (
          <>
            <Sparkles className="h-3 w-3 text-[var(--m-accent)]" aria-hidden />
            <span>
              Récit assemblé par l’IA — <span className="text-[var(--m-ink-soft)]">toujours relié à ses preuves</span>
            </span>
          </>
        ) : (
          <span>Résumé factuel — le récit IA n’est pas disponible, le sujet et ses preuves restent affichés.</span>
        )}
      </p>

      {sujet.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sujet.tags.map((t) => (
            <span
              key={t}
              className="matinale-mono rounded-full border border-[var(--m-line)] bg-[var(--m-paper-2)] px-2.5 py-1 text-[0.64rem] text-[var(--m-ink-soft)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <PourquoiCeSujet sujet={sujet} />
    </article>
  );
}

/* --------------------------------------------------------- Autres sujets */

function CarteSujetSecondaire({ sujet, index }: { sujet: SujetBriefing; index: number }) {
  return (
    <article className="grid grid-cols-[2rem_1fr] gap-3 border-t border-[var(--m-line-soft)] py-4 first:border-t-0">
      <span className="matinale-serif text-[1.4rem] leading-none tabular-nums text-[var(--m-ink-faint)]">
        {String(index).padStart(2, '0')}
      </span>
      <div className="min-w-0">
        <p className="matinale-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--m-ink-faint)]">
          {sujet.rubrique}
        </p>
        <h3 className="matinale-serif mt-1 text-balance text-[1.2rem] font-semibold leading-tight text-[var(--m-ink)]">
          {sujet.titre}
        </h3>
        <p className="mt-1 line-clamp-2 max-w-[44ch] text-[0.9rem] leading-snug text-[var(--m-ink-soft)]">
          {sujet.chapo}
        </p>
        <p className="matinale-mono mt-2 text-[0.62rem] uppercase tracking-[0.05em] tabular-nums text-[var(--m-ink-faint)]">
          {sujet.nbPreuves} {sujet.nbPreuves > 1 ? 'preuves' : 'preuve'}
        </p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ Cartes latérales */

function CarteLaterale({
  id,
  eyebrow,
  accent = 'accent',
  children,
}: {
  id?: string;
  eyebrow: React.ReactNode;
  accent?: 'accent' | 'signal';
  children: React.ReactNode;
}) {
  const wash = accent === 'signal' ? 'var(--m-signal-wash)' : 'var(--m-paper-2)';
  const line = accent === 'signal' ? 'var(--m-signal)' : 'var(--m-line)';
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-xl border p-4"
      style={{ backgroundColor: wash, borderColor: line }}
    >
      <div className="mb-2.5">{eyebrow}</div>
      {children}
    </section>
  );
}

function Eyebrow({ children, accent = 'accent' }: { children: React.ReactNode; accent?: 'accent' | 'signal' }) {
  const color = accent === 'signal' ? 'var(--m-signal)' : 'var(--m-accent)';
  return (
    <p
      className="matinale-mono text-[0.62rem] uppercase tracking-[0.18em]"
      style={{ color }}
    >
      {children}
    </p>
  );
}

function CarteEcho({ echo }: { echo: EchoBriefing }) {
  return (
    <CarteLaterale eyebrow={<Eyebrow>Notre communication · Écho médiatique</Eyebrow>}>
      {echo.ratio !== null ? (
        <>
          <p className="flex items-baseline gap-2">
            <span className="matinale-serif text-[2.6rem] font-bold leading-none tabular-nums text-[var(--m-ink)]">
              {echo.ratio.toLocaleString('fr-FR')}
            </span>
            <span className="text-[0.8rem] leading-tight text-[var(--m-ink-soft)]">
              article{echo.ratio > 1 ? 's' : ''} de presse
              <br />
              par publication
            </span>
          </p>
          <p className="mt-2 text-[0.82rem] leading-snug text-[var(--m-ink-soft)]">
            <b className="tabular-nums text-[var(--m-ink)]">{echo.earned}</b> article
            {echo.earned > 1 ? 's' : ''} de presse citant l’ANSUT pour{' '}
            <b className="tabular-nums text-[var(--m-ink)]">{echo.owned}</b> publication
            {echo.owned > 1 ? 's' : ''}, sur {echo.fenetreJours} jours.
          </p>
        </>
      ) : (
        <p className="text-[0.84rem] leading-snug text-[var(--m-ink-soft)]">
          Ratio indisponible&nbsp;: aucune publication ANSUT datée sur {echo.fenetreJours} jours.
          <span className="mt-1 block tabular-nums">
            {echo.earned} article{echo.earned > 1 ? 's' : ''} de presse comptés.
          </span>
        </p>
      )}
      <p className="mt-3 border-t border-dashed border-[var(--m-line)] pt-2 text-[0.72rem] leading-snug text-[var(--m-ink-faint)]">
        <b className="font-semibold text-[var(--m-ink-soft)]">Méthode&nbsp;:</b> {echo.methode}
      </p>
      <Link
        to="/insights"
        className="matinale-mono mt-3 inline-block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--m-accent)] hover:underline"
      >
        Voir le détail et la méthode →
      </Link>
    </CarteLaterale>
  );
}

function CarteAExaminer({ signal }: { signal: SignalBriefing }) {
  return (
    <CarteLaterale
      id={ANCRES.aExaminer}
      accent="signal"
      eyebrow={
        <Eyebrow accent="signal">
          <AlertTriangle className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
          {signal.confirme ? 'À arbitrer aujourd’hui' : 'À examiner aujourd’hui'}
        </Eyebrow>
      }
    >
      <h3 className="matinale-serif text-[1.1rem] font-semibold leading-tight text-[var(--m-ink)]">
        {signal.titre}
      </h3>
      <p className="mt-2 text-[0.84rem] leading-snug text-[var(--m-ink-soft)]">{signal.corps}</p>
      <p className="matinale-mono mt-2.5 text-[0.64rem] tracking-[0.05em]" style={{ color: 'var(--m-signal)' }}>
        {signal.sources}
        {signal.detecteLeMs && (
          <>
            {' · '}
            <RelativeTime date={new Date(signal.detecteLeMs)} />
          </>
        )}
      </p>
      {!signal.confirme && (
        <p className="matinale-mono mt-2.5 border-t border-dashed pt-2 text-[0.6rem] uppercase tracking-[0.04em] text-[var(--m-ink-faint)]" style={{ borderColor: 'var(--m-line)' }}>
          Deviendra « à arbitrer » une fois les preuves suffisantes.
        </p>
      )}
    </CarteLaterale>
  );
}

function CarteConseiller({ conseil }: { conseil: ConseilBriefing }) {
  return (
    <CarteLaterale id={ANCRES.conseil} eyebrow={<Eyebrow>Le conseiller</Eyebrow>}>
      <p className="matinale-serif text-[1rem] italic leading-snug text-[var(--m-ink)]">
        «&nbsp;{conseil.texte}&nbsp;»
      </p>
      <p className="mt-2.5 border-t border-[var(--m-line-soft)] pt-2 text-[0.74rem] leading-snug text-[var(--m-ink-soft)]">
        <b className="font-semibold text-[var(--m-ink)]">Fondement&nbsp;:</b> {conseil.fondement}
      </p>
      {conseil.preuves.length > 0 && (
        <Collapsible className="mt-2">
          <CollapsibleTrigger className="matinale-mono flex items-center gap-1 text-[0.66rem] uppercase tracking-[0.06em] text-[var(--m-accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--m-accent)] data-[state=open]:[&_svg]:rotate-90">
            <ChevronRight className="h-3 w-3 transition-transform" aria-hidden />
            Voir les contenus
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1">
            <ul className="space-y-0.5">
              {conseil.preuves.map((p) => (
                <li key={p.id}>
                  <PreuveLien preuve={p} />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
      <p className="matinale-mono mt-3 inline-flex rounded border px-2 py-1 text-[0.58rem] uppercase tracking-[0.06em] text-[var(--m-ink-faint)]" style={{ borderColor: 'var(--m-line)' }}>
        {LIBELLE_NON_INJONCTION}
      </p>
    </CarteLaterale>
  );
}

/* ---------------------------------------------------------- Activités */

function ActivitesRecentes({ briefing }: { briefing: Briefing }) {
  if (briefing.activitesRecentes.length === 0) return null;
  return (
    <section className="mt-8 border-t border-[var(--m-line)] pt-4">
      <p className="matinale-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--m-ink-faint)]">
        Activités récentes
      </p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {briefing.activitesRecentes.map((a, i) => (
          <li key={`${a.type}-${i}`} className="flex items-start gap-2">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: a.type === 'signal' ? 'var(--m-signal)' : 'var(--m-accent)' }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block text-[0.84rem] font-medium text-[var(--m-ink)]">{a.intitule}</span>
              <span className="block truncate text-[0.78rem] text-[var(--m-ink-soft)]">{a.detail}</span>
              {a.quandMs && (
                <span className="matinale-mono block text-[0.66rem] text-[var(--m-ink-faint)]">
                  <RelativeTime date={new Date(a.quandMs)} />
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- Page */

function partagerBientot() {
  toast('Partage intelligent — préparé, pas encore actif', {
    description:
      'À partir de ce même briefing : PDF élégant, e-mail, message Teams, WhatsApp, note de cabinet.',
  });
}

function EtatVide() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--m-line)] bg-[var(--m-paper-2)] p-10 text-center">
      <Newspaper className="mx-auto h-6 w-6 text-[var(--m-ink-faint)]" aria-hidden />
      <p className="matinale-serif mt-3 text-[1.1rem] text-[var(--m-ink)]">
        Aucun sujet qualifié ce matin.
      </p>
      <p className="mt-1 text-[0.88rem] text-[var(--m-ink-soft)]">
        Rien n’a franchi le seuil de preuves aujourd’hui. La surveillance reste active — mieux vaut un
        silence honnête qu’un sujet fabriqué.
      </p>
    </div>
  );
}

function SqueletteMatinale() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-20 w-full max-w-[42rem]" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function LaMatinelePage() {
  const { briefing, isLoading, recitLoading } = useBriefing();
  const { periodeCouverte, derniereCollecteMs } = briefing;

  return (
    <div className="matinale min-h-full bg-[var(--m-paper)] text-[var(--m-ink)]">
      <div className="mx-auto max-w-[80rem] px-4 py-6 sm:px-6 lg:px-8">
        {/* Masthead */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[var(--m-ink)] pb-4">
          <div>
            <p className="matinale-mono text-[0.64rem] uppercase tracking-[0.22em] text-[var(--m-accent)]">
              La matinale
            </p>
            <h1 className="matinale-serif mt-1 text-[clamp(1.8rem,4vw,2.7rem)] font-bold leading-none tracking-tight text-[var(--m-ink)]">
              {capitaliser(format(new Date(briefing.genereLeMs), "'Édition du' EEEE d MMMM yyyy", { locale: fr }))}
            </h1>
            <p className="matinale-mono mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] tabular-nums text-[var(--m-ink-soft)]">
              {derniereCollecteMs && <span>Mise à jour&nbsp;: {heure(derniereCollecteMs)}</span>}
              {periodeCouverte.debutMs && periodeCouverte.finMs && (
                <>
                  <span aria-hidden className="text-[var(--m-ink-faint)]">|</span>
                  <span>
                    Période couverte&nbsp;: {courtJourHeure(periodeCouverte.debutMs)} →{' '}
                    {courtJourHeure(periodeCouverte.finMs)}
                  </span>
                </>
              )}
            </p>
          </div>
          <Button
            type="button"
            onClick={partagerBientot}
            variant="outline"
            className="gap-2 border-[var(--m-line)] bg-[var(--m-paper-2)] text-[var(--m-ink)] hover:bg-[var(--m-paper-3)]"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Partager le briefing
          </Button>
        </header>

        {isLoading && !briefing.sujetUne ? (
          <div className="mt-6">
            <SqueletteMatinale />
          </div>
        ) : (
          <>
            <ARetenir points={briefing.aRetenir} />

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              {/* Colonne principale */}
              <div className="min-w-0">
                {briefing.sujetUne ? (
                  <SujetUne sujet={briefing.sujetUne} recitLoading={recitLoading} />
                ) : (
                  <EtatVide />
                )}

                {briefing.autresSujets.length > 0 && (
                  <section className="mt-8 border-t border-[var(--m-line)] pt-4">
                    <p className="matinale-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--m-ink-faint)]">
                      Les autres sujets clés
                    </p>
                    <div className="mt-2">
                      {briefing.autresSujets.map((s, i) => (
                        <CarteSujetSecondaire key={s.id} sujet={s} index={i + 2} />
                      ))}
                    </div>
                  </section>
                )}

                <ActivitesRecentes briefing={briefing} />
              </div>

              {/* Colonne latérale */}
              <aside className="space-y-4">
                {briefing.echo && <CarteEcho echo={briefing.echo} />}
                {briefing.aExaminer && <CarteAExaminer signal={briefing.aExaminer} />}
                {briefing.conseil && <CarteConseiller conseil={briefing.conseil} />}
              </aside>
            </div>
          </>
        )}

        {/* Pied — honnêteté & repère éditorial */}
        <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--m-line)] pt-4 text-[0.72rem] text-[var(--m-ink-faint)]">
          <span className="matinale-mono uppercase tracking-[0.08em]">
            Le pipeline décide · les écrans présentent
          </span>
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" aria-hidden />
            Recette&nbsp;: comprendre en moins de 30 s ce qui compte, pourquoi, et où vérifier les preuves.
          </span>
          <Link to="/insights" className="ml-auto inline-flex items-center gap-1 hover:text-[var(--m-accent)]">
            <Radio className="h-3.5 w-3.5" aria-hidden />
            Insights
          </Link>
        </footer>
      </div>
    </div>
  );
}
