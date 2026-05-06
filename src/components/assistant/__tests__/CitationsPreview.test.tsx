import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitationsPreview } from '../CitationsPreview';
import { FIXTURES } from './fixtures/citationFixtures';
import { collectCitations, type CitationRef } from '../citationRefs';

/**
 * Formats a citation ref into a debug string like:
 *   "num[7] (Référence 7)"
 *   "actu[abc-123] (Titre de l'actu)"
 *   "dossier[xyz] (Note stratégique)"
 * Used to make assertion messages explicit about WHICH ref is broken.
 */
function describeRef(r: CitationRef): string {
  if (r.kind === 'num') return `num[${r.num}] "${r.label}" url=${r.url ?? '∅'}`;
  return `${r.kind}[${r.id}] "${r.label}" url=${r.url}`;
}

function listBroken(refs: CitationRef[]): string {
  const broken = refs.filter((r) => !r.url || (r.kind === 'num' && !r.url));
  return broken.length === 0 ? '∅' : broken.map(describeRef).join(' | ');
}

/**
 * React-level non-regression tests for the in-app preview.
 *
 * Contract:
 *   - Every citation with a URL is rendered as a real <a href="..."> wrapping
 *     a Badge → the user can click it.
 *   - Every "lien manquant" badge is rendered WITHOUT an <a> wrapper. It is
 *     announced as non-clickable via aria-disabled="true" and carries a
 *     "lien manquant" affordance.
 *
 * Failure messages always identify WHICH refs (actu / dossier / num) are
 * broken so a regression points directly at the offending citation.
 */
describe('CitationsPreview — broken badges stay non-clickable', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] no <a> wraps a "lien manquant" badge`, () => {
      const refs = collectCitations(fx.content);
      const validRefs = refs.filter((r) => !(r.kind === 'num' && !r.url));
      const validCount = validRefs.length;
      const brokenRefs = refs.filter((r) => r.kind === 'num' && !r.url);
      const brokenNums = brokenRefs.map((r: any) => r.num as string);

      if (refs.length === 0) {
        const { container } = render(<CitationsPreview content={fx.content} />);
        expect(
          container,
          `[fixture=${fx.id}] preview should be empty when no citations are detected`,
        ).toBeEmptyDOMElement();
        return;
      }

      const { container } = render(<CitationsPreview content={fx.content} />);
      const toggle = screen.getByRole('button', { name: /aperçu des liens/i });
      fireEvent.click(toggle);

      const anchors = container.querySelectorAll('a');
      expect(
        anchors.length,
        `[fixture=${fx.id}] anchor count mismatch — expected ${validCount} valid refs (${validRefs
          .map(describeRef)
          .join(', ')}), broken refs detected: ${listBroken(refs)}`,
      ).toBe(validCount);

      anchors.forEach((a, i) => {
        const href = a.getAttribute('href');
        expect(
          href,
          `[fixture=${fx.id}] anchor #${i} has invalid href="${href}" — every clickable badge must point to http(s)`,
        ).toMatch(/^https?:\/\//);
        expect(
          a.textContent,
          `[fixture=${fx.id}] anchor #${i} (href=${href}) wraps a "lien manquant" badge — broken refs MUST stay outside <a>`,
        ).not.toMatch(/lien manquant/i);
      });

      for (const n of brokenNums) {
        const matches = screen.getAllByText(
          (_, el) =>
            !!el?.textContent?.includes(`[${n}]`) &&
            /lien manquant/i.test(el.textContent),
        );
        expect(
          matches.length,
          `[fixture=${fx.id}] expected a "lien manquant" badge for broken ref num[${n}] but none was rendered`,
        ).toBeGreaterThan(0);
        for (const el of matches) {
          expect(
            el.closest('a'),
            `[fixture=${fx.id}] broken ref num[${n}] is wrapped inside <a href="${el
              .closest('a')
              ?.getAttribute('href')}"> — broken badges must NEVER be clickable`,
          ).toBeNull();
        }
      }
    });
  }

  it('marks broken badges with aria-disabled and a tooltip', () => {
    const { container } = render(<CitationsPreview content="Référence orpheline [99]." />);
    fireEvent.click(screen.getByRole('button', { name: /aperçu des liens/i }));
    const broken = container.querySelector('[data-broken-citation="99"]') as HTMLElement | null;
    expect(broken, 'broken ref num[99] should render a [data-broken-citation="99"] badge').toBeTruthy();
    expect(
      broken!.getAttribute('aria-disabled'),
      'broken ref num[99] must carry aria-disabled="true" for assistive tech',
    ).toBe('true');
    expect(
      broken!.getAttribute('title'),
      'broken ref num[99] must expose a "lien manquant" tooltip',
    ).toMatch(/lien manquant/i);
    expect(
      broken!.className,
      'broken ref num[99] must use cursor-not-allowed to signal disabled state',
    ).toMatch(/cursor-not-allowed/);
    expect(broken!.closest('a'), 'broken ref num[99] must NOT be inside an <a>').toBeNull();
  });

  it('clicking a broken badge does not trigger navigation or anchor activation', () => {
    const { container } = render(<CitationsPreview content="Source absente [42]." />);
    fireEvent.click(screen.getByRole('button', { name: /aperçu des liens/i }));
    const broken = container.querySelector('[data-broken-citation="42"]') as HTMLElement;
    expect(broken, 'broken ref num[42] should render a [data-broken-citation="42"] badge').toBeTruthy();

    const navSpy = vi.fn();
    const origOpen = window.open;
    window.open = navSpy as any;

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    broken.dispatchEvent(clickEvent);

    expect(navSpy, 'clicking broken ref num[42] should NOT call window.open').not.toHaveBeenCalled();
    expect(broken.closest('a'), 'broken ref num[42] still has no <a> ancestor after click').toBeNull();

    window.open = origOpen;
  });

  it('snapshot: broken vs valid badge markup differs (no <a> for broken)', () => {
    const { container } = render(
      <CitationsPreview content={'Source valide [1] et cassée [77].\n[1] https://ansut.ci/x'} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /aperçu des liens/i }));

    const broken = container.querySelector('[data-broken-citation="77"]') as HTMLElement;
    expect(broken, 'broken ref num[77] should be present in the preview').toBeTruthy();
    expect(
      broken.tagName.toLowerCase(),
      'broken ref num[77] root element must NOT be an <a>',
    ).not.toBe('a');
    expect(broken.closest('a'), 'broken ref num[77] must NOT have an <a> ancestor').toBeNull();
    expect(
      broken.getAttribute('aria-disabled'),
      'broken ref num[77] must carry aria-disabled="true"',
    ).toBe('true');

    const validAnchors = Array.from(container.querySelectorAll('a'));
    expect(
      validAnchors.length,
      'expected at least one <a> for the valid ref num[1] (https://ansut.ci/x)',
    ).toBeGreaterThan(0);
    validAnchors.forEach((a, i) => {
      const href = a.getAttribute('href');
      expect(href, `valid anchor #${i} must have an https:// href, got "${href}"`).toMatch(
        /^https:\/\//,
      );
      expect(
        a.getAttribute('aria-disabled'),
        `valid anchor #${i} (href=${href}) must NOT carry aria-disabled`,
      ).toBeNull();
      expect(
        a.querySelector('[data-broken-citation]'),
        `valid anchor #${i} (href=${href}) must NOT contain any [data-broken-citation] node`,
      ).toBeNull();
    });
  });
});

/**
 * Sanity-check the export pipeline at the React/document level:
 * collectCitations + CitationsPreview agree on which refs are "broken" with
 * what the PDF/DOCX exporters consider "broken" (see citationUrlIntegrity).
 */
describe('CitationsPreview ↔ export contract alignment', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] preview anchor count == export valid-citation count`, () => {
      const refs = collectCitations(fx.content);
      const validRefs = refs.filter((r) => !(r.kind === 'num' && !r.url));
      const expectedValid = validRefs.length;
      const { container } = render(<CitationsPreview content={fx.content} />);
      if (refs.length === 0) {
        expect(
          container,
          `[fixture=${fx.id}] no citations detected → preview must be empty`,
        ).toBeEmptyDOMElement();
        return;
      }
      fireEvent.click(screen.getByRole('button', { name: /aperçu des liens/i }));
      expect(
        container.querySelectorAll('a').length,
        `[fixture=${fx.id}] preview/export drift — expected ${expectedValid} clickable refs (${validRefs
          .map(describeRef)
          .join(', ')}), broken refs in this fixture: ${listBroken(refs)}`,
      ).toBe(expectedValid);
    });
  }
});
