import { describe, it, expect, vi } from 'vitest';
import jsPDF from 'jspdf';
import { Document, Packer } from 'docx';
import JSZip from 'jszip';
import {
  renderPdfCitationAppendix,
  buildDocxCitationAppendix,
} from '../citationAppendix';
import { collectCitations } from '../citationRefs';

/**
 * Integration tests that exercise the real export pipeline:
 *   - PDF: a jsPDF instance is created, the appendix is rendered into it, and we
 *     verify that `pdf.link()` (the only API that produces a clickable area in
 *     jsPDF) is invoked ONLY for citations with a URL.
 *   - DOCX: a real Document is built with `docx`, serialised to XML, and we
 *     check that broken citation labels never appear inside a `<w:hyperlink>`
 *     element while valid URLs do.
 */
const sample = [
  '# Briefing',
  '',
  'Voir [[ACTU:abc-1|Article ANSUT]] et [[DOSSIER:doss-9|Dossier interne]].',
  'Référence orpheline [42] — pas de source listée.',
  'Référence valide [7].',
  '',
  'Sources :',
  '[7] https://example.com/seven',
].join('\n');

describe('PDF export — clickable areas (integration)', () => {
  it('calls pdf.link() only for citations that have a URL', () => {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const linkSpy = vi.spyOn(pdf, 'link');

    const citations = collectCitations(sample);
    // Sanity: at least one broken numeric ref present.
    const broken = citations.filter((c) => c.kind === 'num' && !c.url);
    const valid = citations.filter((c) => !(c.kind === 'num' && !c.url));
    expect(broken.length).toBeGreaterThan(0);
    expect(valid.length).toBeGreaterThan(0);

    renderPdfCitationAppendix(pdf, citations, {
      margin: 50,
      maxWidth: 495,
      y: 100,
    });

    // Every link() call must carry one of the valid URLs and never a broken one.
    const linkedUrls = linkSpy.mock.calls.map((c) => (c[4] as { url?: string })?.url);
    expect(linkedUrls.length).toBe(valid.length);
    for (const u of linkedUrls) {
      expect(typeof u).toBe('string');
      expect(u).toMatch(/^https?:\/\//);
    }
    // No link() call carries an undefined/empty URL.
    expect(linkedUrls.every(Boolean)).toBe(true);
  });

  it('does not register any clickable area when every numeric ref is broken', () => {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const linkSpy = vi.spyOn(pdf, 'link');
    const onlyBroken = collectCitations('Texte avec [1] et [2] sans sources.');
    expect(onlyBroken.every((c) => c.kind === 'num' && !c.url)).toBe(true);

    renderPdfCitationAppendix(pdf, onlyBroken, {
      margin: 50,
      maxWidth: 495,
      y: 100,
    });
    expect(linkSpy).not.toHaveBeenCalled();
  });
});

describe('DOCX export — hyperlink wrapping (integration)', () => {
  async function renderXml(content: string): Promise<string> {
    const paragraphs = buildDocxCitationAppendix(collectCitations(content));
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const buf = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    return await zip.file('word/document.xml')!.async('string');
  }

  it('wraps valid URLs in <w:hyperlink> and never wraps broken refs', async () => {
    const xml = await renderXml(sample);

    // Valid URL appears AND inside a hyperlink element.
    expect(xml).toContain('https://example.com/seven');
    const hyperlinkBlocks = xml.match(/<w:hyperlink[\s\S]*?<\/w:hyperlink>/g) ?? [];
    expect(hyperlinkBlocks.length).toBeGreaterThan(0);
    expect(hyperlinkBlocks.some((b) => b.includes('https://example.com/seven'))).toBe(true);

    // Broken citation marker text MUST NOT appear inside any hyperlink block.
    const brokenMarker = '⚠ Lien manquant';
    expect(xml).toContain(brokenMarker);
    for (const block of hyperlinkBlocks) {
      expect(block).not.toContain(brokenMarker);
      // The broken numeric tag [42] also must not be inside a hyperlink.
      expect(block).not.toContain('[42]');
    }
  });

  it('produces zero <w:hyperlink> elements when all citations are broken', async () => {
    const xml = await renderXml('Document avec [3] et [5] sans aucune source.');
    expect(xml).toContain('⚠ Lien manquant');
    expect(xml).not.toMatch(/<w:hyperlink\b/);
  });
});
