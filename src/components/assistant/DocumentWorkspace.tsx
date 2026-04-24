import { useState } from 'react';
import { FileText, Copy, RefreshCw, X, Download, ChevronRight, Loader2, Check, Save, FileType2, FileDown, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Header, Footer, PageNumber, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

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
  const [exportState, setExportState] = useState<{
    status: 'idle' | 'loading' | 'error';
    format?: 'pdf' | 'docx';
    error?: string;
  }>({ status: 'idle' });

  const formatLabel = (f?: 'pdf' | 'docx') => f === 'docx' ? 'DOCX' : 'PDF';

  const runExport = async (format: 'pdf' | 'docx') => {
    if (!document) return;
    setExportState({ status: 'loading', format });
    try {
      // Yield to the event loop so the loading UI paints before heavy sync work
      await new Promise(resolve => setTimeout(resolve, 50));
      if (format === 'pdf') {
        runExportPDF();
      } else {
        await runExportDOCX();
      }
      setExportState({ status: 'idle' });
      toast.success(`${formatLabel(format)} téléchargé`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur inconnue';
      console.error(`[Export ${format}] échec:`, e);
      setExportState({ status: 'error', format, error: message });
      toast.error(`Échec de l'export ${formatLabel(format)}`, { description: message });
    }
  };

  const handleExportPDF = () => { void runExport('pdf'); };
  const handleExportDOCX = () => { void runExport('docx'); };
  const handleRetryExport = () => {
    if (exportState.format) void runExport(exportState.format);
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

  const runExportPDF = () => {
    if (!document) throw new Error('Aucun document à exporter');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 50;
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

      // Header on content pages
      const drawHeader = () => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        const headerTitle = cleanTitle.length > 70 ? cleanTitle.slice(0, 70) + '…' : cleanTitle;
        pdf.text(headerTitle, margin, 30);
        pdf.text('ANSUT', pageWidth - margin, 30, { align: 'right' });
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 36, pageWidth - margin, 36);
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > contentBottom) {
          pdf.addPage();
          y = contentTop;
          drawHeader();
        }
      };

      // Render a run of text with bold segments (**...**) preserved
      const renderRichLine = (text: string, x: number, lineHeight: number, indent: number) => {
        const segments: { text: string; bold: boolean }[] = [];
        const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        for (const p of parts) {
          if (/^\*\*.+\*\*$/.test(p)) segments.push({ text: p.slice(2, -2), bold: true });
          else segments.push({ text: p, bold: false });
        }

        // Manual word-wrap that respects bold boundaries
        const availableWidth = maxWidth - indent;
        let cursorX = x;
        let firstLineIndent = 0;
        const writeWord = (word: string, bold: boolean, space: string) => {
          pdf.setFont('helvetica', bold ? 'bold' : 'normal');
          const w = pdf.getTextWidth((cursorX === x ? '' : space) + word);
          if (cursorX + w > x + availableWidth - firstLineIndent) {
            y += lineHeight;
            ensureSpace(lineHeight);
            cursorX = x;
            firstLineIndent = 0;
            pdf.text(word, cursorX, y);
            cursorX += pdf.getTextWidth(word);
          } else {
            const out = (cursorX === x ? '' : space) + word;
            pdf.text(out, cursorX, y);
            cursorX += w;
          }
        };

        for (const seg of segments) {
          const tokens = seg.text.split(/(\s+)/);
          let pendingSpace = '';
          for (const tok of tokens) {
            if (!tok) continue;
            if (/^\s+$/.test(tok)) { pendingSpace = tok; continue; }
            writeWord(tok, seg.bold, pendingSpace || ' ');
            pendingSpace = '';
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

      // Page numbers (skip cover = page 1)
      const totalPages = pdf.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Page ${i - 1} / ${totalPages - 1}`, pageWidth - margin, pageHeight - 25, { align: 'right' });
        pdf.text('ANSUT — Document confidentiel', margin, pageHeight - 25);
      }

    pdf.save(`${baseTitle}.pdf`);
  };

  const runExportDOCX = async () => {
    if (!document) throw new Error('Aucun document à exporter');
    const cleanTitle = document.title.replace(/\.(docx|pdf|txt)$/i, '');
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      const children: Paragraph[] = [
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
        new Paragraph({ text: '' }),
      ];

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
        const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        const runs = segments.map(seg => {
          const bold = /^\*\*.+\*\*$/.test(seg);
          return new TextRun({ text: bold ? seg.slice(2, -2) : seg, bold });
        });

        children.push(new Paragraph({
          children: runs,
          bullet: isList ? { level: 0 } : undefined,
        }));
      }

      const doc = new Document({
        sections: [{
          headers: {
            default: new Header({
              children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `${cleanTitle} — ANSUT`, size: 16, color: '94A3B8' })],
              })],
            }),
          },
          footers: {
            default: new Footer({
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'ANSUT — Document confidentiel  •  Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                  new TextRun({ text: ' / ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8' }),
                ],
              })],
            }),
          },
          children,
        }],
      });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${baseTitle}.docx`);
  };

  const handleSaveDraft = () => {
    toast.success('Brouillon enregistré (fonctionnalité à venir)');
  };

  // Empty state
  if (!document && !isGenerating) {
    return (
      <div className="w-[400px] bg-card rounded-2xl border shadow-sm flex flex-col overflow-hidden">
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
      <div className="w-[400px] bg-card rounded-2xl border shadow-sm flex flex-col overflow-hidden">
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
    <div className="w-[400px] bg-card rounded-2xl border shadow-sm flex flex-col overflow-hidden">
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
      
      {/* Footer Actions */}
      <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSaveDraft}
          className="text-xs"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Enregistrer
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="text-xs">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Exporter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
              <FileType2 className="h-4 w-4 mr-2" />
              Exporter en PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportDOCX} className="cursor-pointer">
              <FileDown className="h-4 w-4 mr-2" />
              Exporter en DOCX
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
