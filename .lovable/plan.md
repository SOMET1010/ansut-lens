
# Transformation de l'Assistant en Cockpit IA SUTA

## Analyse de l'existant

L'assistant actuel dispose deja de fonctionnalites avancees :
- Streaming de reponses via edge function
- Historique des conversations (stockage en base)
- Selection du contexte (actualites et dossiers)
- Citations de sources avec liens cliquables via MessageContent.tsx

Cependant, l'interface reste un simple chatbot classique. La transformation proposee ajoute :
1. Un layout Chat + Workspace en deux colonnes
2. Des modes specialises (Recherche, Redaction, Analyse)
3. Un panneau document editable en temps reel
4. Une meilleure mise en valeur des sources

---

## Architecture de la nouvelle interface

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  🤖 Assistant SUTA - Smart Utility for Telecom Analysis                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  COLONNE GAUCHE (60%)                         │  COLONNE DROITE (40%)                       │
│  ┌──────────────────────────────────────────┐ │  ┌───────────────────────────────────────┐  │
│  │ Header: SUTA • En ligne                  │ │  │ Header: Note_Synthese.docx            │  │
│  │ [Recherche] [Redaction] [Analyse]        │ │  │ [Copier] [Regenerer] [Fermer]         │  │
│  ├──────────────────────────────────────────┤ │  ├───────────────────────────────────────┤  │
│  │                                          │ │  │                                       │  │
│  │  VOUS: Prepare une note sur Orange SAT   │ │  │  NOTE A L'ATTENTION DE M. LE MINISTRE │  │
│  │                                          │ │  │                                       │  │
│  │  🤖: J'ai analyse 4 articles...          │ │  │  OBJET: Lancement Orange SAT          │  │
│  │      Points cles:                        │ │  │                                       │  │
│  │      1. Partenariat Eutelsat             │ │  │  I. CONTEXTE                          │  │
│  │      2. Zones rurales ciblees            │ │  │  Dans le cadre de l'acceleration...   │  │
│  │                                          │ │  │                                       │  │
│  │      Sources analysees:                  │ │  │  II. ANALYSE STRATEGIQUE              │  │
│  │      [Ecofin] [Fraternite] [Abidjan.net] │ │  │  Cette initiative presente...         │  │
│  │                                          │ │  │                                       │  │
│  ├──────────────────────────────────────────┤ │  ├───────────────────────────────────────┤  │
│  │ [📎] Posez votre question...      [Send] │ │  │ [Enregistrer brouillon] [Export PDF]  │  │
│  │ L'IA peut faire des erreurs.             │ │  │                                       │  │
│  └──────────────────────────────────────────┘ │  └───────────────────────────────────────┘  │
│                                               │                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers a modifier/creer

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/pages/AssistantPage.tsx` | Remplacer | Nouveau layout "Cockpit IA" en 2 colonnes |
| `src/components/assistant/ChatMessage.tsx` | Creer | Message avec sources cliquables et pieces jointes |
| `src/components/assistant/ModeSelector.tsx` | Creer | Selecteur de mode (Recherche/Redaction/Analyse) |
| `src/components/assistant/DocumentWorkspace.tsx` | Creer | Panneau document editable avec actions |
| `src/components/assistant/SourceBadges.tsx` | Creer | Affichage des sources citees dans les reponses |
| `supabase/functions/assistant-ia/index.ts` | Modifier | Ajouter le mode comme parametre pour adapter le comportement |
| `src/components/assistant/index.ts` | Modifier | Exporter les nouveaux composants |

---

## Details d'implementation

### 1. Modes de l'assistant

Trois modes specialises qui modifient le comportement de l'IA :

```typescript
type AssistantMode = 'recherche' | 'redaction' | 'analyse';

const modeConfigs = {
  recherche: {
    label: 'Recherche',
    icon: Search,
    description: 'Trouver des informations dans la base documentaire',
    systemPromptAddition: 'Tu es en mode RECHERCHE. Reponds de facon synthetique avec des listes a puces. Cite systematiquement tes sources.'
  },
  redaction: {
    label: 'Redaction',
    icon: FileText,
    description: 'Rediger des notes, briefings et rapports',
    systemPromptAddition: 'Tu es en mode REDACTION. Genere des documents structures avec titres, sous-titres et paragraphes. Utilise un ton formel et professionnel adapte a la Direction Generale.'
  },
  analyse: {
    label: 'Analyse',
    icon: BarChart3,
    description: 'Analyser des tendances et donnees',
    systemPromptAddition: 'Tu es en mode ANALYSE. Fournis des analyses chiffrees, des tableaux comparatifs et des graphiques textuels. Identifie les tendances et signaux faibles.'
  }
};
```

### 2. Composant ChatMessage ameliore

Message avec detection et affichage des sources :

```tsx
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[]; // Sources extraites de la reponse
  generatedDocument?: {
    title: string;
    content: string;
    type: 'note' | 'briefing' | 'rapport';
  };
}

// Detection des sources dans le contenu
function extractSources(content: string): string[] {
  const sourceMatches = content.match(/\[\[ACTU:[^|]+\|([^\]]+)\]\]/g) || [];
  return sourceMatches.map(m => m.replace(/\[\[ACTU:[^|]+\|([^\]]+)\]\]/, '$1'));
}

// Affichage
<div className={cn(
  "flex gap-4 mb-6",
  role === 'user' ? "flex-row-reverse" : ""
)}>
  <Avatar className={cn(
    "h-10 w-10",
    role === 'assistant' 
      ? "bg-gradient-to-br from-primary to-primary/70" 
      : "bg-secondary"
  )}>
    {role === 'assistant' ? <Bot /> : <span>VOUS</span>}
  </Avatar>
  
  <div className={cn(
    "max-w-[80%] rounded-2xl p-5 shadow-sm border",
    role === 'assistant' 
      ? "bg-card rounded-tl-none" 
      : "bg-primary/10 rounded-tr-none"
  )}>
    <MessageContent content={content} />
    
    {/* Sources Block */}
    {sources && sources.length > 0 && (
      <div className="mt-4 pt-3 border-t border-dashed border-border">
        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
          Sources analysees :
        </p>
        <div className="flex flex-wrap gap-2">
          {sources.map(src => (
            <Badge variant="outline" className="text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1" />
              {src}
            </Badge>
          ))}
        </div>
      </div>
    )}
  </div>
</div>
```

### 3. DocumentWorkspace (Panneau droit)

Affiche le document genere en mode Redaction :

```tsx
interface DocumentWorkspaceProps {
  document: GeneratedDocument | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  onCopy: () => void;
  onExportPDF: () => void;
  onSaveDraft: () => void;
  onClose: () => void;
}

// Etat par defaut (suggestions)
{!document && !isGenerating && (
  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
      <FileText className="h-8 w-8 text-primary" />
    </div>
    <h3 className="font-bold text-foreground mb-2">Espace de travail</h3>
    <p className="text-sm text-muted-foreground mb-6">
      Demandez a l'assistant de rediger un document. Il apparaitra ici.
    </p>
    <div className="space-y-2 w-full max-w-xs">
      <Button variant="outline" size="sm" className="w-full justify-start">
        <ChevronRight className="h-4 w-4 mr-2" />
        Redige une note de synthese sur...
      </Button>
      <Button variant="outline" size="sm" className="w-full justify-start">
        <ChevronRight className="h-4 w-4 mr-2" />
        Prepare un briefing DG sur...
      </Button>
    </div>
  </div>
)}

// Document genere
{document && (
  <>
    {/* Header */}
    <div className="px-5 py-4 border-b bg-primary/5 flex justify-between items-center">
      <div className="flex items-center gap-2 text-primary">
        <FileText className="h-4 w-4" />
        <span className="font-bold text-sm">{document.title}</span>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onCopy}><Copy /></Button>
        <Button variant="ghost" size="icon" onClick={onRegenerate}><RefreshCw /></Button>
        <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
      </div>
    </div>
    
    {/* Content - Editable */}
    <ScrollArea className="flex-1">
      <div className="p-8 font-serif text-sm leading-7 prose prose-sm">
        <ReactMarkdown>{document.content}</ReactMarkdown>
      </div>
    </ScrollArea>
    
    {/* Footer Actions */}
    <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
      <Button variant="outline" size="sm" onClick={onSaveDraft}>
        Enregistrer brouillon
      </Button>
      <Button size="sm" onClick={onExportPDF}>
        <Download className="h-4 w-4 mr-2" /> Exporter PDF
      </Button>
    </div>
  </>
)}
```

### 4. Detection automatique de document

Quand l'IA genere un document structure, on le detecte pour l'afficher dans le workspace :

```typescript
function detectDocument(content: string): GeneratedDocument | null {
  // Patterns pour detecter une note formelle
  const notePatterns = [
    /NOTE\s+(?:A|À)\s+L['']ATTENTION/i,
    /OBJET\s*:/i,
    /I\.\s+CONTEXTE/i,
    /BRIEFING/i,
    /RAPPORT/i
  ];
  
  const hasDocumentStructure = notePatterns.some(p => p.test(content));
  
  if (hasDocumentStructure) {
    // Extraire le titre
    const objetMatch = content.match(/OBJET\s*:\s*(.+?)[\n\r]/i);
    const title = objetMatch 
      ? `Note_${objetMatch[1].slice(0, 30).replace(/\s+/g, '_')}.docx`
      : 'Document_genere.docx';
    
    return {
      title,
      content,
      type: 'note'
    };
  }
  
  return null;
}
```

### 5. Modification de l'edge function

Ajouter le mode comme parametre :

```typescript
// supabase/functions/assistant-ia/index.ts
const { messages, context, mode } = await req.json();

const modePrompts = {
  recherche: '\n\nMODE RECHERCHE: Reponds de facon synthetique avec des listes. Cite tes sources.',
  redaction: '\n\nMODE REDACTION: Genere des documents structures et professionnels.',
  analyse: '\n\nMODE ANALYSE: Fournis des analyses chiffrees et identifie les tendances.'
};

let contextualPrompt = SYSTEM_PROMPT;
if (mode && modePrompts[mode]) {
  contextualPrompt += modePrompts[mode];
}
if (context) {
  contextualPrompt += `\n\n${context}`;
}
```

---

## Structure finale de AssistantPage.tsx

```tsx
export default function AssistantPage() {
  const [mode, setMode] = useState<AssistantMode>('redaction');
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // ... hooks existants (conversations, actualites, dossiers)
  
  // Detection de document apres chaque reponse
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && mode === 'redaction') {
      const doc = detectDocument(lastMessage.content);
      if (doc) setGeneratedDocument(doc);
    }
  }, [messages, mode]);
  
  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6 p-6">
      
      {/* COLONNE GAUCHE : Chat (60%) */}
      <div className="flex-1 flex flex-col bg-card rounded-2xl border shadow-sm overflow-hidden">
        
        {/* Header avec selecteur de mode */}
        <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Assistant SUTA</h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                En ligne • Acces Base Documentaire
              </div>
            </div>
          </div>
          
          <ModeSelector mode={mode} onModeChange={setMode} />
        </div>
        
        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          {messages.map((msg, i) => (
            <ChatMessage 
              key={i} 
              {...msg} 
              sources={msg.role === 'assistant' ? extractSources(msg.content) : undefined}
            />
          ))}
        </ScrollArea>
        
        {/* Input */}
        <div className="p-4 border-t">
          <Textarea 
            placeholder="Posez votre question ou demandez une redaction..."
            className="min-h-[60px]"
          />
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            L'IA peut faire des erreurs. Verifiez toujours les sources citees.
          </p>
        </div>
      </div>
      
      {/* COLONNE DROITE : Workspace (40%) */}
      <DocumentWorkspace 
        document={generatedDocument}
        isGenerating={isLoading && mode === 'redaction'}
        onRegenerate={handleRegenerate}
        onCopy={handleCopy}
        onExportPDF={handleExportPDF}
        onSaveDraft={handleSaveDraft}
        onClose={() => setGeneratedDocument(null)}
      />
      
    </div>
  );
}
```

---

## Fonctionnalites preservees

- Historique des conversations (Sheet mobile / Sidebar desktop)
- Selection du contexte (actualites et dossiers)
- Streaming des reponses
- Citations de sources cliquables
- Sauvegarde automatique des conversations

---

## Recapitulatif des ameliorations

| Avant | Apres |
|-------|-------|
| Interface ChatGPT basique | Cockpit IA professionnel en 2 colonnes |
| Un seul mode de conversation | 3 modes specialises (Recherche/Redaction/Analyse) |
| Reponses simples | Documents structures avec mise en forme |
| Sources dans le texte | Bloc "Sources analysees" visuel |
| Pas de preview document | Workspace editable avec export PDF |
| Suggestions generiques | Suggestions contextuelles selon le mode |
