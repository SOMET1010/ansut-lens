import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * Verifie qu'apres redirection une page rendue est saine :
 * aucune erreur console et presence du gabarit applicatif (sidebar + header).
 *
 * Sans session, les routes protegees renvoient vers /auth : on verifie alors
 * l'ecran de connexion (pas de sidebar attendue) mais toujours l'absence
 * d'erreur console.
 */

const REDIRECTIONS = ['/', '/index', '/index.html', '/radar', '/actualites', '/flux', '/dossiers'];

/** Bruits connus, sans incidence fonctionnelle, ignores dans l'analyse. */
const BRUITS_IGNORES = [
  'favicon',
  'Download the React DevTools',
  'ResizeObserver loop',
  'net::ERR_ABORTED',
];

function estBruit(texte: string) {
  return BRUITS_IGNORES.some((motif) => texte.includes(motif));
}

/** Collecte les erreurs console et les exceptions non capturees. */
function surveillerErreurs(page: Page) {
  const erreurs: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    const texte = message.text();
    if (!estBruit(texte)) erreurs.push(texte);
  });
  page.on('pageerror', (error) => {
    if (!estBruit(error.message)) erreurs.push(error.message);
  });
  return erreurs;
}

/** Restaure la session Lovable si elle est disponible dans l'environnement. */
async function restaurerSession(page: Page) {
  const cle = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  await page.goto('/');
  if (cle && session) {
    await page.evaluate(
      ([k, v]) => window.localStorage.setItem(k, v),
      [cle, session] as const,
    );
  }
}

test.describe('Sante des pages apres redirection', () => {
  for (const chemin of REDIRECTIONS) {
    test(`${chemin} : gabarit complet et console propre`, async ({ page }) => {
      await restaurerSession(page);
      const erreurs = surveillerErreurs(page);

      await page.goto(chemin, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () => (document.body.innerText ?? '').trim().length > 0,
        undefined,
        { timeout: 15_000 },
      );

      const pathname = new URL(page.url()).pathname;

      if (pathname === '/auth') {
        // Non authentifie : on valide l'ecran de connexion rendu correctement.
        await expect(page.locator('form, input[type="email"]').first()).toBeVisible();
      } else {
        // Authentifie : le gabarit applicatif doit etre monte.
        await expect(page.locator('header').first()).toBeVisible();
        await expect(page.locator('[data-sidebar="sidebar"]').first()).toBeAttached();
        await expect(page.locator('main').first()).toBeVisible();
      }

      // Laisse le temps aux erreurs asynchrones de remonter.
      await page.waitForTimeout(1_000);
      expect(erreurs, `Erreurs console sur ${chemin}:\n${erreurs.join('\n')}`).toEqual([]);
    });
  }
});
