import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowDownRight, ArrowUpRight, Info, Minus, Newspaper, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/relative-time';
import { useCommunication } from '@/hooks/useCommunication';
import { estTracable, type Indicateur } from '@/lib/indicateur';
import type {
  Communication,
  EchoCommunication,
  EngagementReseauItem,
  StatItem,
  StatReseauItem,
} from '@/lib/communication';
import type { Preuve } from '@/lib/preuve';

/**
 * Notre communication — vue 100 % PASSIVE d'un objet {@link Communication}.
 *
 * Reconstruite sur les fondations de crédibilité (dédup, preuve, « zéro score
 * opaque ») pour remplacer l'ancien tableau de bord jugé 2/10 par l'audit. Elle
 * répond à « Comment l'ANSUT est-elle visible ? » avec des faits vérifiables :
 * ce que l'ANSUT publie, l'écho médiatique (dédupliqué, méthode exposée), et
 * l'engagement UNIQUEMENT quand la plateforme le fournit. Aucune Résonance /100,
 * aucun « 72 points », aucun total contaminé, aucun conseil IA non sourcé.
 */

const FENETRES = [30, 60, 90];

function courtJour(ms: number): string {
  return format(new Date(ms), 'dd/MM', { locale: fr });
}

/* --------------------------------------------------------------- Preuves */

function PreuveLien({ preuve }: { preuve: Preuve }) {
  const contenu = (
    <>
      <span className="matinale-mono shrink-0 text-[0.66rem] text-[var(--m-ink-faint)]">
        {preuve.source}
      </span>
      <span className="min-w-0 flex-1 text-[var(--m-ink-soft)]">{preuve.titre}</span>
      {preuve.dateMs && (
        <span className="matinale-mono shrink-0 text-[0.62rem] text-[var(--m-ink-faint)]">
          <RelativeTime date={new Date(preuve.dateMs)} />
        </span>
      )}
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

/* ---------------------------------------------------------------- Blocs */

function Section({
  titre,
  question,
  children,
}: {
  titre: string;
  question?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-[var(--m-line)] pt-4">
      <p className="matinale-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--m-ink-faint)]">
        {titre}
      </p>
      {question && <p className="mt-0.5 text-[0.8rem] text-[var(--m-ink-soft)]">{question}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EvolutionIcone({ evolution }: { evolution: StatReseauItem['evolution'] }) {
  if (evolution === 'hausse') {
    return <ArrowUpRight className="h-3.5 w-3.5 text-[var(--m-accent)]" aria-label="en hausse" />;
  }
  if (evolution === 'baisse') {
    return <ArrowDownRight className="h-3.5 w-3.5 text-[var(--m-ink-faint)]" aria-label="en baisse" />;
  }
  return <Minus className="h-3.5 w-3.5 text-[var(--m-ink-faint)]" aria-label="stable" />;
}

function BarresReseaux({ reseaux }: { reseaux: StatReseauItem[] }) {
  if (reseaux.length === 0) {
    return <p className="text-[0.84rem] text-[var(--m-ink-soft)]">Aucune publication datée sur la période.</p>;
  }
  const max = Math.max(...reseaux.map((r) => r.count), 1);
  return (
    <ul className="space-y-2">
      {reseaux.map((r) => (
        <li key={r.cle} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-[0.84rem] text-[var(--m-ink)]">{r.libelle}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--m-paper-3)]">
            <span
              className="block h-full rounded-full bg-[var(--m-accent)]"
              style={{ width: `${Math.round((r.count / max) * 100)}%` }}
            />
          </span>
          <span className="matinale-mono flex w-24 shrink-0 items-center justify-end gap-1.5 text-[0.72rem] tabular-nums text-[var(--m-ink-soft)]">
            <b className="text-[var(--m-ink)]">{r.count}</b>
            <EvolutionIcone evolution={r.evolution} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Chips({ items }: { items: StatItem[] }) {
  if (items.length === 0) return <p className="text-[0.84rem] text-[var(--m-ink-soft)]">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span
          key={i.cle}
          className="matinale-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--m-line)] bg-[var(--m-paper-2)] px-2.5 py-1 text-[0.68rem] text-[var(--m-ink-soft)]"
        >
          {i.libelle}
          <b className="tabular-nums text-[var(--m-ink)]">{i.count}</b>
        </span>
      ))}
    </div>
  );
}

function ValeurIndicateur({ indicateur }: { indicateur: Indicateur }) {
  if (estTracable(indicateur)) {
    return (
      <span className="min-w-0">
        <span className="block text-[0.9rem] font-semibold tabular-nums text-[var(--m-ink)]">
          {indicateur.valeur}
        </span>
        <span className="block text-[0.72rem] leading-snug text-[var(--m-ink-faint)]">
          {indicateur.methode}
        </span>
      </span>
    );
  }
  return (
    <span className="min-w-0">
      <span className="block text-[0.82rem] italic text-[var(--m-ink-faint)]">Donnée indisponible</span>
      <span className="block text-[0.72rem] leading-snug text-[var(--m-ink-faint)]">{indicateur.raison}</span>
    </span>
  );
}

function Engagement({ items }: { items: EngagementReseauItem[] }) {
  if (items.length === 0) {
    return <p className="text-[0.84rem] text-[var(--m-ink-soft)]">Aucun réseau collecté sur la période.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((e) => (
        <li
          key={e.cle}
          className="flex items-start gap-3 rounded-lg border border-[var(--m-line)] bg-[var(--m-paper-2)] p-3"
        >
          <span className="matinale-mono w-16 shrink-0 text-[0.7rem] uppercase tracking-[0.06em] text-[var(--m-ink-faint)]">
            {e.libelle}
          </span>
          <ValeurIndicateur indicateur={e.indicateur} />
        </li>
      ))}
    </ul>
  );
}

function CarteEcho({ echo }: { echo: EchoCommunication }) {
  return (
    <section className="rounded-xl border border-[var(--m-line)] bg-[var(--m-paper-2)] p-5" aria-label="Écho médiatique">
      <p className="matinale-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--m-accent)]">
        Écho médiatique
      </p>
      {echo.ratio !== null ? (
        <>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="matinale-serif text-[2.8rem] font-bold leading-none tabular-nums text-[var(--m-ink)]">
              {echo.ratio.toLocaleString('fr-FR')}
            </span>
            <span className="text-[0.82rem] leading-tight text-[var(--m-ink-soft)]">
              article{echo.ratio > 1 ? 's' : ''} de presse
              <br />
              par publication ANSUT
            </span>
          </p>
          <p className="mt-2 text-[0.84rem] leading-snug text-[var(--m-ink-soft)]">
            <b className="tabular-nums text-[var(--m-ink)]">{echo.earned}</b> reprise
            {echo.earned > 1 ? 's' : ''} presse (uniques) citant l’ANSUT pour{' '}
            <b className="tabular-nums text-[var(--m-ink)]">{echo.owned}</b> publication
            {echo.owned > 1 ? 's' : ''}, sur {echo.fenetreJours} jours.
          </p>
        </>
      ) : (
        <p className="mt-2 text-[0.84rem] leading-snug text-[var(--m-ink-soft)]">
          Ratio indisponible : aucune publication ANSUT datée sur {echo.fenetreJours} jours.
          <span className="mt-1 block tabular-nums">
            {echo.earned} reprise{echo.earned > 1 ? 's' : ''} presse comptée{echo.earned > 1 ? 's' : ''}.
          </span>
        </p>
      )}
      <p className="mt-3 border-t border-dashed border-[var(--m-line)] pt-2 text-[0.72rem] leading-snug text-[var(--m-ink-faint)]">
        <b className="font-semibold text-[var(--m-ink-soft)]">Méthode :</b> {echo.methode}
      </p>
      <Link
        to="/insights"
        className="matinale-mono mt-3 inline-block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--m-accent)] hover:underline"
      >
        Voir le détail et la méthode →
      </Link>
    </section>
  );
}

/* --------------------------------------------------------------- Page */

export default function CommunicationPage() {
  const [fenetre, setFenetre] = useState(30);
  const { communication, isLoading } = useCommunication(fenetre);
  const c: Communication = communication;
  const rien =
    !isLoading &&
    c.publications.totalDatees === 0 &&
    (!c.echo || c.echo.earned === 0) &&
    c.reprisesPresse.length === 0;

  return (
    <div className="matinale min-h-full bg-[var(--m-paper)] text-[var(--m-ink)]">
      <div className="mx-auto max-w-[80rem] px-4 py-6 sm:px-6 lg:px-8">
        {/* Masthead */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[var(--m-ink)] pb-4">
          <div>
            <p className="matinale-mono text-[0.64rem] uppercase tracking-[0.22em] text-[var(--m-accent)]">
              Notre communication
            </p>
            <h1 className="matinale-serif mt-1 text-[clamp(1.7rem,3.8vw,2.5rem)] font-bold leading-tight tracking-tight text-[var(--m-ink)]">
              Comment l’ANSUT est visible
            </h1>
            <p className="matinale-mono mt-2 text-[0.7rem] tabular-nums text-[var(--m-ink-soft)]">
              Fenêtre d’observation : {courtJour(c.periode.debutMs ?? Date.now())} →{' '}
              {courtJour(c.periode.finMs ?? Date.now())}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--m-line)] bg-[var(--m-paper-2)] p-0.5">
            {FENETRES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFenetre(f)}
                aria-pressed={fenetre === f}
                className={cn(
                  'matinale-mono rounded-md px-2.5 py-1 text-[0.72rem] tabular-nums transition-colors',
                  fenetre === f
                    ? 'bg-[var(--m-accent)] text-[var(--m-paper)]'
                    : 'text-[var(--m-ink-soft)] hover:bg-[var(--m-paper-3)]',
                )}
              >
                {f} j
              </button>
            ))}
          </div>
        </header>

        {rien ? (
          <div className="mt-6 rounded-xl border border-dashed border-[var(--m-line)] bg-[var(--m-paper-2)] p-10 text-center">
            <Newspaper className="mx-auto h-6 w-6 text-[var(--m-ink-faint)]" aria-hidden />
            <p className="matinale-serif mt-3 text-[1.1rem] text-[var(--m-ink)]">
              Aucune donnée de communication vérifiable sur {fenetre} jours.
            </p>
            <p className="mt-1 text-[0.88rem] text-[var(--m-ink-soft)]">
              Rien de daté et sourcé à afficher — mieux vaut un silence honnête qu’un chiffre fabriqué.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Colonne principale */}
            <div className="min-w-0">
              <Section
                titre="Ce que l’ANSUT a publié"
                question={
                  c.publications.totalNonDatees > 0
                    ? `${c.publications.totalDatees} publication${c.publications.totalDatees > 1 ? 's' : ''} datée${c.publications.totalDatees > 1 ? 's' : ''} · ${c.publications.totalNonDatees} à date non vérifiée (non comptée${c.publications.totalNonDatees > 1 ? 's' : ''})`
                    : `${c.publications.totalDatees} publication${c.publications.totalDatees > 1 ? 's' : ''} datée${c.publications.totalDatees > 1 ? 's' : ''} sur ${fenetre} j`
                }
              >
                <BarresReseaux reseaux={c.publications.parReseau} />
              </Section>

              <Section titre="Thèmes portés">
                <Chips items={c.publications.themes} />
              </Section>

              <Section titre="Engagement" question="Uniquement lorsque la plateforme fournit les chiffres.">
                <Engagement items={c.engagement} />
              </Section>

              <Section titre="Reprises presse récentes" question="Documents attribuables, datés, dédupliqués.">
                {c.reprisesPresse.length > 0 ? (
                  <ul className="space-y-0.5">
                    {c.reprisesPresse.map((p) => (
                      <li key={p.id}>
                        <PreuveLien preuve={p} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[0.84rem] text-[var(--m-ink-soft)]">
                    Aucune reprise presse vérifiable sur la période.
                  </p>
                )}
              </Section>
            </div>

            {/* Colonne latérale */}
            <aside className="space-y-4">
              {c.echo && <CarteEcho echo={c.echo} />}
              {c.publications.formats.length > 0 && (
                <section className="rounded-xl border border-[var(--m-line)] bg-[var(--m-paper-2)] p-4">
                  <p className="matinale-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--m-ink-faint)]">
                    Formats
                  </p>
                  <div className="mt-3">
                    <Chips items={c.publications.formats} />
                  </div>
                </section>
              )}
              {c.partenaires.length > 0 && (
                <section className="rounded-xl border border-[var(--m-line)] bg-[var(--m-paper-2)] p-4">
                  <p className="matinale-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--m-ink-faint)]">
                    Organisations citées
                  </p>
                  <div className="mt-3">
                    <Chips items={c.partenaires} />
                  </div>
                </section>
              )}
            </aside>
          </div>
        )}

        {/* Pied */}
        <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--m-line)] pt-4 text-[0.72rem] text-[var(--m-ink-faint)]">
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" aria-hidden />
            Chaque chiffre porte sa méthode ; à défaut, « donnée indisponible ». Aucun score fabriqué.
          </span>
          <span className="ml-auto flex items-center gap-3">
            <Link to="/insights" className="inline-flex items-center gap-1 hover:text-[var(--m-accent)]">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              Insights
            </Link>
            <span aria-hidden>·</span>
            <Link to="/admin/credibilite" className="hover:text-[var(--m-accent)]">
              Charte de crédibilité
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
