import { Sparkles, Search, FileText, BarChart3, Megaphone, ArrowRight, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AssistantMode } from './ModeSelector';

interface WelcomeScreenProps {
  mode: AssistantMode;
  onPromptClick: (prompt: string) => void;
  contextStats: { actualites: number; dossiers: number };
}

const PROMPTS_BY_MODE: Record<AssistantMode, { title: string; prompt: string; icon: any }[]> = {
  recherche: [
    { title: 'Synthèse des dernières actualités télécom', prompt: 'Fais une synthèse en 5 points des actualités télécom les plus importantes ces 72 dernières heures, en citant chaque source.', icon: Search },
    { title: 'Mentions de l\'ANSUT cette semaine', prompt: 'Quelles sont les mentions de l\'ANSUT dans les actualités sélectionnées ? Cite les sources.', icon: Search },
    { title: 'Concurrents : positions récentes', prompt: 'Résume les positions et annonces récentes des opérateurs (Orange, MTN, Moov) avec sources.', icon: Search },
    { title: 'Évolution réglementaire', prompt: 'Y a-t-il des évolutions réglementaires ou décisions de l\'ARTCI dans le contexte ? Cite les sources.', icon: Search },
  ],
  redaction: [
    { title: 'Note de synthèse pour la DG', prompt: 'Rédige une note de synthèse à l\'attention de la Direction Générale sur les enjeux télécoms de la semaine. Format : OBJET, I. CONTEXTE, II. ANALYSE, III. RECOMMANDATIONS.', icon: FileText },
    { title: 'Briefing exécutif (1 page)', prompt: 'Prépare un briefing exécutif d\'une page sur l\'actualité la plus importante : enjeux, impact ANSUT, recommandations.', icon: FileText },
    { title: 'Note ministérielle', prompt: 'Rédige une note à l\'attention du Ministre de la Communication et de l\'Économie Numérique sur le service universel.', icon: FileText },
    { title: 'Éléments de langage', prompt: 'Prépare 5 éléments de langage pour la Direction Générale sur les actualités sélectionnées.', icon: FileText },
  ],
  analyse: [
    { title: 'Tendances et signaux faibles', prompt: 'Analyse les tendances de fond et signaux faibles dans les actualités sélectionnées. Identifie 3 opportunités et 3 risques pour l\'ANSUT.', icon: BarChart3 },
    { title: 'Cartographie des acteurs', prompt: 'Cartographie les acteurs mentionnés dans le contexte : qui prend la parole, sur quels sujets, avec quel impact ?', icon: BarChart3 },
    { title: 'Impact projets ANSUT', prompt: 'Évalue l\'impact des actualités sur les projets ANSUT en cours. Priorise par criticité.', icon: BarChart3 },
    { title: 'Comparatif sentiment', prompt: 'Compare le sentiment médiatique entre les principaux acteurs cités. Tableau comparatif.', icon: BarChart3 },
  ],
  communication: [
    { title: 'Post LinkedIn ANSUT', prompt: 'Rédige un post LinkedIn pour valoriser une actualité positive du secteur en lien avec la mission ANSUT.', icon: Megaphone },
    { title: 'Communiqué de presse', prompt: 'Rédige un communiqué de presse type sur le sujet principal du contexte sélectionné.', icon: Megaphone },
    { title: 'Stratégie multi-canal', prompt: 'Propose une stratégie de communication multi-canal (LinkedIn, X, Email DG) sur le sujet le plus stratégique.', icon: Megaphone },
    { title: 'Q&R presse anticipées', prompt: 'Prépare 5 questions/réponses anticipées pour la presse sur le sujet principal du contexte.', icon: Megaphone },
  ],
};

// Remplacement des couleurs litterales par des classes semantiques
const MODE_INFO: Record<AssistantMode, { label: string; tone: string; color: string }> = {
  recherche: { label: 'Recherche', tone: 'Réponses synthétiques sourcées', color: 'bg-primary/10 text-primary border-primary/20' },
  redaction: { label: 'Rédaction', tone: 'Documents structurés exportables', color: 'bg-confirme-soft text-confirme border-confirme-border' },
  analyse: { label: 'Analyse', tone: 'Tendances, signaux & risques', color: 'bg-muted text-muted-foreground border-border' },
  communication: { label: 'Communication', tone: 'Posts, communiqués, Q&R', color: 'bg-card text-card-foreground border-border' },
};

export function WelcomeScreen({ mode, onPromptClick, contextStats }: WelcomeScreenProps) {
  const prompts = PROMPTS_BY_MODE[mode];
  const info = MODE_INFO[mode];

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md mb-4">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Bonjour, je suis SUTA</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Assistant IA stratégique de l'ANSUT. J'analyse les actualités sélectionnées et cite systématiquement mes sources.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          <Badge variant="outline" className={info.color}>
            Mode {info.label}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {/* Calcul de l'accord reel selon le nombre */}
            {contextStats.actualites} {contextStats.actualites > 1 ? 'actualités' : 'actualité'} • {contextStats.dossiers} {contextStats.dossiers > 1 ? 'dossiers' : 'dossier'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2 italic">{info.tone}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {prompts.map((p, i) => {
          const Icon = p.icon;
          return (
            <Card
              key={i}
              onClick={() => onPromptClick(p.prompt)}
              className="group cursor-pointer p-4 hover:border-primary/50 hover:shadow-md transition-all flex items-start gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.prompt}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" aria-hidden="true" />
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-center text-muted-foreground mt-6 flex items-center justify-center gap-1">
        {/* Remplacement de l'emoji par une icone Lucide */}
        <Lightbulb className="h-3 w-3" aria-hidden="true" />
        Astuce : changez de mode en haut à droite pour adapter le ton et le format des réponses.
      </p>
    </div>
  );
}
