import { useState, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ArrowLeft, Save, Eye, Code, Loader2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';

import { BlockToolbar } from './BlockToolbar';
import { CanvasArea } from './CanvasArea';
import { PropertiesPanel } from './PropertiesPanel';
import { contenuToDocument, documentToContenu } from './utils/blockConverter';
import { exportToHtml } from './utils/htmlExporter';
import { useUpdateNewsletter } from '@/hooks/useNewsletters';

import type { Newsletter } from '@/types/newsletter';
import type { NewsletterDocument, NewsletterBlock, BlockStyle, GlobalStyles, BLOCK_DEFINITIONS } from '@/types/newsletter-studio';
import { BLOCK_DEFINITIONS as blockDefs } from '@/types/newsletter-studio';

interface NewsletterStudioProps {
  newsletter: Newsletter;
  onBack: () => void;
  onSaved: () => void;
}

export function NewsletterStudio({ newsletter, onBack, onSaved }: NewsletterStudioProps) {
  const [document, setDocument] = useState<NewsletterDocument>(() => 
    contenuToDocument(newsletter)
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'html'>('edit');
  const [hasChanges, setHasChanges] = useState(false);

  const updateNewsletter = useUpdateNewsletter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [document]);

  // Generate unique ID
  const generateId = useCallback(() => {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add new block
  const handleAddBlock = useCallback((type: string) => {
    const definition = blockDefs.find(d => d.type === type);
    if (!definition) return;

    const maxOrder = Math.max(...document.blocks.map(b => b.order), -1);
    
    const newBlock: NewsletterBlock = {
      id: generateId(),
      type: definition.type,
      content: { ...definition.defaultContent },
      style: { ...definition.defaultStyle },
      order: maxOrder + 1
    };

    setDocument(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));

    setSelectedBlockId(newBlock.id);
    toast.success(`Bloc "${definition.label}" ajouté`);
  }, [document.blocks, generateId]);

  // Update block content
  const handleUpdateBlock = useCallback((id: string, content: Record<string, string | number | boolean | undefined>) => {
    setDocument(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => 
        b.id === id ? { ...b, content } : b
      )
    }));
  }, []);

  // Update block style
  const handleUpdateBlockStyle = useCallback((id: string, style: Partial<BlockStyle>) => {
    setDocument(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => 
        b.id === id ? { ...b, style: { ...b.style, ...style } } : b
      )
    }));
  }, []);

  // Delete block
  const handleDeleteBlock = useCallback((id: string) => {
    setDocument(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== id)
    }));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
    toast.success('Bloc supprimé');
  }, [selectedBlockId]);

  // Duplicate block
  const handleDuplicateBlock = useCallback((id: string) => {
    const block = document.blocks.find(b => b.id === id);
    if (!block) return;

    const maxOrder = Math.max(...document.blocks.map(b => b.order), -1);

    const newBlock: NewsletterBlock = {
      ...block,
      id: generateId(),
      order: maxOrder + 1
    };

    setDocument(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));

    setSelectedBlockId(newBlock.id);
    toast.success('Bloc dupliqué');
  }, [document.blocks, generateId]);

  // Move block up/down
  const handleMoveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    const sortedBlocks = [...document.blocks].sort((a, b) => a.order - b.order);
    const index = sortedBlocks.findIndex(b => b.id === id);
    
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedBlocks.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = arrayMove(sortedBlocks, index, newIndex);
    
    const updatedBlocks = reordered.map((b, i) => ({ ...b, order: i }));
    
    setDocument(prev => ({
      ...prev,
      blocks: updatedBlocks
    }));
  }, [document.blocks]);

  // Update global styles
  const handleUpdateGlobalStyles = useCallback((styles: Partial<GlobalStyles>) => {
    setDocument(prev => ({
      ...prev,
      globalStyles: { ...prev.globalStyles, ...styles }
    }));
  }, []);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // If dragging from toolbar (new block)
    if (active.data.current?.type === 'new-block') {
      handleAddBlock(active.data.current.blockType);
      return;
    }

    // If reordering existing blocks
    if (active.id !== over.id) {
      const sortedBlocks = [...document.blocks].sort((a, b) => a.order - b.order);
      const oldIndex = sortedBlocks.findIndex(b => b.id === active.id);
      const newIndex = sortedBlocks.findIndex(b => b.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sortedBlocks, oldIndex, newIndex);
        const updatedBlocks = reordered.map((b, i) => ({ ...b, order: i }));
        
        setDocument(prev => ({
          ...prev,
          blocks: updatedBlocks
        }));
      }
    }
  };

  // Save document
  const handleSave = async () => {
    try {
      const contenu = documentToContenu(document);
      const html = exportToHtml(document);

      await updateNewsletter.mutateAsync({
        id: newsletter.id,
        contenu,
        html_court: html
      });

      setHasChanges(false);
      toast.success('Newsletter sauvegardée');
      onSaved();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Reset to original
  const handleReset = () => {
    setDocument(contenuToDocument(newsletter));
    setSelectedBlockId(null);
    setHasChanges(false);
    toast.info('Modifications annulées');
  };

  const selectedBlock = document.blocks.find(b => b.id === selectedBlockId) || null;
  const previewHtml = exportToHtml(document);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="font-semibold">
              Studio Newsletter #{newsletter.numero}
            </h1>
            <p className="text-xs text-muted-foreground">
              {newsletter.template === 'ansut_radar' ? 'ANSUT RADAR' : "INNOV'ACTU"} 
              {hasChanges && ' • Modifications non sauvegardées'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'edit' | 'preview' | 'html')}>
            <TabsList>
              <TabsTrigger value="edit">✏️ Édition</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-1" />
                Aperçu
              </TabsTrigger>
              <TabsTrigger value="html">
                <Code className="h-4 w-4 mr-1" />
                HTML
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <Undo2 className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          )}
          
          <Button onClick={handleSave} disabled={updateNewsletter.isPending}>
            {updateNewsletter.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'edit' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Left: Block Toolbar */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full border-r bg-background">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-sm">🧱 Blocs</h2>
                  <p className="text-xs text-muted-foreground">Glissez ou cliquez</p>
                </div>
                <BlockToolbar onAddBlock={handleAddBlock} />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Center: Canvas */}
            <ResizablePanel defaultSize={55}>
              <CanvasArea
                blocks={document.blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onUpdateBlock={handleUpdateBlock}
                onUpdateBlockStyle={handleUpdateBlockStyle}
                onDeleteBlock={handleDeleteBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onMoveBlock={handleMoveBlock}
                globalStyles={document.globalStyles}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right: Properties */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <div className="h-full border-l bg-background">
                <PropertiesPanel
                  selectedBlock={selectedBlock}
                  onUpdateStyle={(style) => selectedBlockId && handleUpdateBlockStyle(selectedBlockId, style)}
                  globalStyles={document.globalStyles}
                  onUpdateGlobalStyles={handleUpdateGlobalStyles}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          <DragOverlay>
            {activeId ? (
              <div className="p-4 bg-primary text-primary-foreground rounded-lg shadow-xl opacity-90">
                Déplacement...
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : viewMode === 'preview' ? (
        <div className="flex-1 overflow-y-auto p-8 bg-muted/30">
          <div 
            className="mx-auto shadow-xl rounded-lg overflow-hidden"
            style={{ maxWidth: document.globalStyles.maxWidth }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-full">
            <code>{previewHtml}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
