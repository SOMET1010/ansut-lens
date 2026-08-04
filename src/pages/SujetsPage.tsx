import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CarteSujetBriefing } from '@/components/radar/CarteSujetBriefing';
import { useBriefing } from '@/hooks/useBriefing';

/**
 * « Tous les sujets » — page dédiée ouverte depuis La Matinale.
 *
 * Elle est une simple VUE du même Briefing : aucun recalcul métier. Le
 * comptage N et les filtres portent uniquement sur les sujets réellement
 * produits par le briefing du jour (sujet du jour + autres sujets).
 */
export default function SujetsPage() {
  const { briefing, isLoading } = useBriefing();
  const [params, setParams] = useSearchParams();
  const [recherche, setRecherche] = useState('');

  const tousLesSujets = useMemo(
    () => [briefing.sujetUne, ...briefing.autresSujets].filter((s) => !!s),
    [briefing.sujetUne, briefing.autresSujets],
  );

  const rubriques = useMemo(
    () => Array.from(new Set(tousLesSujets.map((s) => s.rubrique))).sort((a, b) => a.localeCompare(b, 'fr')),
    [tousLesSujets],
  );

  const rubriqueActive = params.get('rubrique');
  const q = recherche.trim().toLowerCase();

  const sujetsFiltres = useMemo(
    () =>
      tousLesSujets.filter((s) => {
        if (rubriqueActive && s.rubrique !== rubriqueActive) return false;
        if (!q) return true;
        return (
          s.titre.toLowerCase().includes(q) ||
          s.chapo.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          s.organisations.some((o) => o.toLowerCase().includes(q))
        );
      }),
    [tousLesSujets, rubriqueActive, q],
  );

  const choisirRubrique = (r: string | null) => {
    const next = new URLSearchParams(params);
    if (r) next.set('rubrique', r);
    else next.delete('rubrique');
    setParams(next, { replace: true });
  };

  return (
    <div className="matinale-page mx-auto w-full max-w-5xl px-4 py-6">
      <Link
        to="/ce-matin"
        className="matinale-mono inline-flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.14em] text-[var(--m-accent)] hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Retour à La Matinale
      </Link>

      <h1 className="matinale-serif mt-3 text-[clamp(1.6rem,3vw,2.1rem)] font-bold leading-tight text-[var(--m-ink)]">
        Tous les sujets
      </h1>
      <p className="mt-1 text-[0.9rem] text-[var(--m-ink-soft)]">
        {isLoading
          ? 'Chargement des sujets du briefing…'
          : `${sujetsFiltres.length} sujet${sujetsFiltres.length > 1 ? 's' : ''} affiché${sujetsFiltres.length > 1 ? 's' : ''} sur ${tousLesSujets.length} du briefing du jour.`}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={rubriqueActive ? 'outline' : 'default'}
          onClick={() => choisirRubrique(null)}
        >
          Toutes les rubriques ({tousLesSujets.length})
        </Button>
        {rubriques.map((r) => {
          const n = tousLesSujets.filter((s) => s.rubrique === r).length;
          return (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={rubriqueActive === r ? 'default' : 'outline'}
              onClick={() => choisirRubrique(rubriqueActive === r ? null : r)}
            >
              {r} ({n})
            </Button>
          );
        })}
      </div>

      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Filtrer par titre, thème ou organisation…"
          aria-label="Filtrer les sujets"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : sujetsFiltres.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-[var(--m-line)] p-8 text-center text-sm text-[var(--m-ink-soft)]">
          Aucun sujet ne correspond à ce filtre.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sujetsFiltres.map((s) => (
            <CarteSujetBriefing key={s.id} sujet={s} />
          ))}
        </div>
      )}
    </div>
  );
}
