import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Garde anti-régression de la Charte de crédibilité.
 *
 * `docs/CHARTE_CREDIBILITE.md` proscrit la fausse précision — au premier rang,
 * `Math.random()` employé pour fabriquer une donnée affichée. Ce test empêche ce
 * motif de revenir dans un composant du produit : il échoue en CI dès qu'un
 * `Math.random(` apparaît dans `src/pages` ou `src/components`, hors des seuls
 * usages légitimes (génération d'identifiants, primitives shadcn non modifiables).
 *
 * Si tu ajoutes un usage réellement légitime (un ID, une clé), ajoute son chemin
 * à ALLOWLIST avec un commentaire — jamais pour « fabriquer un chiffre ».
 */

const SRC = join(process.cwd(), 'src');
const SCAN_DIRS = ['pages', 'components'];

// Usages autorisés de Math.random (génération d'ID / primitives), jamais des métriques.
const ALLOWLIST = [
  'components/ui/', // primitives shadcn/ui — non modifiables (CLAUDE.md)
  'components/newsletter/ImageUploader.tsx', // id d'upload
  'components/newsletter/studio/NewsletterStudio.tsx', // id de bloc
  'components/newsletter/studio/utils/blockConverter.ts', // id de bloc
];

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out = out.concat(walk(full));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function relPosix(full: string): string {
  return full.slice(SRC.length + 1).split('\\').join('/');
}

describe('Charte de crédibilité — garde anti-régression', () => {
  it('aucun Math.random() dans un composant affiché (hors génération d’ID)', () => {
    const offenders: string[] = [];
    for (const d of SCAN_DIRS) {
      for (const file of walk(join(SRC, d))) {
        const rel = relPosix(file);
        if (ALLOWLIST.some((a) => rel === a || rel.startsWith(a))) continue;
        if (/Math\.random\s*\(/.test(readFileSync(file, 'utf8'))) {
          offenders.push(rel);
        }
      }
    }
    expect(
      offenders,
      `Math.random() interdit dans un composant affiché (fausse précision — voir docs/CHARTE_CREDIBILITE.md). ` +
        `Fichiers : ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
