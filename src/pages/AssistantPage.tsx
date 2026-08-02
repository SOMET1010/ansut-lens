import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Bot, Loader2, RefreshCw, Settings2, History, Sparkles, AlertTriangle, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader, SectionRepliable } from '@/components/common';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useActualites } from '@/hooks/useActualites';
import { useDossiers } from '@/hooks/useDossiers';
import { useConversationsIA, type ConversationMessage, type Conversation } from '@/hooks/useConversationsIA';
import { ContextSelector } from '@/components/assistant/ContextSelector';
import { ConversationHistory } from '@/components/assistant/ConversationHistory';
import { ChatMessage } from '@/components/assistant/ChatMessage';
import { ModeSelector, type AssistantMode } from '@/components/assistant/ModeSelector';
import { DocumentWorkspace, detectDocument, type GeneratedDocument } from '@/components/assistant/DocumentWorkspace';
import { FrameworkPanel } from '@/components/assistant/FrameworkPanel';
import { WelcomeScreen } from '@/components/assistant/WelcomeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { GripVertical } from 'lucide-react';

const WELCOME_MESSAGE: ConversationMessage = {
  role: 'assistant',
  content: '__WELCOME__',
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-ia`;

export type InvalidCitation = {
  type: 'ACTU' | 'DOSSIER';
  id: string;
  title?: string;
  expected_source_url?: string | null;
  suggested_title?: string;
  suggested_id?: string;
};

export type CitationWarning = {
  message: string;
  invalid_citations: InvalidCitation[];
};

async function streamChat({
  messages,
  context,
  mode,
  onDelta,
  onDone,
  onError,
  onCitationWarning,
}: {
  messages: ConversationMessage[];
  context: string;
  mode: AssistantMode;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onCitationWarning: (warning: CitationWarning) => void;
}) {
  try {
    // Get user session token for authenticated request
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, context, mode }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        onError(errorData.error || 'Limite de requêtes atteinte. Réessayez dans quelques instants.');
        return;
      }
      if (resp.status === 402) {
        onError(errorData.error || 'Crédits épuisés. Veuillez recharger votre compte.');
        return;
      }
      onError(errorData.error || 'Erreur lors de la communication avec l\'IA');
      return;
    }

    if (!resp.body) {
      onError('Pas de réponse du serveur');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed?.type === 'citation_validation') {
            onCitationWarning({
              message: parsed.message ?? 'Citations invalides détectées.',
              invalid_citations: Array.isArray(parsed.invalid_citations) ? parsed.invalid_citations : [],
            });
            continue;
          }
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed?.type === 'citation_validation') {
            onCitationWarning({
              message: parsed.message ?? 'Citations invalides détectées.',
              invalid_citations: Array.isArray(parsed.invalid_citations) ? parsed.invalid_citations : [],
            });
            continue;
          }
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    console.error('Stream error:', error);
    onError('Erreur de connexion au service IA');
  }
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AssistantMode>('redaction');
  const [messages, setMessages] = useState<ConversationMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [citationWarning, setCitationWarning] = useState<CitationWarning | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Per-user resizable widths (workspace right panel + history sheet)
  const userKey = user?.id ?? 'anon';
  const workspaceResize = useResizableWidth({
    key: `assistant:workspace-width:${userKey}`,
    defaultWidth: 360,
    min: 280,
    max: 720,
    side: 'left',
  });
  const historyResize = useResizableWidth({
    key: `assistant:history-width:${userKey}`,
    defaultWidth: 320,
    min: 260,
    max: 560,
    side: 'right',
  });

  const { 
    conversations, 
    isLoading: loadingConversations, 
    createConversation, 
    updateConversation, 
    deleteConversation 
  } = useConversationsIA();

  // Fetch context data
  const { data: actualites, isLoading: loadingActualites } = useActualites({ maxAgeHours: 72 });
  const { data: dossiers, isLoading: loadingDossiers } = useDossiers();
  
  const availableActualites = useMemo(() => actualites?.slice(0, 10) || [], [actualites]);
  const availableDossiers = useMemo(() => dossiers?.filter(d => d.statut === 'publie').slice(0, 10) || [], [dossiers]);

  const [selectedActualites, setSelectedActualites] = useState<Set<string>>(new Set());
  const [selectedDossiers, setSelectedDossiers] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (availableActualites.length > 0 && selectedActualites.size === 0) {
      setSelectedActualites(new Set(availableActualites.slice(0, 5).map(a => a.id)));
    }
  }, [availableActualites]);
  
  useEffect(() => {
    if (availableDossiers.length > 0 && selectedDossiers.size === 0) {
      setSelectedDossiers(new Set(availableDossiers.slice(0, 3).map(d => d.id)));
    }
  }, [availableDossiers]);

  const handleToggleActualite = useCallback((id: string) => {
    setSelectedActualites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleDossier = useCallback((id: string) => {
    setSelectedDossiers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllActualites = useCallback(() => {
    if (selectedActualites.size === availableActualites.length) {
      setSelectedActualites(new Set());
    } else {
      setSelectedActualites(new Set(availableActualites.map(a => a.id)));
    }
  }, [availableActualites, selectedActualites.size]);

  const handleSelectAllDossiers = useCallback(() => {
    if (selectedDossiers.size === availableDossiers.length) {
      setSelectedDossiers(new Set());
    } else {
      setSelectedDossiers(new Set(availableDossiers.map(d => d.id)));
    }
  }, [availableDossiers, selectedDossiers.size]);

  const handleClearAll = useCallback(() => {
    setSelectedActualites(new Set());
    setSelectedDossiers(new Set());
  }, []);

  const context = useMemo(() => {
    const now = new Date().toLocaleDateString('fr-FR', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    let contextStr = `=== CONTEXTE ACTUALISÉ (${now}) ===\n\n`;
    
    const selectedActus = availableActualites.filter(a => selectedActualites.has(a.id));
    if (selectedActus.length > 0) {
      contextStr += "📰 ACTUALITÉS SÉLECTIONNÉES (utilise le format [[ACTU:id|titre]] pour citer) :\n";
      selectedActus.forEach(a => {
        const date = a.date_publication ? new Date(a.date_publication).toLocaleDateString('fr-FR') : '';
        const importance = a.importance ? `[Importance: ${a.importance}/100]` : '';
        contextStr += `- ID: ${a.id} | Titre: "${a.titre}" ${importance}\n  Résumé: ${a.resume || 'Non disponible'}\n  Source: ${a.source_nom || 'Inconnue'} (${date})\n\n`;
      });
    }
    
    const selectedDoss = availableDossiers.filter(d => selectedDossiers.has(d.id));
    if (selectedDoss.length > 0) {
      contextStr += "📋 DOSSIERS SÉLECTIONNÉS (utilise le format [[DOSSIER:id|titre]] pour citer) :\n";
      selectedDoss.forEach(d => {
        contextStr += `- ID: ${d.id} | Titre: "${d.titre}" [${d.categorie}]\n  Résumé: ${d.resume || 'Non disponible'}\n\n`;
      });
    }
    
    return contextStr;
  }, [availableActualites, availableDossiers, selectedActualites, selectedDossiers]);

  const contextStats = useMemo(() => ({
    actualites: selectedActualites.size,
    dossiers: selectedDossiers.size,
    isLoading: loadingActualites || loadingDossiers
  }), [selectedActualites.size, selectedDossiers.size, loadingActualites, loadingDossiers]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Detect document in last assistant message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && mode === 'redaction' && !isLoading) {
      const doc = detectDocument(lastMessage.content);
      if (doc) {
        setGeneratedDocument(doc);
      }
    }
  }, [messages, mode, isLoading]);

  // Save conversation after each message exchange
  const saveConversation = useCallback(async (newMessages: ConversationMessage[]) => {
    if (!user) return;
    
    const messagesToSave = newMessages.filter(m => m !== WELCOME_MESSAGE && m.content !== WELCOME_MESSAGE.content);
    if (messagesToSave.length === 0) return;

    if (currentConversationId) {
      updateConversation.mutate({ id: currentConversationId, messages: messagesToSave });
    } else {
      const result = await createConversation.mutateAsync(messagesToSave);
      setCurrentConversationId(result.id);
    }
  }, [user, currentConversationId, createConversation, updateConversation]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ConversationMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setGeneratedDocument(null); // Clear previous document
    setCitationWarning(null);

    let assistantContent = '';

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > messages.length) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev.slice(0, -1), userMessage, { role: 'assistant', content: assistantContent }];
      });
      
      // Detect document while streaming in redaction mode
      if (mode === 'redaction') {
        const doc = detectDocument(assistantContent);
        if (doc) {
          setGeneratedDocument(doc);
        }
      }
    };

    await streamChat({
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      context,
      mode,
      onDelta: updateAssistant,
      onCitationWarning: (w) => {
        setCitationWarning(w);
        if (w.invalid_citations.length) {
          toast.warning(`${w.invalid_citations.length} citation(s) invalide(s) détectée(s)`);
        }
      },
      onDone: () => {
        setIsLoading(false);
        const finalMessages = [...newMessages, { role: 'assistant' as const, content: assistantContent }];
        saveConversation(finalMessages);
      },
      onError: (error) => {
        toast.error(error);
        setIsLoading(false);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.content === '') {
            return prev.slice(0, -1);
          }
          return prev;
        });
      },
    });
  };

  const handleNewConversation = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setCurrentConversationId(null);
    setHistoryOpen(false);
    setGeneratedDocument(null);
  }, []);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setMessages([WELCOME_MESSAGE, ...conv.messages]);
    setCurrentConversationId(conv.id);
    setHistoryOpen(false);
    setGeneratedDocument(null);
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    deleteConversation.mutate(id);
    if (currentConversationId === id) {
      handleNewConversation();
    }
  }, [deleteConversation, currentConversationId, handleNewConversation]);

  const handleSuggestionClick = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Hide welcome placeholder when there are real messages
  const realMessages = messages.filter(m => m.content !== '__WELCOME__');
  const showWelcome = realMessages.length === 0;

  return (
    <TooltipProvider>
      <PageContainer>
      <div className="w-full h-[calc(100vh-6rem)] flex gap-4 animate-fade-in">

        {/* MAIN CHAT ZONE — flexible width */}
        <div className="flex-1 min-w-0 flex flex-col bg-card rounded-2xl border shadow-sm overflow-hidden">
          <PageHeader
            titre="Assistant"
            description="Posez une question sur la veille, ou demandez la rédaction d'une note appuyée sur les sources collectées."
            icon={Sparkles}
          />

          {/* Header with Mode Selector */}
          <div className="px-4 lg:px-6 py-3 border-b bg-muted/30 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              {/* History Button (always visible) */}
              <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 min-h-11 sm:min-h-9" title="Historique des conversations" aria-label="Afficher l'historique">
                    <History className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="p-0 max-w-none"
                  style={{ width: historyResize.width }}
                >
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2 justify-between">
                      <span className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Historique
                      </span>
                      <button
                        onClick={historyResize.reset}
                        className="text-[10px] font-normal text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                        title="Réinitialiser la largeur"
                      >
                        Réinitialiser
                      </button>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="h-[calc(100vh-5rem)]">
                    <ConversationHistory
                      conversations={conversations}
                      isLoading={loadingConversations}
                      currentConversationId={currentConversationId}
                      onSelectConversation={handleSelectConversation}
                      onNewConversation={handleNewConversation}
                      onDeleteConversation={handleDeleteConversation}
                    />
                  </div>
                  {/* Resize handle on the right edge */}
                  <div
                    onPointerDown={historyResize.onPointerDown}
                    onDoubleClick={historyResize.reset}
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group hover:bg-primary/20 transition-colors"
                    title="Glisser pour redimensionner • Double-clic pour réinitialiser"
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 h-10 w-3 rounded border bg-background shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 bg-[hsl(var(--signal-positive))] rounded-full animate-pulse" />
                  En ligne • {contextStats.actualites + contextStats.dossiers} sources
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ModeSelector mode={mode} onModeChange={setMode} />
              
              {/* Context Indicator */}
              <Popover>
                <PopoverTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {contextStats.isLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Settings2 className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span className="text-xs hidden sm:inline">
                      {contextStats.actualites} actu • {contextStats.dossiers} dossiers
                    </span>
                  </Badge>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-80">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Configurer le contexte</h4>
                      <Badge variant="secondary" className="text-xs">
                        {contextStats.actualites + contextStats.dossiers} sélectionnés
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez les actualités et dossiers que l'assistant utilisera.
                    </p>
                    <ContextSelector
                      actualites={availableActualites}
                      dossiers={availableDossiers}
                      selectedActualites={selectedActualites}
                      selectedDossiers={selectedDossiers}
                      onToggleActualite={handleToggleActualite}
                      onToggleDossier={handleToggleDossier}
                      onSelectAllActualites={handleSelectAllActualites}
                      onSelectAllDossiers={handleSelectAllDossiers}
                      onClearAll={handleClearAll}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {citationWarning && citationWarning.invalid_citations.length > 0 && (
            <div className="mx-4 lg:mx-6 mt-3 rounded-lg border border-[hsl(var(--signal-warning))]/40 bg-[hsl(var(--signal-warning))]/10">
              <div className="flex items-start gap-2 px-3 py-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--signal-warning))]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    {citationWarning.invalid_citations.length} citation(s) invalide(s)
                  </p>
                  <p className="text-[11px] text-muted-foreground">{citationWarning.message}</p>
                  <ul className="mt-2 space-y-1">
                    {citationWarning.invalid_citations.map((c, i) => (
                      <li key={i} className="text-[11px] flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="h-4 px-1 text-[10px] font-mono">{c.type}</Badge>
                        <code className="text-[10px] bg-muted/50 px-1 rounded font-mono truncate max-w-[180px]" title={c.id}>{c.id}</code>
                        {c.title && <span className="text-muted-foreground truncate max-w-[200px]" title={c.title}>« {c.title} »</span>}
                        {c.suggested_title && (
                          <span className="text-[10px] text-muted-foreground">→ suggéré : <span className="font-medium text-foreground">{c.suggested_title}</span></span>
                        )}
                        {c.expected_source_url ? (
                          <a href={c.expected_source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline text-[10px]">
                            source <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] italic text-muted-foreground">(aucune source connue)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 min-h-11 sm:min-h-9" onClick={() => setCitationWarning(null)} aria-label="Fermer l'avertissement">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 lg:p-6" ref={scrollRef}>
            {showWelcome ? (
              <WelcomeScreen
                mode={mode}
                onPromptClick={(p) => { setInput(p); }}
                contextStats={{ actualites: contextStats.actualites, dossiers: contextStats.dossiers }}
              />
            ) : (
              <div className="space-y-2 max-w-4xl mx-auto">
                {realMessages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={isLoading && i === realMessages.length - 1 && msg.role === 'assistant'}
                  />
                ))}
                {isLoading && realMessages[realMessages.length - 1]?.role === 'user' && (
                  <div className="flex gap-4 mb-6">
                    <div className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="bg-card border rounded-2xl rounded-tl-none p-5">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          {/* Input Area */}
          <div className="p-4 border-t bg-background">
            <div className="relative">
              <Textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question ou demandez une rédaction..."
                className="min-h-[60px] pr-24 resize-none bg-muted/50 border-border"
                disabled={isLoading}
              />
              {/*
                Le bouton de piece jointe etait affiche en permanence, desactive,
                avec la mention « bientot ». Un controle inerte occupe l'attention
                sans rien permettre : il est retire jusqu'a ce que la fonction
                existe reellement.
              */}
              <div className="absolute right-2 bottom-2 flex gap-1">
                <Button 
                  size="icon" 
                  className="h-8 w-8 min-h-11 sm:min-h-9"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  aria-label={isLoading ? 'Envoi en cours' : 'Envoyer le message'}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              L'IA peut faire des erreurs. Vérifiez toujours les sources citées.
            </p>
          </div>
        </div>
        
        {/* Resize handle between chat and workspace (xl+ only) */}
        <div
          onPointerDown={workspaceResize.onPointerDown}
          onDoubleClick={workspaceResize.reset}
          className="hidden xl:flex shrink-0 w-1.5 cursor-col-resize group items-center justify-center hover:bg-primary/20 transition-colors rounded-full"
          title="Glisser pour redimensionner • Double-clic pour réinitialiser"
        >
          <div className="h-12 w-3 rounded border bg-background shadow-sm flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        {/* RIGHT COLUMN — Workspace + Framework Panel (xl+ only) */}
        <div className="xl:hidden">
          <SectionRepliable titre="Espace de travail" toujoursOuvertDes="xl">
            <div className="flex flex-col gap-4">
              <div className="min-h-[300px]">
                <DocumentWorkspace
                  document={generatedDocument}
                  isGenerating={isLoading && mode === 'redaction'}
                  onClose={() => setGeneratedDocument(null)}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
              <div className="h-[300px] shrink-0">
                <FrameworkPanel
                  query={[...realMessages].reverse().find(m => m.role === 'user')?.content ?? ''}
                  response={[...realMessages].reverse().find(m => m.role === 'assistant')?.content ?? ''}
                  contextActuIds={Array.from(selectedActualites)}
                  contextDossierIds={Array.from(selectedDossiers)}
                  contextActuTitles={Object.fromEntries(availableActualites.map(a => [a.id, a.titre]))}
                  contextDossierTitles={Object.fromEntries(availableDossiers.map(d => [d.id, d.titre]))}
                />
              </div>
            </div>
          </SectionRepliable>
        </div>
        <div className="hidden xl:flex xl:flex-col gap-4 shrink-0" style={{ width: workspaceResize.width }}>
          <div className="flex-1 min-h-0">
            <DocumentWorkspace
              document={generatedDocument}
              isGenerating={isLoading && mode === 'redaction'}
              onClose={() => setGeneratedDocument(null)}
              onSuggestionClick={handleSuggestionClick}
            />
          </div>
          <div className="h-[300px] shrink-0">
            <FrameworkPanel
              query={[...realMessages].reverse().find(m => m.role === 'user')?.content ?? ''}
              response={[...realMessages].reverse().find(m => m.role === 'assistant')?.content ?? ''}
              contextActuIds={Array.from(selectedActualites)}
              contextDossierIds={Array.from(selectedDossiers)}
              contextActuTitles={Object.fromEntries(availableActualites.map(a => [a.id, a.titre]))}
              contextDossierTitles={Object.fromEntries(availableDossiers.map(d => [d.id, d.titre]))}
            />
          </div>
        </div>
      </div>
      </PageContainer>
    </TooltipProvider>
  );
}
