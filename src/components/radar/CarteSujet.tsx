import { FileText, Globe } from 'lucide-react';
import type { SujetBriefing } from '@/lib/briefing';

/**
 * Carte d'un sujet du briefing — vue partagée entre « La Matinale » et la page
 * dédiée « Tous les sujets ». Purement présentationnelle : aucun calcul métier,
 * elle ne fait que compter les preuves déjà attachées au sujet.
 */
export function CarteSujet({ sujet }: { sujet: SujetBriefing }) {
  const presse = sujet.preuves.filter((p) => p.type === 'presse').length;
  const ansut = sujet.preuves.filter((p) => p.type === 'ansut').length;
  const autres = sujet.nbPreuves - presse - ansut;
  return (
    <article className="flex h-full flex-col rounded-xl border border-[var(--m-line)] bg-[var(--m-paper-2)] p-4">
      <p className="matinale-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--m-ink-faint)]">
        {sujet.rubrique}
      </p>
      <h3 className="matinale-serif mt-1.5 text-balance text-[1.15rem] font-semibold leading-tight text-[var(--m-ink)]">
        {sujet.titre}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[0.86rem] leading-snug text-[var(--m-ink-soft)]">
        {sujet.chapo}
      </p>
      <div className="mt-auto flex items-center gap-2 pt-4">
        <span className="matinale-mono text-[0.68rem] tabular-nums text-[var(--m-ink-faint)]">
          {sujet.nbPreuves} {sujet.nbPreuves > 1 ? 'preuves' : 'preuve'}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[var(--m-ink-faint)]">
          {presse > 0 && (
            <FileText className="h-3.5 w-3.5" aria-label={`${presse} article(s) de presse`} />
          )}
          {ansut > 0 && (
            <Globe className="h-3.5 w-3.5" aria-label={`${ansut} publication(s) ANSUT`} />
          )}
          {autres > 0 && (
            <span className="matinale-mono rounded border border-[var(--m-line)] px-1.5 py-0.5 text-[0.62rem] tabular-nums">
              +{autres}
            </span>
          )}
        </span>
      </div>
    </article>
  );
}
