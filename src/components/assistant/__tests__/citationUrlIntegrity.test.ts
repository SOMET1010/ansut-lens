import { describe, it, expect, vi } from 'vitest';
import jsPDF from 'jspdf';
import { Document, Packer } from 'docx';
import JSZip from 'jszip';
import {
  renderPdfCitationAppendix,
  buildDocxCitationAppendix,
} from '../citationAppendix';
import { collectCitations, type CitationRef } from '../citationRefs';
import { FIXTURES } from './fixtures/citationFixtures';

/**
 * URL Integrity tests.
 *
 * For every fixture, we compute the expected set of URLs (from collectCitations)
 * and assert that the exact same set is embedded in the generated PDF and DOCX
 * outputs — i.e. every resolved reference points to the correct source URL,
 * with no missing, mismatched or extra link.
 *
 * PDF: we capture URLs via jsPDF's `link()` API (the only mechanism that
 *      registers a clickable hyperlink in the generated file).
 * DOCX: we parse `word/_rels/document.xml.rels` and collect the `Target` of
 *       every `Hyperlink` relationship — this is the source of truth Word
 *       uses to open URLs.
 */

const expectedUrls = (refs: CitationRef[]) =>
  refs
    .filter((r): r is Exclude<CitationRef, { kind: 'num'; url: null }> =>
      !(r.kind === 'num' && !r.url),
    )
    .map((r) => (r as { url: string }).url)
    .sort();

function pdfLinkUrls(refs: CitationRef[]): string[] {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const spy = vi.spyOn(pdf, 'link');
  renderPdfCitationAppendix(pdf, refs, { margin: 50, maxWidth: 495, y: 100 });
  return spy.mock.calls
    .map((c) => (c[4] as { url?: string })?.url)
    .filter((u): u is string => typeof u === 'string')
    .sort();
}

async function docxHyperlinkTargets(refs: CitationRef[]): Promise<string[]> {
  const paragraphs = buildDocxCitationAppendix(refs);
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const buf = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buf);
  const relsXml = await zip.file('word/_rels/document.xml.rels')!.async('string');
  // Parse <Relationship Type="...hyperlink" Target="..."/>
  const re = /<Relationship\b[^>]*Type="[^"]*hyperlink"[^>]*Target="([^"]+)"[^>]*\/>/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(relsXml)) !== null) {
    // Decode XML entities that docx may use in attribute values.
    out.push(
      m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"),
    );
  }
  return out.sort();
}

describe('Citation URL integrity — PDF', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] embedded PDF links match resolved sources`, () => {
      const refs = collectCitations(fx.content);
      const expected = expectedUrls(refs);
      const actual = pdfLinkUrls(refs);
      expect(actual).toEqual(expected);
      // Defensive: every link is a syntactically valid http(s) URL.
      for (const u of actual) {
        expect(() => new URL(u)).not.toThrow();
        expect(u).toMatch(/^https?:\/\//);
      }
    });
  }
});

describe('Citation URL integrity — DOCX', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] embedded DOCX hyperlinks match resolved sources`, async () => {
      const refs = collectCitations(fx.content);
      const expected = expectedUrls(refs);
      const actual = await docxHyperlinkTargets(refs);
      expect(actual).toEqual(expected);
      for (const u of actual) {
        expect(() => new URL(u)).not.toThrow();
        expect(u).toMatch(/^https?:\/\//);
      }
    });
  }
});

describe('Citation URL integrity — cross-format consistency', () => {
  for (const fx of FIXTURES) {
    it(`[${fx.id}] PDF and DOCX export the exact same URL set`, async () => {
      const refs = collectCitations(fx.content);
      const pdfUrls = pdfLinkUrls(refs);
      const docxUrls = await docxHyperlinkTargets(refs);
      expect(pdfUrls).toEqual(docxUrls);
    });
  }
});
