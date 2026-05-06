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
    render(<CitationsPreview content="Référence orpheline [99]." />);
    fireEvent.click(screen.getByRole("button", { name: /aperçu des liens/i }));
    const broken = screen
      .getAllByText((_, el) => !!el && /lien manquant/i.test(el.textContent || ''))
      .find((el) => el.tagName.toLowerCase() !== 'span' || el.textContent?.includes('[99]'));
    expect(broken).toBeTruthy();
    // The container badge should not be inside an anchor.
    expect(broken!.closest('a')).toBeNull();
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
