import { describe, it, expect, vi } from 'vitest';
import jsPDF from 'jspdf';
import { Document, Packer } from 'docx';
import JSZip from 'jszip';
import {
  renderPdfCitationAppendix,
  buildDocxCitationAppendix,
} from '../citationAppendix';
import { collectCitations } from '../citationRefs';
import { FIXTURES } from './fixtures/citationFixtures';

/**
 * Replays the same fixtures across PDF and DOCX exports to guarantee that
 * "lien manquant" badges never receive a clickable hyperlink area in either
 * format. Adding a new edge case = adding a fixture in citationFixtures.ts.
 */

async function renderDocxXml(content: string): Promise<string> {
  const paragraphs = buildDocxCitationAppendix(collectCitations(content));
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const buf = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buf);
  return await zip.file('word/document.xml')!.async('string');
}

describe('Citation export fixtures — collectCitations sanity', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] expected counts: ${fx.description}`, () => {
      const refs = collectCitations(fx.content);
      const actu = refs.filter((r) => r.kind === 'actu');
      const dossier = refs.filter((r) => r.kind === 'dossier');
      const num = refs.filter((r) => r.kind === 'num');
      const numValid = num.filter((r) => r.url !== null);
      const numBroken = num.filter((r) => r.url === null);

      expect(actu.length).toBe(fx.expected.actu);
      expect(dossier.length).toBe(fx.expected.dossier);
      expect(numValid.length).toBe(fx.expected.numValid);
      expect(numBroken.length).toBe(fx.expected.numBroken);
      if (fx.expected.validNums) {
        expect(numValid.map((r: any) => r.num).sort()).toEqual([...fx.expected.validNums].sort());
      }
      if (fx.expected.brokenNums) {
        expect(numBroken.map((r: any) => r.num).sort()).toEqual([...fx.expected.brokenNums].sort());
      }
    });
  }
});

describe('PDF export — fixtures replay', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] pdf.link() count matches valid citations`, () => {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const linkSpy = vi.spyOn(pdf, 'link');
      const refs = collectCitations(fx.content);
      const validCount = refs.filter((r) => !(r.kind === 'num' && !r.url)).length;

      renderPdfCitationAppendix(pdf, refs, { margin: 50, maxWidth: 495, y: 100 });

      const linked = linkSpy.mock.calls.map((c) => (c[4] as { url?: string })?.url);
      expect(linked.length).toBe(validCount);
      // Every linked URL must be defined and http(s).
      for (const u of linked) expect(u).toMatch(/^https?:\/\//);
      // None of the broken numeric refs must contribute a link.
      // (covered indirectly by the count check, but assert explicitly too)
      const brokenNums = refs.filter((r) => r.kind === 'num' && !r.url) as Array<{ num: string }>;
      for (const b of brokenNums) {
        expect(linked.some((u) => u?.includes(`/${b.num}`))).toBe(false);
      }
    });
  }
});

describe('DOCX export — fixtures replay', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] no <w:hyperlink> wraps a "lien manquant" badge`, async () => {
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
            expect(block).not.toContain(`[${n}]`);
          }
        }
      } else {
        expect(xml).not.toContain('⚠ Lien manquant');
      }
    });

    it(`[${fx.id}] DOCX content embeds every valid citation URL & label`, async () => {
      const xml = await renderDocxXml(fx.content);
      const refs = collectCitations(fx.content);
      const validRefs = refs.filter((r) => !(r.kind === 'num' && !r.url));

      // Strip XML tags to inspect the visible text content.
      const visibleText = xml.replace(/<[^>]+>/g, ' ');

      // For numeric refs, both label AND URL must be embedded in the DOCX.
      const validNum = validRefs.filter((r) => r.kind === 'num') as Array<{
        num: string;
        url: string;
      }>;
      for (const ref of validNum) {
        expect(visibleText).toContain(`[${ref.num}]`);
        const inAnchor = xml.includes(`Target="${ref.url}"`) || xml.includes(`>${ref.url}<`);
        const inText = visibleText.includes(ref.url);
        expect(inAnchor || inText).toBe(true);
      }

      // Broken numeric refs must still appear in the body text (just not clickable).
      const brokenNums = refs
        .filter((r) => r.kind === 'num' && !r.url)
        .map((r: any) => r.num as string);
      for (const n of brokenNums) {
        expect(visibleText).toContain(`[${n}]`);
      }
    });
  }
});

