import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Italic, Code, List, Link, Heading2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const toolbarActions = [
  { icon: Bold, label: 'Gras', prefix: '**', suffix: '**', placeholder: 'texte en gras' },
  { icon: Italic, label: 'Italique', prefix: '*', suffix: '*', placeholder: 'texte en italique' },
  { icon: Code, label: 'Code', prefix: '`', suffix: '`', placeholder: 'code' },
  { icon: Heading2, label: 'Titre', prefix: '## ', suffix: '', placeholder: 'Titre' },
  { icon: List, label: 'Liste', prefix: '- ', suffix: '', placeholder: 'élément' },
  { icon: Link, label: 'Lien', prefix: '[', suffix: '](url)', placeholder: 'texte du lien' },
];

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = 'Rédigez votre contenu en Markdown...',
  minHeight = '300px'
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  const insertAtCursor = (prefix: string, suffix: string, placeholder: string) => {
    const textarea = document.querySelector<HTMLTextAreaElement>('[data-markdown-editor]');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || placeholder;
    
    const newText = 
      value.substring(0, start) + 
      prefix + selectedText + suffix + 
      value.substring(end);
    
    onChange(newText);
    
    // Repositionner le curseur
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'write' | 'preview')}>
        <div className="flex items-center justify-between border-b bg-muted/30 px-2">
          <TabsList className="h-10 bg-transparent">
            <TabsTrigger value="write" className="text-sm">
              Écrire
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-sm">
              Prévisualiser
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'write' && (
            <div className="flex items-center gap-0.5">
              {toolbarActions.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title={action.label}
                  onClick={() => insertAtCursor(action.prefix, action.suffix, action.placeholder)}
                >
                  <action.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          )}
        </div>

        <TabsContent value="write" className="m-0">
          <Textarea
            data-markdown-editor
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "border-0 rounded-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0",
              "font-mono text-sm"
            )}
            style={{ minHeight }}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div 
            className="p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto"
            style={{ minHeight }}
          >
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Aucun contenu à prévisualiser</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
