/**
 * Génère `supabase/functions/_shared/qualification.ts` — le qualifieur PORTABLE
 * (Deno) de l'étage 2 — à partir des données CANONIQUES du frontend
 * (`src/config/missions.ts` + `src/lib/qualificationContenu.ts`).
 *
 * Objectif : une seule source de vérité pour les mots-clés de piliers et les
 * marqueurs de catégorie. On ne recopie jamais ces listes à la main : on les
 * extrait ici, et un test de parité (Vitest) garantit qu'elles ne divergent pas.
 *
 * Usage : `node scripts/gen-etage2-shared.mjs`
 */
import { build } from 'esbuild';
import path from 'node:path';
import { writeFileSync } from 'node:fs';

const root = process.cwd();

const res = await build({
  entryPoints: [path.join(root, 'scripts/_etage2-entry.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  alias: { '@': path.join(root, 'src') },
  logLevel: 'silent',
});

const code = res.outputFiles[0].text;
const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

const PILIERS = mod.MISSIONS_STRATEGIQUES.map((m) => ({ id: m.id, motsCles: m.motsCles }));
const MARQUEURS = mod.MARQUEURS;

const banner = `// =============================================================================
// GÉNÉRÉ AUTOMATIQUEMENT — NE PAS ÉDITER À LA MAIN.
// Source : scripts/gen-etage2-shared.mjs (à partir de src/config/missions.ts et
// src/lib/qualificationContenu.ts). Régénérer : node scripts/gen-etage2-shared.mjs
// Parité garantie par src/lib/__tests__/qualificationParity.test.ts.
// =============================================================================
`;

const body = `
/**
 * Qualifieur ÉDITORIAL portable (étage 2) — même logique que le frontend
 * (\`src/lib/qualificationContenu.ts\`), exécutable côté Deno pour persister la
 * qualification à l'ingestion et lors du backfill. On persiste des FAITS ; les
 * éligibilités sont dérivées ailleurs (Option B).
 */

export const RULES_VERSION = 1;

export type CategorieCommunication =
  | 'institutionnelle' | 'programme' | 'evenementielle' | 'communautaire'
  | 'promotionnelle' | 'protocolaire' | 'sportive' | 'autre';

const CATEGORIES_INSTITUTIONNELLES = new Set<CategorieCommunication>([
  'institutionnelle', 'programme', 'evenementielle',
]);

const MARQUEURS: { categorie: CategorieCommunication; mots: string[] }[] = ${JSON.stringify(MARQUEURS, null, 2)};

const PILIERS: { id: string; motsCles: string[] }[] = ${JSON.stringify(PILIERS, null, 2)};

function normaliser(s: string): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
}
function echapper(s: string): string {
  return s.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
}
function contient(texteNorm: string, terme: string): boolean {
  const t = normaliser(terme).trim();
  if (!t) return false;
  return new RegExp(\`(^|[^a-z0-9])\${echapper(t)}([^a-z0-9]|$)\`).test(texteNorm);
}

export function categoriser(texte: string | null): CategorieCommunication {
  const t = normaliser(texte ?? '');
  for (const { categorie, mots } of MARQUEURS) {
    if (mots.some((m) => contient(t, m))) return categorie;
  }
  return 'autre';
}

/** Piliers appariés + mots-clés déclencheurs (pour la traçabilité). */
export function piliersDeTexte(texte: string | null): { ids: string[]; marqueurs: Record<string, string[]> } {
  const t = normaliser(texte ?? '');
  const ids: string[] = [];
  const marqueurs: Record<string, string[]> = {};
  for (const p of PILIERS) {
    const hits = p.motsCles.filter((kw) => contient(t, kw));
    if (hits.length > 0) { ids.push(p.id); marqueurs[p.id] = hits; }
  }
  return { ids, marqueurs };
}

/** Identité de contenu : URL canonique normalisée, sinon hash du texte. */
export function contentKey(url: string | null, texte: string | null): string {
  if (url && /^https?:\\/\\//i.test(url)) {
    try {
      const u = new URL(url);
      return (u.host + u.pathname).toLowerCase().replace(/\\/+$/, '');
    } catch { /* repli hash */ }
  }
  return 'hash:' + hashTexte(normaliser(texte ?? ''));
}

function hashTexte(s: string): string {
  // djb2 — suffisant comme clé de dédoublonnage à notre volume.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export interface FaitsQualification {
  editorial_date: string | null;
  date_verified: boolean;
  date_source: string;
  category: CategorieCommunication;
  primary_theme: string | null;
  secondary_themes: string[];
  is_institutional: boolean;
  is_ansut_voice: boolean;
  evidence: Record<string, unknown>;
  limitations: string[];
}

/**
 * Produit les FAITS éditoriaux d'un contenu. La datation est fournie par
 * l'appelant (colonnes de provenance existantes) — on ne fabrique jamais de date.
 */
export function qualifierContenu(input: {
  texte: string | null;
  publishedAt: string | null;
  dateVerified: boolean;
  dateSource: string;
  isAnsutVoice: boolean;
  nowMs: number;
}): FaitsQualification {
  const ms = input.publishedAt ? new Date(input.publishedAt).getTime() : NaN;
  const dateOk = input.dateVerified && !Number.isNaN(ms) && ms <= input.nowMs;
  const editorial_date = dateOk ? input.publishedAt : null;

  const category = categoriser(input.texte);
  const { ids, marqueurs } = piliersDeTexte(input.texte);
  const is_institutional = ids.length > 0 && CATEGORIES_INSTITUTIONNELLES.has(category);

  const limitations: string[] = [];
  if (!dateOk) limitations.push('date_non_verifiee');
  if (ids.length === 0) limitations.push('aucun_theme_strategique');

  return {
    editorial_date,
    date_verified: dateOk,
    date_source: input.dateSource || 'unknown',
    category,
    primary_theme: ids[0] ?? null,
    secondary_themes: ids,
    is_institutional,
    is_ansut_voice: input.isAnsutVoice,
    evidence: { category, theme_markers: marqueurs, date_source: input.dateSource || 'unknown' },
    limitations,
  };
}
`;

const out = path.join(root, 'supabase/functions/_shared/qualification.ts');
writeFileSync(out, banner + body);
console.log('written', out, '—', PILIERS.length, 'piliers,', MARQUEURS.length, 'catégories');
