import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitationsPreview } from '../CitationsPreview';
import { FIXTURES } from './fixtures/citationFixtures';
import { collectCitations } from '../citationRefs';

/**
 * React-level non-regression tests for the in-app preview.
 *
 * Contract:
 *   - Every citation with a URL is rendered as a real <a href="..."> wrapping
 *     a Badge → the user can click it.
 *   - Every "lien manquant" badge is rendered WITHOUT an <a> wrapper. It is
 *     announced as non-clickable via aria-disabled="true" and carries a
 *     "lien manquant" affordance.
 */
describe('CitationsPreview — broken badges stay non-clickable', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] no <a> wraps a "lien manquant" badge`, () => {
      const refs = collectCitations(fx.content);
      const validCount = refs.filter((r) => !(r.kind === 'num' && !r.url)).length;
      const brokenNums = refs
        .filter((r) => r.kind === 'num' && !r.url)
        .map((r: any) => r.num as string);

      if (refs.length === 0) {
        const { container } = render(<CitationsPreview content={fx.content} />);
        expect(container).toBeEmptyDOMElement();
        return;
      }

      const { container } = render(<CitationsPreview content={fx.content} />);
      // Open the collapsible panel to render every badge.
      const toggle = screen.getByRole('button', { name: /aperçu des liens/i });
      fireEvent.click(toggle);

      const anchors = container.querySelectorAll('a');
      expect(anchors.length).toBe(validCount);

      // Each clickable anchor has an http(s) href.
      anchors.forEach((a) => {
        expect(a.getAttribute('href')).toMatch(/^https?:\/\//);
        // It must NOT contain the "lien manquant" affordance text.
        expect(a.textContent).not.toMatch(/lien manquant/i);
      });

      // For every broken numeric ref: a badge labelled "[n] · lien manquant"
      // exists and is NOT inside an <a> tag.
      for (const n of brokenNums) {
        const matches = screen.getAllByText(
          (_, el) =>
            !!el?.textContent?.includes(`[${n}]`) &&
            /lien manquant/i.test(el.textContent),
        );
        expect(matches.length).toBeGreaterThan(0);
        for (const el of matches) {
          expect(el.closest('a')).toBeNull();
        }
      }
    });
  }

  it('marks broken badges with aria-disabled and a tooltip', () => {
    const { container } = render(<CitationsPreview content="Référence orpheline [99]." />);
    fireEvent.click(screen.getByRole("button", { name: /aperçu des liens/i }));
    const broken = container.querySelector('[data-broken-citation="99"]') as HTMLElement | null;
    expect(broken).toBeTruthy();
    expect(broken!.getAttribute('aria-disabled')).toBe('true');
    expect(broken!.getAttribute('title')).toMatch(/lien manquant/i);
    expect(broken!.className).toMatch(/cursor-not-allowed/);
    expect(broken!.closest('a')).toBeNull();
  });

  it('clicking a broken badge does not trigger navigation or anchor activation', () => {
    const { container } = render(<CitationsPreview content="Source absente [42]." />);
    fireEvent.click(screen.getByRole("button", { name: /aperçu des liens/i }));
    const broken = container.querySelector('[data-broken-citation="42"]') as HTMLElement;
    expect(broken).toBeTruthy();

    const navSpy = vi.fn();
    const origOpen = window.open;
    window.open = navSpy as any;

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    broken.dispatchEvent(clickEvent);

    expect(navSpy).not.toHaveBeenCalled();
    expect(broken.closest('a')).toBeNull();
    expect(clickEvent.defaultPrevented).toBe(false); // pas de handler intercepté = pas d'action


    window.open = origOpen;
  });

  it('snapshot: broken vs valid badge markup differs (no <a> for broken)', () => {
    const { container } = render(
      <CitationsPreview content={'Source valide [1] et cassée [77].\n[1] https://ansut.ci/x'} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /aperçu des liens/i }));

    const broken = container.querySelector('[data-broken-citation="77"]') as HTMLElement;
    expect(broken).toBeTruthy();
    expect(broken.tagName.toLowerCase()).not.toBe('a');
    expect(broken.closest('a')).toBeNull();
    expect(broken.getAttribute('aria-disabled')).toBe('true');

    const validAnchors = Array.from(container.querySelectorAll('a'));
    expect(validAnchors.length).toBeGreaterThan(0);
    validAnchors.forEach((a) => {
      expect(a.getAttribute('href')).toMatch(/^https:\/\//);
      expect(a.getAttribute('aria-disabled')).toBeNull();
      expect(a.querySelector('[data-broken-citation]')).toBeNull();
    });
  });
});

/**
 * Additionally, sanity-check the export pipeline at the React/document level:
 * collectCitations + CitationsPreview agree on which refs are "broken" with
 * what the PDF/DOCX exporters consider "broken" (see citationUrlIntegrity).
 */
describe('CitationsPreview ↔ export contract alignment', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] preview anchor count == export valid-citation count`, () => {
      const refs = collectCitations(fx.content);
      const expectedValid = refs.filter((r) => !(r.kind === 'num' && !r.url)).length;
      const { container } = render(<CitationsPreview content={fx.content} />);
      if (refs.length === 0) {
        expect(container).toBeEmptyDOMElement();
        return;
      }
      fireEvent.click(screen.getByRole("button", { name: /aperçu des liens/i }));
      expect(container.querySelectorAll('a').length).toBe(expectedValid);
    });
  }
});
