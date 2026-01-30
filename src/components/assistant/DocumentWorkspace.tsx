import { useState } from 'react';
import { FileText, Copy, RefreshCw, X, Download, ChevronRight, Loader2, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

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

  const handleExportPDF = () => {
    // For now, we'll just download as a text file
    // PDF export would require additional library
    if (!document) return;
    
    const blob = new Blob([document.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.title.replace('.docx', '.txt');
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Document téléchargé');
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
        <Button 
          size="sm" 
          onClick={handleExportPDF}
          className="text-xs"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Exporter
        </Button>
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
