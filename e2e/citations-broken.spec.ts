import { test, expect } from '@playwright/test';
import { jsPDF } from 'jspdf';
import { Document, Packer } from 'docx';
import JSZip from 'jszip';
import {
  renderPdfCitationAppendix,
  buildDocxCitationAppendix,
} from '../src/components/assistant/citationAppendix';
import { collectCitations } from '../src/components/assistant/citationRefs';
import { FIXTURES } from '../src/components/assistant/__tests__/fixtures/citationFixtures';

/**
 * E2E — Citations cassées
 *
 * 1) Aperçu HTML : un badge "lien manquant" doit être non cliquable
 *    (pas d'<a>, aria-disabled="true", cursor:not-allowed).
 * 2) Export PDF : pdf.link() ne doit JAMAIS recevoir d'URL pointant
 *    vers une référence cassée.
 * 3) Export DOCX : aucun <w:hyperlink> ne doit envelopper un badge
 *    "Lien manquant" ni une référence numérique cassée.
 */

const APP_BASE = 'https://ansut-lens.lovable.app';

function renderPreviewHtml(content: string): string {
  const refs = collectCitations(content);
  const badges = refs
    .map((r) => {
      if (r.kind === 'num' && !r.url) {
        return `<span role="text" aria-disabled="true"
          data-broken-citation="${r.num}"
          style="cursor:not-allowed;border:1px dashed #f59e0b;padding:2px 6px;"
          title="Lien manquant">⚠ [${r.num}] · lien manquant</span>`;
      }
      if (r.kind === 'num') {
        return `<a href="${r.url}" target="_blank" data-citation-num="${r.num}">
          <span style="cursor:pointer">[${r.num}]</span></a>`;
      }
      const url =
        r.kind === 'actu'
          ? `${APP_BASE}/radar?tab=flux&id=${encodeURIComponent(r.id)}`
          : `${APP_BASE}/dossiers?id=${encodeURIComponent(r.id)}`;
      return `<a href="${url}" target="_blank" data-citation-${r.kind}="${r.id}">
        <span style="cursor:pointer">${r.label}</span></a>`;
    })
    .join('\n');
  return `<!doctype html><html><body><div id="preview">${badges}</div></body></html>`;
}

async function renderDocxXml(content: string): Promise<string> {
  const paragraphs = buildDocxCitationAppendix(collectCitations(content));
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const buf = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buf);
  return await zip.file('word/document.xml')!.async('string');
}

for (const fx of FIXTURES) {
  test.describe(`Fixture: ${fx.id}`, () => {
    test(`aperçu HTML — badges sans URL non cliquables`, async ({ page }) => {
      await page.setContent(renderPreviewHtml(fx.content));

      const refs = collectCitations(fx.content);
      const broken = refs.filter((r) => r.kind === 'num' && !r.url) as Array<{
        num: string;
      }>;

      // Tous les badges cassés sont rendus, marqués aria-disabled et SANS <a> parent
      for (const b of broken) {
        const badge = page.locator(`[data-broken-citation="${b.num}"]`);
        await expect(badge).toHaveCount(1);
        await expect(badge).toHaveAttribute('aria-disabled', 'true');
        // Pas d'ancre cliquable enveloppante
        const wrappingAnchor = page.locator(`a:has([data-broken-citation="${b.num}"])`);
        await expect(wrappingAnchor).toHaveCount(0);
        // Pas non plus de référence comme ancre cliquable valide
        await expect(page.locator(`a[data-citation-num="${b.num}"]`)).toHaveCount(0);
      }

      // Tous les valides ONT bien une ancre
      const validNums = refs
        .filter((r) => r.kind === 'num' && r.url)
        .map((r: any) => r.num as string);
      for (const n of validNums) {
        await expect(page.locator(`a[data-citation-num="${n}"]`)).toHaveCount(1);
      }
    });

    test(`export PDF — pdf.link() ne référence aucune citation cassée`, async () => {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const linkedUrls: string[] = [];
      const orig = pdf.link.bind(pdf);
      (pdf as any).link = (x: number, y: number, w: number, h: number, opts: any) => {
        if (opts?.url) linkedUrls.push(opts.url);
        return orig(x, y, w, h, opts);
      };

      const refs = collectCitations(fx.content);
      renderPdfCitationAppendix(pdf, refs, { margin: 50, maxWidth: 495, y: 100 });

      const validCount = refs.filter((r) => !(r.kind === 'num' && !r.url)).length;
      expect(linkedUrls.length).toBe(validCount);
      for (const u of linkedUrls) expect(u).toMatch(/^https?:\/\//);

      const brokenNums = refs
        .filter((r) => r.kind === 'num' && !r.url)
        .map((r: any) => r.num as string);
      for (const b of brokenNums) {
        const leak = linkedUrls.find((u) => u.includes(`/${b}`));
        expect(leak, `URL ne doit pas référencer la citation cassée [${b}]`).toBeUndefined();
      }
    });

    test(`export DOCX — aucun <w:hyperlink> n'enveloppe une citation cassée`, async () => {
      const xml = await renderDocxXml(fx.content);
      const refs = collectCitations(fx.content);
      const validCount = refs.filter((r) => !(r.kind === 'num' && !r.url)).length;
      const brokenNums = refs
        .filter((r) => r.kind === 'num' && !r.url)
        .map((r: any) => r.num as string);

      const hyperlinks = xml.match(/<w:hyperlink[\s\S]*?<\/w:hyperlink>/g) ?? [];
      expect(hyperlinks.length).toBe(validCount);

      if (brokenNums.length > 0) {
        expect(xml).toContain('⚠ Lien manquant');
        for (const block of hyperlinks) {
          expect(block).not.toContain('⚠ Lien manquant');
          for (const n of brokenNums) {
            expect(
              block.includes(`[${n}]`),
              `Hyperlien DOCX contient à tort la citation cassée [${n}]`,
            ).toBe(false);
          }
        }
      } else {
        expect(xml).not.toContain('⚠ Lien manquant');
      }
    });
  });
}
