import { Search, FileText, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AssistantMode = 'recherche' | 'redaction' | 'analyse';

interface ModeSelectorProps {
  mode: AssistantMode;
  onModeChange: (mode: AssistantMode) => void;
}

const modeConfigs = {
  recherche: {
    label: 'Recherche',
    icon: Search,
    description: 'Trouver des informations dans la base documentaire',
  },
  redaction: {
    label: 'Rédaction',
    icon: FileText,
    description: 'Rédiger des notes, briefings et rapports',
  },
  analyse: {
    label: 'Analyse',
    icon: BarChart3,
    description: 'Analyser des tendances et données',
  },
};

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex bg-muted p-1 rounded-lg">
      {(Object.keys(modeConfigs) as AssistantMode[]).map((key) => {
        const config = modeConfigs[key];
        const Icon = config.icon;
        const isActive = mode === key;
        
        return (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
              isActive 
                ? "bg-background text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            title={config.description}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function getModeSystemPromptAddition(mode: AssistantMode): string {
  const additions: Record<AssistantMode, string> = {
    recherche: `

MODE RECHERCHE ACTIVÉ:
- Réponds de façon synthétique avec des listes à puces
- Cite SYSTÉMATIQUEMENT tes sources avec le format [[ACTU:id|titre]] ou [[DOSSIER:id|titre]]
- Privilégie les faits et les données concrètes
- Structure ta réponse en sections claires`,
    redaction: `

MODE RÉDACTION ACTIVÉ:
- Génère des documents structurés et professionnels
- Utilise un ton formel adapté à la Direction Générale
- Structure avec: OBJET, I. CONTEXTE, II. ANALYSE, III. RECOMMANDATIONS
- Format adapté pour export (notes ministérielles, briefings DG, rapports)
- Cite les sources dans le document avec le format [[ACTU:id|titre]]`,
    analyse: `

MODE ANALYSE ACTIVÉ:
- Fournis des analyses chiffrées et des statistiques
- Utilise des tableaux comparatifs quand pertinent
- Identifie les tendances et signaux faibles
- Évalue les risques et opportunités
- Termine par des recommandations concrètes et priorisées`,
  };
  
  return additions[mode];
}
