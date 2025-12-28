import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Bot, User, Loader2, Signal, Brain, Users, FileText, Database, RefreshCw, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useActualites } from '@/hooks/useActualites';
import { useDossiers } from '@/hooks/useDossiers';
import { MessageContent } from '@/components/assistant/MessageContent';
import { ContextSelector } from '@/components/assistant/ContextSelector';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PromptCategory {
  category: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  prompts: string[];
}

const promptCategories: PromptCategory[] = [
  {
    category: 'Service Universel',
    icon: Signal,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20',
    prompts: [
      'Résume les dernières actualités SUT',
      'Quels sont les projets de connectivité rurale en cours ?',
      'Analyse les tendances de couverture réseau',
    ]
  },
  {
    category: 'Intelligence Artificielle',
    icon: Brain,
    colorClass: 'text-orange-500',
    bgClass: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20',
    prompts: [
      'Génère une note de synthèse sur l\'IA en Afrique',
      'Quelles régulations IA sont en discussion ?',
      'Quels pays africains avancent sur l\'IA ?',
    ]
  },
  {
    category: 'Acteurs clés',
    icon: Users,
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20',
    prompts: [
      'Quels acteurs clés surveiller cette semaine ?',
      'Y a-t-il des nominations récentes dans le secteur ?',
      'Résume l\'activité des opérateurs télécoms',
    ]
  },
  {
    category: 'Synthèses & Notes',
    icon: FileText,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20',
    prompts: [
      'Génère un briefing DG pour aujourd\'hui',
      'Prépare une note pour le Conseil sur le SUT',
      'Résume les 5 signaux faibles de la semaine',
    ]
  }
];

// Quick inline suggestions for empty state
const inlineSuggestions = [
  { text: 'Actualités SUT', prompt: 'Résume les dernières actualités SUT' },
  { text: 'Briefing DG', prompt: 'Génère un briefing DG pour aujourd\'hui' },
  { text: 'Acteurs à surveiller', prompt: 'Quels acteurs clés surveiller cette semaine ?' },
  { text: 'Note IA', prompt: 'Génère une note de synthèse sur l\'IA en Afrique' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-ia`;

async function streamChat({
  messages,
  context,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  context: string;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, context }),
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
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          // Incomplete JSON, put it back
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Final flush
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
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant IA ANSUT RADAR. J\'ai accès aux actualités récentes et dossiers stratégiques pour contextualiser mes réponses. Comment puis-je vous aider ?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch context data
  const { data: actualites, isLoading: loadingActualites } = useActualites({ maxAgeHours: 72 });
  const { data: dossiers, isLoading: loadingDossiers } = useDossiers();
  
  // Available items for selection
  const availableActualites = useMemo(() => actualites?.slice(0, 10) || [], [actualites]);
  const availableDossiers = useMemo(() => dossiers?.filter(d => d.statut === 'publie').slice(0, 10) || [], [dossiers]);

  // Selection state - default to first 5 actualites and first 3 dossiers
  const [selectedActualites, setSelectedActualites] = useState<Set<string>>(new Set());
  const [selectedDossiers, setSelectedDossiers] = useState<Set<string>>(new Set());
  
  // Initialize selections when data loads
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

  // Selection handlers
  const handleToggleActualite = useCallback((id: string) => {
    setSelectedActualites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleDossier = useCallback((id: string) => {
    setSelectedDossiers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

  // Build context string for the AI based on selection
  const context = useMemo(() => {
    const now = new Date().toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    let contextStr = `=== CONTEXTE ACTUALISÉ (${now}) ===\n\n`;
    
    const selectedActus = availableActualites.filter(a => selectedActualites.has(a.id));
    if (selectedActus.length > 0) {
      contextStr += "📰 ACTUALITÉS SÉLECTIONNÉES (utilise le format [[ACTU:id|titre]] pour citer) :\n";
      selectedActus.forEach(a => {
        const date = a.date_publication 
          ? new Date(a.date_publication).toLocaleDateString('fr-FR') 
          : '';
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
    totalAvailable: availableActualites.length + availableDossiers.length,
    isLoading: loadingActualites || loadingDossiers
  }), [selectedActualites.size, selectedDossiers.size, availableActualites.length, availableDossiers.length, loadingActualites, loadingDossiers]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > messages.length) {
          // Update existing assistant message
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        // Create new assistant message
        return [...prev.slice(0, -1), userMessage, { role: 'assistant', content: assistantContent }];
      });
    };

    await streamChat({
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      context,
      onDelta: updateAssistant,
      onDone: () => setIsLoading(false),
      onError: (error) => {
        toast.error(error);
        setIsLoading(false);
        // Remove the incomplete assistant message if any
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

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const isEmptyConversation = messages.length === 1 && messages[0].role === 'assistant';

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-8rem)] flex gap-4 animate-fade-in">
        <Card className="flex-1 glass flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Assistant IA
              </CardTitle>
              
              {/* Context Indicator with Selector */}
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
                    <span className="text-xs">
                      {contextStats.actualites} actualités • {contextStats.dossiers} dossiers
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
                      Sélectionnez les actualités et dossiers que l'assistant utilisera pour contextualiser ses réponses.
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
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              <div className="space-y-4 pb-4">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
                      }`}>
                        {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <div className={`max-w-[80%] p-3 rounded-lg whitespace-pre-wrap ${
                        msg.role === 'assistant' ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <MessageContent content={msg.content} />
                        ) : (
                          msg.content
                        )}
                        {isLoading && i === messages.length - 1 && msg.role === 'assistant' && (
                          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                        )}
                      </div>
                    </div>
                    
                    {/* Inline suggestions after welcome message */}
                    {isEmptyConversation && i === 0 && msg.role === 'assistant' && (
                      <div className="mt-4 ml-11 grid grid-cols-2 gap-2 max-w-md">
                        {inlineSuggestions.map((suggestion, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="justify-start text-xs h-auto py-2.5 px-3 border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
                            onClick={() => handleSuggestionClick(suggestion.prompt)}
                            disabled={isLoading}
                          >
                            {suggestion.text}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Mobile suggestions (visible only on mobile) */}
            <div className="flex gap-2 overflow-x-auto py-2 lg:hidden">
              {inlineSuggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs h-8 px-3 border-dashed"
                  onClick={() => handleSuggestionClick(suggestion.prompt)}
                  disabled={isLoading}
                >
                  {suggestion.text}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-2 mt-2 pt-4 border-t border-border">
              <Input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Posez votre question..." 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Sidebar with categorized prompts */}
        <Card className="w-80 glass hidden lg:flex lg:flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Suggestions par thème</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-4">
                {promptCategories.map((cat, catIdx) => {
                  const IconComponent = cat.icon;
                  return (
                    <div key={catIdx} className="space-y-2">
                      <div className={`flex items-center gap-2 text-xs font-medium ${cat.colorClass}`}>
                        <IconComponent className="h-3.5 w-3.5" />
                        {cat.category}
                      </div>
                      <div className="space-y-1.5">
                        {cat.prompts.map((prompt, promptIdx) => (
                          <Button
                            key={promptIdx}
                            variant="outline"
                            size="sm"
                            className={`w-full justify-start text-xs h-auto py-2 px-3 whitespace-normal text-left border ${cat.bgClass} transition-colors`}
                            onClick={() => handleQuickPrompt(prompt)}
                            disabled={isLoading}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
