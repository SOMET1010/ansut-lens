/**
 * Renderers for the "Annexe — Sources citées" appendix in PDF and DOCX exports.
 *
 * Extracted from DocumentWorkspace to keep the export contract testable:
 *   - badges WITH a URL must produce a clickable hyperlink
 *   - badges WITHOUT a URL ("lien manquant") must NOT produce any clickable
 *     hyperlink area, in either format.
 */
import type jsPDF from 'jspdf';
import {
  Paragraph,
  HeadingLevel,
  TextRun,
  ExternalHyperlink,
  PageBreak,
} from 'docx';
import type { CitationRef } from './citationRefs';

export interface PdfAppendixOptions {
  margin: number;
  maxWidth: number;
  /** Starting Y cursor */
  y: number;
  /** Add a TOC entry (optional) */
  onTocEntry?: (entry: { level: number; text: string; page: number }) => void;
  /** Reserve vertical space; default no-op */
  ensureSpace?: (h: number) => void;
}

/**
 * Renders the citations appendix into the given jsPDF document.
 * Returns the new Y cursor.
 *
 * Contract: `pdf.link()` is called ONLY for citations that have a non-empty URL.
 */
export function renderPdfCitationAppendix(
  pdf: jsPDF,
  citations: CitationRef[],
  opts: PdfAppendixOptions,
): number {
  if (citations.length === 0) return opts.y;
  const { margin, maxWidth } = opts;
  const ensureSpace = opts.ensureSpace ?? (() => {});
  let y = opts.y;

  ensureSpace(40);
  y += 18;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Annexe — Sources citées', margin, y);
  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(1.2);
  pdf.line(margin, y + 4, margin + 60, y + 4);
  y += 18;
  opts.onTocEntry?.({ level: 2, text: 'Annexe — Sources citées', page: pdf.getNumberOfPages() });

  const broken = citations.filter((c) => c.kind === 'num' && !c.url);
  const valid = citations.filter((c) => !(c.kind === 'num' && !c.url));

  const renderRow = (c: CitationRef) => {
    ensureSpace(16);
    const tag = c.kind === 'actu' ? 'ACTU' : c.kind === 'dossier' ? 'DOSSIER' : c.kind === 'num' ? `[${c.num}]` : '';
    const tagColor =
      c.kind === 'actu' ? [29, 78, 216] : c.kind === 'dossier' ? [126, 34, 206] : [51, 65, 85];
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(tagColor[0], tagColor[1], tagColor[2]);
    pdf.text(tag, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    const wrapped = pdf.splitTextToSize(c.label, maxWidth - 70);
    pdf.text(wrapped, margin + 60, y);
    const urlY = y + wrapped.length * 12;
    pdf.setFontSize(8);
    if ('url' in c && c.url) {
      pdf.setTextColor(29, 78, 216);
      const urlLines = pdf.splitTextToSize(c.url, maxWidth - 60);
      pdf.text(urlLines, margin + 60, urlY);
      try {
        pdf.link(margin + 60, urlY - 8, maxWidth - 60, urlLines.length * 10, { url: c.url });
      } catch {
        /* noop */
      }
      y = urlY + urlLines.length * 10 + 4;
    } else {
      pdf.setTextColor(146, 64, 14);
      pdf.text('⚠ Lien manquant — source à compléter', margin + 60, urlY);
      y = urlY + 12;
    }
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(11);
  };

  if (broken.length > 0) {
    ensureSpace(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(146, 64, 14);
    pdf.text(`Liens manquants (${broken.length})`, margin, y);
    y += 14;
    for (const c of broken) renderRow(c);
    y += 6;
  }
  if (valid.length > 0) {
    ensureSpace(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Sources référencées (${valid.length})`, margin, y);
    y += 14;
    for (const c of valid) renderRow(c);
  }
  return y;
}

/**
 * Builds the citations appendix as DOCX paragraphs.
 *
 * Contract: a citation produces an `ExternalHyperlink` only when it has a URL.
 * Broken citations produce a plain italic `TextRun` with no hyperlink wrapper.
 */
export function buildDocxCitationAppendix(citations: CitationRef[]): Paragraph[] {
  if (citations.length === 0) return [];
  const out: Paragraph[] = [];
  out.push(new Paragraph({ children: [new PageBreak()] }));
  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Annexe — Sources citées', bold: true })],
    }),
  );

  const broken = citations.filter((c) => c.kind === 'num' && !c.url);
  const valid = citations.filter((c) => !(c.kind === 'num' && !c.url));

  const pushRow = (c: CitationRef) => {
    const isBroken = c.kind === 'num' && !c.url;
    const tagText =
      c.kind === 'actu' ? 'ACTU' : c.kind === 'dossier' ? 'DOSSIER' : c.kind === 'num' ? `[${c.num}]` : '';
    const tagColor =
      c.kind === 'actu'
        ? '1D4ED8'
        : c.kind === 'dossier'
          ? '7E22CE'
          : isBroken
            ? '92400E'
            : '334155';
    out.push(
      new Paragraph({
        spacing: { before: 80, after: 20 },
        children: [
          new TextRun({ text: `${tagText}  `, bold: true, color: tagColor, size: 18 }),
          new TextRun({ text: c.label, size: 20 }),
        ],
      }),
    );
    if ('url' in c && c.url) {
      out.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new ExternalHyperlink({
              link: c.url,
              children: [new TextRun({ text: c.url, style: 'Hyperlink', size: 16 })],
            }),
          ],
        }),
      );
    } else {
      out.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: '⚠ Lien manquant — source à compléter',
              italics: true,
              color: '92400E',
              size: 16,
            }),
          ],
        }),
      );
    }
  };

  if (broken.length > 0) {
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: `Liens manquants (${broken.length})`, bold: true, color: '92400E' }),
        ],
      }),
    );
    for (const c of broken) pushRow(c);
  }
  if (valid.length > 0) {
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `Sources référencées (${valid.length})`, bold: true })],
      }),
    );
    for (const c of valid) pushRow(c);
  }
  return out;
}
