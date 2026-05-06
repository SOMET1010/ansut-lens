import { useState } from 'react';
import { FileText, Copy, RefreshCw, X, Download, ChevronRight, Loader2, Check, Save, AlertTriangle, Settings2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Header, Footer, PageNumber, BorderStyle, ShadingType, ExternalHyperlink, TableOfContents, PageBreak, convertMillimetersToTwip } from 'docx';
import { saveAs } from 'file-saver';
import { ExportSettingsDialog, type ExportOptions, loadExportOptions } from './ExportSettingsDialog';

export interface GeneratedDocument {
  title: string;
  content: string;
  type: 'note' | 'briefing' | 'rapport';
}

interface DocumentWorkspaceProps {
  document: GeneratedDocument | null;
  isGenerating: boolean;
  onRegenerate?: () => void;
  onClose: () => void;
  onSuggestionClick: (prompt: string) => void;
}

const suggestions = [
  { text: 'Rédige une note de synthèse sur...', prompt: 'Rédige une note de synthèse à l\'attention du Ministre sur le sujet de la couverture numérique rurale' },
  { text: 'Prépare un briefing DG sur...', prompt: 'Prépare un briefing DG sur les dernières actualités du secteur télécoms cette semaine' },
  { text: 'Analyse les tendances de...', prompt: 'Analyse les tendances de l\'industrie des télécommunications en Côte d\'Ivoire' },
];

export function DocumentWorkspace({ 
  document, 
  isGenerating, 
  onRegenerate,
  onClose,
  onSuggestionClick 
}: DocumentWorkspaceProps) {
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportState, setExportState] = useState<{
    status: 'idle' | 'loading' | 'error';
    format?: 'pdf' | 'docx';
    error?: string;
  }>({ status: 'idle' });

  const formatLabel = (f?: 'pdf' | 'docx') => f === 'docx' ? 'DOCX' : 'PDF';

  const runExport = async (opts: ExportOptions) => {
    if (!document) return;
    setExportState({ status: 'loading', format: opts.format });
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (opts.format === 'pdf') {
        runExportPDF(opts);
      } else {
        await runExportDOCX(opts);
      }
      setExportState({ status: 'idle' });
      setSettingsOpen(false);
      toast.success(`${formatLabel(opts.format)} téléchargé`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur inconnue';
      console.error(`[Export ${opts.format}] échec:`, e);
      setExportState({ status: 'error', format: opts.format, error: message });
      toast.error(`Échec de l'export ${formatLabel(opts.format)}`, { description: message });
    }
  };

  const handleOpenSettings = () => setSettingsOpen(true);
  const handleRetryExport = () => {
    if (!document) return;
    const opts = loadExportOptions((document.title || 'document').replace(/\.(docx|pdf|txt)$/i, ''));
    if (exportState.format) opts.format = exportState.format;
    void runExport(opts);
  };
  const dismissError = () => setExportState({ status: 'idle' });

  const handleCopy = async () => {
    if (!document) return;
    
    try {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      toast.success('Document copié dans le presse-papier');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  const baseTitle = (document?.title || 'document').replace(/\.(docx|pdf|txt)$/i, '');

  const docTypeLabel = (t?: 'note' | 'briefing' | 'rapport') =>
    t === 'briefing' ? 'Briefing' : t === 'rapport' ? 'Rapport' : 'Note de synthèse';

  const runExportPDF = (opts: ExportOptions) => {
    if (!document) throw new Error('Aucun document à exporter');
    const pdf = new jsPDF({ unit: 'pt', format: opts.pageFormat === 'letter' ? 'letter' : 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginByPreset = { narrow: 36, normal: 50, wide: 72 };
      const margin = marginByPreset[opts.margin];
      const customHeader = opts.headerText.trim();
      const customFooter = opts.footerText.trim();
      const maxWidth = pageWidth - margin * 2;
      const cleanTitle = document.title.replace(/\.(docx|pdf|txt)$/i, '');
      const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      // ===== COVER PAGE =====
      // Top accent bar
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageWidth, 6, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text('ANSUT • RADAR STRATÉGIQUE', margin, 80);

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 92, pageWidth - margin, 92);

      // Document type
      pdf.setFontSize(11);
      pdf.setTextColor(59, 130, 246);
      pdf.text(docTypeLabel(document.type).toUpperCase(), margin, 200);

      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(26);
      pdf.setTextColor(15, 23, 42);
      const coverTitleLines = pdf.splitTextToSize(cleanTitle, maxWidth);
      pdf.text(coverTitleLines, margin, 230);

      // Meta block
      const metaY = 230 + coverTitleLines.length * 32 + 40;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Date d'édition : ${today}`, margin, metaY);
      pdf.text('Auteur : Assistant SUTA — ANSUT', margin, metaY + 16);
      pdf.text('Confidentialité : Usage interne', margin, metaY + 32);

      // Footer cover
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Document généré automatiquement — Vérifier avant diffusion', margin, pageHeight - 50);

      // ===== CONTENT PAGES =====
      pdf.addPage();
      const contentTop = margin + 25;
      const contentBottom = pageHeight - margin - 15;
      let y = contentTop;

      // Track headings encountered during render for the TOC
      type TocEntry = { level: number; text: string; page: number };
      const tocEntries: TocEntry[] = [];

      // Header on content pages
      const drawHeader = () => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        const headerTitle = cleanTitle.length > 70 ? cleanTitle.slice(0, 70) + '…' : cleanTitle;
        pdf.text(headerTitle, margin, 30);
        if (customHeader) pdf.text(customHeader, pageWidth - margin, 30, { align: 'right' });
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 36, pageWidth - margin, 36);
      };

      const drawWatermark = () => {
        if (!opts.watermarkEnabled || !opts.watermarkText.trim()) return;
        pdf.saveGraphicsState();
        // @ts-ignore - jsPDF GState typing is loose
        pdf.setGState(pdf.GState({ opacity: 0.08 }));
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(90);
        pdf.setTextColor(15, 23, 42);
        pdf.text(opts.watermarkText.toUpperCase(), pageWidth / 2, pageHeight / 2, {
          align: 'center', baseline: 'middle', angle: 35,
        });
        pdf.restoreGraphicsState();
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > contentBottom) {
          pdf.addPage();
          y = contentTop;
          drawHeader();
        }
      };

      // App base for actu/dossier deep links
      const APP_BASE = 'https://ansut-lens.lovable.app';

      // Build a map of numeric references → URL by scanning for footnote-style lines
      // Accepts: "[1] https://..." | "[1]: https://..." | "1. https://..." | "1) https://..."
      const numRefUrls: Record<string, string> = {};
      {
        const refRe = /(?:^|\n)\s*(?:\[(\d{1,3})\]:?|(\d{1,3})[.)])\s*(https?:\/\/\S+)/g;
        let rm: RegExpExecArray | null;
        while ((rm = refRe.exec(document.content)) !== null) {
          const n = rm[1] || rm[2];
          if (n && !numRefUrls[n]) numRefUrls[n] = rm[3].replace(/[.,;)\]]+$/, '');
        }
      }

      const citationUrl = (variant: 'actu' | 'dossier' | 'num', idOrNum: string): string | null => {
        if (variant === 'actu') return `${APP_BASE}/radar?tab=flux&id=${encodeURIComponent(idOrNum)}`;
        if (variant === 'dossier') return `${APP_BASE}/dossiers?id=${encodeURIComponent(idOrNum)}`;
        return numRefUrls[idOrNum] || null;
      };

      // Tokenize a line into text/bold/citation segments
      type Seg =
        | { kind: 'text'; text: string; bold: boolean }
        | { kind: 'cite'; variant: 'actu' | 'dossier' | 'num'; label: string; id: string };

      const tokenizeLine = (text: string): Seg[] => {
        // Combined regex: bold | [[ACTU|DOSSIER:id|title]] | [n]
        const re = /(\*\*[^*]+\*\*)|(\[\[(ACTU|DOSSIER):([^|\]]+)\|([^\]]+)\]\])|(\[(\d{1,3})\])/g;
        const segs: Seg[] = [];
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          if (m.index > last) segs.push({ kind: 'text', text: text.slice(last, m.index), bold: false });
          if (m[1]) {
            segs.push({ kind: 'text', text: m[1].slice(2, -2), bold: true });
          } else if (m[2]) {
            segs.push({ kind: 'cite', variant: m[3] === 'ACTU' ? 'actu' : 'dossier', id: m[4], label: m[5] });
          } else if (m[6]) {
            segs.push({ kind: 'cite', variant: 'num', id: m[7], label: m[7] });
          }
          last = m.index + m[0].length;
        }
        if (last < text.length) segs.push({ kind: 'text', text: text.slice(last), bold: false });
        return segs;
      };

      const drawCitationBadge = (label: string, variant: 'actu' | 'dossier' | 'num', id: string, cursorX: number, baselineY: number) => {
        const url = citationUrl(variant, id);
        const broken = !url;
        // Colors per variant — broken state uses muted/warning palette
        const palette = broken
          ? { bg: [254, 243, 199], fg: [146, 64, 14], border: [253, 224, 71] } // amber (lien manquant)
          : variant === 'actu'
            ? { bg: [219, 234, 254], fg: [29, 78, 216], border: [191, 219, 254] } // blue
            : variant === 'dossier'
              ? { bg: [243, 232, 255], fg: [126, 34, 206], border: [221, 214, 254] } // purple
              : { bg: [241, 245, 249], fg: [51, 65, 85], border: [203, 213, 225] }; // slate

        const prefix = broken ? '⚠ ' : variant === 'actu' ? '◆ ' : variant === 'dossier' ? '■ ' : '';
        const display = variant === 'num' ? label : (label.length > 40 ? label.slice(0, 39) + '…' : label);
        const suffix = broken ? ' · lien manquant' : '';
        const fullText = prefix + display + suffix;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(variant === 'num' ? 8 : 9);
        const tw = pdf.getTextWidth(fullText);
        const padX = 4, padY = 2;
        const w = tw + padX * 2;
        const h = (variant === 'num' ? 9 : 11) + padY;
        const boxY = baselineY - h + 2;
        pdf.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
        pdf.setDrawColor(palette.border[0], palette.border[1], palette.border[2]);
        pdf.setLineWidth(0.4);
        // Dashed border for broken badges to mark non-clickable state
        if (broken && typeof (pdf as any).setLineDashPattern === 'function') {
          try { (pdf as any).setLineDashPattern([1.2, 1.2], 0); } catch { /* noop */ }
        }
        pdf.roundedRect(cursorX, boxY, w, h, 2, 2, 'FD');
        if (broken && typeof (pdf as any).setLineDashPattern === 'function') {
          try { (pdf as any).setLineDashPattern([], 0); } catch { /* noop */ }
        }
        pdf.setTextColor(palette.fg[0], palette.fg[1], palette.fg[2]);
        pdf.text(fullText, cursorX + padX, baselineY - 1);
        // Clickable hyperlink area only when URL exists
        if (url) {
          try { pdf.link(cursorX, boxY, w, h, { url }); } catch { /* noop */ }
        }
        // restore default
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        return w;
      };

      const measureCitation = (label: string, variant: 'actu' | 'dossier' | 'num', id: string) => {
        const broken = !citationUrl(variant, id);
        const prefix = broken ? '⚠ ' : variant === 'actu' ? '◆ ' : variant === 'dossier' ? '■ ' : '';
        const display = variant === 'num' ? label : (label.length > 40 ? label.slice(0, 39) + '…' : label);
        const suffix = broken ? ' · lien manquant' : '';
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(variant === 'num' ? 8 : 9);
        const w = pdf.getTextWidth(prefix + display + suffix) + 8;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        return w;
      };

      // Render a run of text with bold + citation badges
      const renderRichLine = (text: string, x: number, lineHeight: number, indent: number) => {
        const segments = tokenizeLine(text);
        const availableWidth = maxWidth - indent;
        let cursorX = x;

        const newLine = () => {
          y += lineHeight;
          ensureSpace(lineHeight);
          cursorX = x;
        };

        const writeWord = (word: string, bold: boolean, space: string) => {
          pdf.setFont('helvetica', bold ? 'bold' : 'normal');
          const sep = cursorX === x ? '' : space;
          const w = pdf.getTextWidth(sep + word);
          if (cursorX + w > x + availableWidth) {
            newLine();
            pdf.text(word, cursorX, y);
            cursorX += pdf.getTextWidth(word);
          } else {
            pdf.text(sep + word, cursorX, y);
            cursorX += w;
          }
        };

        for (const seg of segments) {
          if (seg.kind === 'text') {
            const tokens = seg.text.split(/(\s+)/);
            let pendingSpace = '';
            for (const tok of tokens) {
              if (!tok) continue;
              if (/^\s+$/.test(tok)) { pendingSpace = tok; continue; }
              writeWord(tok, seg.bold, pendingSpace || ' ');
              pendingSpace = '';
            }
          } else {
            const bw = measureCitation(seg.label, seg.variant);
            const sep = cursorX === x ? 0 : pdf.getTextWidth(' ');
            if (cursorX + sep + bw > x + availableWidth) newLine();
            else cursorX += sep > 0 ? (pdf.text(' ', cursorX, y), sep) : 0;
            const drawn = drawCitationBadge(seg.label, seg.variant, seg.id, cursorX, y);
            cursorX += drawn;
          }
        }
        y += lineHeight;
      };

      drawHeader();
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);

      const rawLines = document.content.split('\n');
      let inCodeBlock = false;

      for (let idx = 0; idx < rawLines.length; idx++) {
        const raw = rawLines[idx];
        const line = raw.replace(/\s+$/, '');
        const trimmed = line.trim();

        // Code fences
        if (/^```/.test(trimmed)) { inCodeBlock = !inCodeBlock; y += 4; continue; }

        if (inCodeBlock) {
          ensureSpace(13);
          pdf.setFont('courier', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(51, 65, 85);
          const wrapped = pdf.splitTextToSize(line || ' ', maxWidth - 12);
          pdf.setFillColor(241, 245, 249);
          pdf.rect(margin, y - 9, maxWidth, wrapped.length * 12 + 4, 'F');
          pdf.text(wrapped, margin + 6, y);
          y += wrapped.length * 12 + 6;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          pdf.setTextColor(15, 23, 42);
          continue;
        }

        // Empty line = paragraph spacing
        if (!trimmed) { y += 6; continue; }

        // Horizontal rule
        if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
          ensureSpace(14);
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.5);
          pdf.line(margin, y, pageWidth - margin, y);
          y += 12;
          continue;
        }

        // Headings (# / ## / ### / ####)
        const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2].replace(/\*\*/g, '');
          const sizes = [18, 14, 12, 11];
          const spaceBefore = [16, 14, 10, 8];
          const spaceAfter = [10, 8, 6, 4];
          const lineH = [22, 18, 16, 14];
          const size = sizes[level - 1];
          const lh = lineH[level - 1];

          // Keep heading with at least 2 lines of next content
          ensureSpace(spaceBefore[level - 1] + lh + 30);
          y += spaceBefore[level - 1];

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(size);
          pdf.setTextColor(level === 1 ? 15 : 30, level === 1 ? 23 : 41, level === 1 ? 42 : 59);
          const wrapped = pdf.splitTextToSize(text, maxWidth);
          // Record heading position (current page number, before drawing)
          if (level <= 3) tocEntries.push({ level, text, page: pdf.getNumberOfPages() });
          pdf.text(wrapped, margin, y);
          y += wrapped.length * lh;

          // Underline for H1
          if (level === 1) {
            pdf.setDrawColor(59, 130, 246);
            pdf.setLineWidth(1.2);
            pdf.line(margin, y - 2, margin + 40, y - 2);
          }
          y += spaceAfter[level - 1];

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          pdf.setTextColor(15, 23, 42);
          continue;
        }

        // Blockquote
        if (/^>\s?/.test(trimmed)) {
          const quoteText = trimmed.replace(/^>\s?/, '');
          ensureSpace(16);
          const startY = y;
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(71, 85, 105);
          renderRichLine(quoteText, margin + 14, 14, 14);
          // Left vertical bar
          pdf.setDrawColor(59, 130, 246);
          pdf.setLineWidth(2);
          pdf.line(margin + 4, startY - 9, margin + 4, y - 4);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(15, 23, 42);
          y += 2;
          continue;
        }

        // Lists (bullet & numbered) with indentation level
        const listMatch = line.match(/^(\s*)([-*•]|\d+\.)\s+(.+)$/);
        if (listMatch) {
          const indentSpaces = listMatch[1].length;
          const level = Math.min(Math.floor(indentSpaces / 2), 3);
          const indent = level * 14;
          const isOrdered = /^\d+\./.test(listMatch[2]);
          const marker = isOrdered ? listMatch[2] : (level === 0 ? '•' : level === 1 ? '◦' : '▪');
          const itemText = listMatch[3];

          ensureSpace(14);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          pdf.setTextColor(level === 0 ? 15 : 71, level === 0 ? 23 : 85, level === 0 ? 42 : 105);
          pdf.text(marker, margin + indent, y);
          pdf.setTextColor(15, 23, 42);
          renderRichLine(itemText, margin + indent + 14, 14, indent + 14);
          y += 1;
          continue;
        }

        // Default paragraph
        ensureSpace(14);
        renderRichLine(trimmed, margin, 14, 0);
        y += 3;
      }

      // ===== TABLE OF CONTENTS (inserted as page 2, after cover) =====
      if (tocEntries.length > 0) {
        pdf.insertPage(2);
        pdf.setPage(2);
        // Header
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(cleanTitle.length > 70 ? cleanTitle.slice(0, 70) + '…' : cleanTitle, margin, 30);
        pdf.text('ANSUT', pageWidth - margin, 30, { align: 'right' });
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 36, pageWidth - margin, 36);

        // Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(15, 23, 42);
        pdf.text('Sommaire', margin, contentTop + 10);
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(1.2);
        pdf.line(margin, contentTop + 14, margin + 50, contentTop + 14);

        let ty = contentTop + 44;
        const tocBottom = pageHeight - margin - 30;
        for (const entry of tocEntries) {
          if (ty > tocBottom) break; // simple single-page TOC
          const indent = (entry.level - 1) * 16;
          const isH1 = entry.level === 1;
          pdf.setFont('helvetica', isH1 ? 'bold' : 'normal');
          pdf.setFontSize(isH1 ? 11 : 10);
          pdf.setTextColor(isH1 ? 15 : 71, isH1 ? 23 : 85, isH1 ? 42 : 105);

          const targetPage = entry.page + 1; // shifted by inserted TOC
          const pageStr = String(targetPage - 2); // logical page number (content)
          const pageW = pdf.getTextWidth(pageStr);
          const titleMaxW = maxWidth - indent - pageW - 20;
          const titleText = pdf.splitTextToSize(entry.text, titleMaxW)[0];
          const titleW = pdf.getTextWidth(titleText);

          pdf.text(titleText, margin + indent, ty);
          // Dot leader
          pdf.setTextColor(203, 213, 225);
          const dotsStartX = margin + indent + titleW + 4;
          const dotsEndX = pageWidth - margin - pageW - 4;
          if (dotsEndX > dotsStartX) {
            const dotW = pdf.getTextWidth('.');
            const dotCount = Math.max(0, Math.floor((dotsEndX - dotsStartX) / dotW));
            pdf.text('.'.repeat(dotCount), dotsStartX, ty);
          }
          // Page number
          pdf.setTextColor(isH1 ? 15 : 71, isH1 ? 23 : 85, isH1 ? 42 : 105);
          pdf.text(pageStr, pageWidth - margin, ty, { align: 'right' });

          // Clickable link to target page
          try {
            pdf.link(margin + indent, ty - 10, maxWidth - indent, 14, { pageNumber: targetPage });
          } catch { /* noop */ }

          ty += isH1 ? 20 : 16;
        }
      }

      // Page numbers + watermark (cover = 1, TOC = 2 if present, content starts after)
      const totalPages = pdf.getNumberOfPages();
      const contentStart = tocEntries.length > 0 ? 3 : 2;
      const contentTotal = totalPages - (contentStart - 1);
      const footerLabel = customFooter;
      for (let i = contentStart; i <= totalPages; i++) {
        pdf.setPage(i);
        drawWatermark();
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        if (opts.showPageNumbers) {
          pdf.text(`Page ${i - contentStart + 1} / ${contentTotal}`, pageWidth - margin, pageHeight - 25, { align: 'right' });
        }
        if (footerLabel) pdf.text(footerLabel, margin, pageHeight - 25);
      }
      // Footer for TOC page
      if (tocEntries.length > 0) {
        pdf.setPage(2);
        drawWatermark();
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text('Sommaire', pageWidth - margin, pageHeight - 25, { align: 'right' });
        if (footerLabel) pdf.text(footerLabel, margin, pageHeight - 25);
      }
      // Watermark on cover
      pdf.setPage(1);
      drawWatermark();

    const safeName = (opts.filename || baseTitle).replace(/\.(pdf|docx|txt)$/i, '').trim() || baseTitle;
    pdf.save(`${safeName}.pdf`);
  };

  const runExportDOCX = async (opts: ExportOptions) => {
    if (!document) throw new Error('Aucun document à exporter');
    const cleanTitle = document.title.replace(/\.(docx|pdf|txt)$/i, '');
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      const children: (Paragraph | TableOfContents)[] = [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: 'ANSUT • RADAR STRATÉGIQUE', bold: true, size: 18, color: '64748B' })],
          border: { bottom: { color: 'E2E8F0', space: 4, style: BorderStyle.SINGLE, size: 6 } },
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: docTypeLabel(document.type).toUpperCase(), bold: true, size: 20, color: '3B82F6' })],
          spacing: { after: 120 },
        }),
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [new TextRun({ text: cleanTitle, bold: true, size: 36 })],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Date d'édition : ${today}`, size: 20, color: '475569' })],
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Auteur : Assistant SUTA — ANSUT', size: 20, color: '475569' })],
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Confidentialité : Usage interne', size: 20, color: '475569' })],
          spacing: { after: 400 },
        }),
        new Paragraph({ children: [new PageBreak()] }),
        // Table of Contents (auto-built by Word from Heading 1-3)
        new Paragraph({
          children: [new TextRun({ text: 'Sommaire', bold: true, size: 32, color: '0F172A' })],
          spacing: { after: 200 },
          border: { bottom: { color: '3B82F6', space: 4, style: BorderStyle.SINGLE, size: 12 } },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Mettez à jour le sommaire dans Word (clic droit → Mettre à jour les champs).', italics: true, size: 16, color: '94A3B8' })],
          spacing: { after: 200 },
        }),
        new TableOfContents('Sommaire', {
          hyperlink: true,
          headingStyleRange: '1-3',
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ];


      const APP_BASE = 'https://ansut-lens.lovable.app';
      // Parse numeric reference URLs once for the whole document
      const numRefUrlsDocx: Record<string, string> = {};
      {
        const refRe = /(?:^|\n)\s*(?:\[(\d{1,3})\]:?|(\d{1,3})[.)])\s*(https?:\/\/\S+)/g;
        let rm: RegExpExecArray | null;
        while ((rm = refRe.exec(document.content)) !== null) {
          const n = rm[1] || rm[2];
          if (n && !numRefUrlsDocx[n]) numRefUrlsDocx[n] = rm[3].replace(/[.,;)\]]+$/, '');
        }
      }
      const docxCitationUrl = (variant: 'actu' | 'dossier' | 'num', id: string): string | null => {
        if (variant === 'actu') return `${APP_BASE}/radar?tab=flux&id=${encodeURIComponent(id)}`;
        if (variant === 'dossier') return `${APP_BASE}/dossiers?id=${encodeURIComponent(id)}`;
        return numRefUrlsDocx[id] || null;
      };

      const lines = document.content.split('\n');
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) { children.push(new Paragraph({ text: '' })); continue; }

        const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
          children.push(new Paragraph({ heading: headingLevel, children: [new TextRun({ text: headingMatch[2], bold: true })] }));
          continue;
        }

        const isList = /^[-*]\s+/.test(line);
        const text = line.replace(/^[-*]\s+/, '');

        // Tokenize: bold | [[ACTU|DOSSIER:id|title]] | [n]
        const re = /(\*\*[^*]+\*\*)|(\[\[(ACTU|DOSSIER):([^|\]]+)\|([^\]]+)\]\])|(\[(\d{1,3})\])/g;
        const runs: (TextRun | ExternalHyperlink)[] = [];
        let last = 0;
        let m: RegExpExecArray | null;
        const pushText = (t: string, bold = false) => {
          if (t) runs.push(new TextRun({ text: t, bold }));
        };
        const wrapWithLink = (run: TextRun, url: string | null) => {
          if (!url) return run;
          return new ExternalHyperlink({ link: url, children: [run] });
        };
        while ((m = re.exec(text)) !== null) {
          if (m.index > last) pushText(text.slice(last, m.index));
          if (m[1]) {
            pushText(m[1].slice(2, -2), true);
          } else if (m[2]) {
            const isActu = m[3] === 'ACTU';
            const id = m[4];
            const rawLabel = m[5];
            const label = rawLabel.length > 40 ? rawLabel.slice(0, 39) + '…' : rawLabel;
            const url = docxCitationUrl(isActu ? 'actu' : 'dossier', id);
            const badgeRun = new TextRun({
              text: ` ${isActu ? '◆' : '■'} ${label} `,
              bold: true,
              size: 16,
              color: isActu ? '1D4ED8' : '7E22CE',
              shading: { type: ShadingType.CLEAR, fill: isActu ? 'DBEAFE' : 'F3E8FF', color: 'auto' },
              style: url ? 'Hyperlink' : undefined,
            });
            runs.push(wrapWithLink(badgeRun, url));
          } else if (m[6]) {
            const num = m[7];
            const url = docxCitationUrl('num', num);
            const badgeRun = new TextRun({
              text: ` [${num}] `,
              bold: true,
              size: 14,
              color: '334155',
              shading: { type: ShadingType.CLEAR, fill: 'F1F5F9', color: 'auto' },
              style: url ? 'Hyperlink' : undefined,
            });
            runs.push(wrapWithLink(badgeRun, url));
          }
          last = m.index + m[0].length;
        }
        if (last < text.length) pushText(text.slice(last));

        children.push(new Paragraph({
          children: runs,
          bullet: isList ? { level: 0 } : undefined,
        }));
      }

      const marginMm = opts.margin === 'narrow' ? 12.5 : opts.margin === 'wide' ? 35 : 25;
      const marginTwip = convertMillimetersToTwip(marginMm);
      const pageSize = opts.pageFormat === 'letter'
        ? { width: 12240, height: 15840 }
        : { width: 11906, height: 16838 };
      const customHeader = opts.headerText.trim();
      const customFooter = opts.footerText.trim();

      const footerRuns: TextRun[] = [];
      if (customFooter) footerRuns.push(new TextRun({ text: customFooter, size: 16, color: '94A3B8' }));
      if (opts.showPageNumbers) {
        footerRuns.push(new TextRun({ text: customFooter ? '  •  Page ' : 'Page ', size: 16, color: '94A3B8' }));
        footerRuns.push(new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }));
        footerRuns.push(new TextRun({ text: ' / ', size: 16, color: '94A3B8' }));
        footerRuns.push(new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8' }));
      }

      if (opts.watermarkEnabled && opts.watermarkText.trim()) {
        children.unshift(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: opts.watermarkText.toUpperCase(), bold: true, size: 144, color: 'E2E8F0' })],
          spacing: { after: 200 },
        }));
      }

      const doc = new Document({
        styles: {
          characterStyles: [
            {
              id: 'Hyperlink',
              name: 'Hyperlink',
              basedOn: 'DefaultParagraphFont',
              run: { color: '1D4ED8', underline: { type: 'single', color: '1D4ED8' } },
            },
          ],
        },
        sections: [{
          properties: {
            page: {
              size: pageSize,
              margin: { top: marginTwip, right: marginTwip, bottom: marginTwip, left: marginTwip },
            },
          },
          headers: {
            default: new Header({
              children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: customHeader || `${cleanTitle} — ANSUT`, size: 16, color: '94A3B8' })],
              })],
            }),
          },
          footers: {
            default: new Footer({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: footerRuns })],
            }),
          },
          children,
        }],
      });
    const blob = await Packer.toBlob(doc);
    const safeName = (opts.filename || baseTitle).replace(/\.(pdf|docx|txt)$/i, '').trim() || baseTitle;
    saveAs(blob, `${safeName}.docx`);
  };

  const handleSaveDraft = () => {
    toast.success('Brouillon enregistré (fonctionnalité à venir)');
  };

  // Empty state
  if (!document && !isGenerating) {
    return (
      <div className="w-full h-full bg-card rounded-2xl border shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-bold text-foreground mb-2">Espace de travail</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Demandez à l'assistant de rédiger un document. Il apparaîtra ici en temps réel.
          </p>
          <div className="space-y-2 w-full max-w-xs">
            {suggestions.map((s, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-auto py-2.5 px-3 text-left"
                onClick={() => onSuggestionClick(s.prompt)}
              >
                <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">{s.text}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating && !document) {
    return (
      <div className="w-full h-full bg-card rounded-2xl border shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <h3 className="font-bold text-foreground mb-2">Génération en cours...</h3>
          <p className="text-sm text-muted-foreground">
            L'assistant rédige votre document
          </p>
        </div>
      </div>
    );
  }

  // Document view
  return (
    <div className="w-full h-full bg-card rounded-2xl border shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-primary/5 flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary min-w-0">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="font-bold text-sm truncate">{document?.title}</span>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleCopy}
            title="Copier"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          {onRegenerate && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onRegenerate}
              title="Régénérer"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={onClose}
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Document Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 prose prose-sm max-w-none text-sm leading-7">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mb-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold text-foreground mt-6 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold text-foreground mt-4 mb-2 uppercase tracking-wider">{children}</h3>,
              p: ({ children }) => <p className="mb-4 text-foreground/90 text-justify">{children}</p>,
              strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-foreground/90">{children}</li>,
            }}
          >
            {document?.content || ''}
          </ReactMarkdown>
          {isGenerating && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
          )}
        </div>
      </ScrollArea>
      
      {/* Export error banner */}
      {exportState.status === 'error' && (
        <div className="px-4 pt-3 border-t">
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold flex items-center justify-between gap-2">
              <span>Échec de l'export {formatLabel(exportState.format)}</span>
              <button
                onClick={dismissError}
                className="text-xs font-normal opacity-70 hover:opacity-100"
                aria-label="Fermer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 space-y-2">
              <p className="break-words">{exportState.error || 'Erreur inconnue'}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryExport}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveDraft}
          disabled={exportState.status === 'loading'}
          className="text-xs"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Enregistrer
        </Button>
        <Button size="sm" onClick={handleOpenSettings} disabled={exportState.status === 'loading'} className="text-xs min-w-[140px]">
          {exportState.status === 'loading' ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Export {formatLabel(exportState.format)}…
            </>
          ) : (
            <>
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Exporter…
            </>
          )}
        </Button>
      </div>

      <ExportSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        baseTitle={baseTitle}
        onExport={(o) => void runExport(o)}
        isExporting={exportState.status === 'loading'}
      />
    </div>
  );
}

// Utility to detect if content is a structured document
export function detectDocument(content: string): GeneratedDocument | null {
  // Patterns to detect a formal note
  const notePatterns = [
    /NOTE\s+(?:A|À)\s+L['']ATTENTION/i,
    /OBJET\s*:/i,
    /^#+\s*I\.\s+/im,
    /BRIEFING/i,
    /RAPPORT/i,
    /^#+\s*CONTEXTE/im,
    /^#+\s*ANALYSE/im,
  ];
  
  const hasDocumentStructure = notePatterns.some(p => p.test(content));
  
  if (hasDocumentStructure) {
    // Extract title from OBJET or first heading
    const objetMatch = content.match(/OBJET\s*:\s*(.+?)[\n\r]/i);
    const headingMatch = content.match(/^#+\s*(.+?)[\n\r]/m);
    
    let title = 'Document_genere.docx';
    let type: 'note' | 'briefing' | 'rapport' = 'note';
    
    if (objetMatch) {
      title = `Note_${objetMatch[1].slice(0, 30).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}.docx`;
    } else if (headingMatch) {
      title = `${headingMatch[1].slice(0, 30).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}.docx`;
    }
    
    if (/BRIEFING/i.test(content)) type = 'briefing';
    if (/RAPPORT/i.test(content)) type = 'rapport';
    
    return { title, content, type };
  }
  
  return null;
}
