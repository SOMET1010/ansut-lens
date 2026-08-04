import { test, expect, Page } from '@playwright/test';

/**
 * Verifie qu'aucune route (y compris les anciennes adresses partagees par
 * courriel comme /index ou /index.html) ne produit d'ecran blanc.
 *
 * Le test fonctionne avec ou sans session : sans session, les routes protegees
 * renvoient vers /auth, ce qui reste un rendu valide et non un ecran blanc.
 */

const REDIRECTIONS: Array<{ from: string; to: string }> = [
  { from: '/', to: '/ce-matin' },
  { from: '/index', to: '/ce-matin' },
  { from: '/index.html', to: '/ce-matin' },
  { from: '/radar', to: '/ce-matin' },
  { from: '/la-matinale', to: '/ce-matin' },
  { from: '/actualites', to: '/veille' },
  { from: '/medias', to: '/veille' },
  { from: '/balayage', to: '/recherche' },
  { from: '/flux', to: '/surveillance' },
  { from: '/dossiers', to: '/publier' },
  { from: '/personnalites', to: '/acteurs' },
  { from: '/presence-digitale', to: '/acteurs' },
  { from: '/spdi-review', to: '/acteurs' },
  { from: '/reseaux-sociaux', to: '/communication' },
];

const ROUTES_DIRECTES = ['/ce-matin', '/veille', '/recherche', '/acteurs', '/auth'];

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

/** Charge une adresse et retourne le chemin final ainsi que le texte rendu. */
async function ouvrir(page: Page, chemin: string) {
  await page.goto(chemin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => (document.body.innerText ?? '').trim().length > 0,
    undefined,
    { timeout: 15_000 },
  );
  const url = new URL(page.url());
  const texte = (await page.locator('body').innerText()).trim();
  return { pathname: url.pathname, texte };
}

test.describe('Redirections des routes', () => {
  test.beforeEach(async ({ page }) => {
    await restaurerSession(page);
  });

  for (const { from, to } of REDIRECTIONS) {
    test(`${from} redirige vers ${to} sans ecran blanc`, async ({ page }) => {
      const { pathname, texte } = await ouvrir(page, from);

      // Sans session, la route protegee renvoie vers /auth : les deux cas sont valides.
      expect([to, '/auth']).toContain(pathname);
      expect(texte.length).toBeGreaterThan(0);
      expect(texte).not.toContain('404');
    });
  }

  for (const route of ROUTES_DIRECTES) {
    test(`${route} s'affiche sans ecran blanc`, async ({ page }) => {
      const { pathname, texte } = await ouvrir(page, route);

      expect([route, '/auth']).toContain(pathname);
      expect(texte.length).toBeGreaterThan(0);
    });
  }

  test('une adresse inconnue affiche la page 404 avec un retour vers l’application', async ({
    page,
  }) => {
    const { texte } = await ouvrir(page, '/cette-page-nexiste-pas');

    expect(texte).toContain('404');
    const retour = page.getByRole('link', { name: /Retour à l’application/i });
    await expect(retour).toBeVisible();
    await retour.click();
    await expect(page).toHaveURL(/\/(ce-matin|auth)/);
  });
});
