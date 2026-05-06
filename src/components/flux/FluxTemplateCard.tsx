import { Plus, Wifi, Radio, MessageCircle, FileText, Coins, Satellite, Scale, Users, BookOpen, LucideIcon } from 'lucide-react';

export interface FluxTemplate {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  quadrants: string[];
}

export const fluxTemplates: FluxTemplate[] = [
  {
    id: 'zones-blanches',
    title: 'Zones Blanches',
    description: 'Surveillance couverture & accès rural',
    icon: Wifi,
    keywords: ['zones blanches', 'couverture', 'rural', 'service universel'],
    quadrants: ['regulation', 'reputation'],
  },
  {
    id: 'ftth-5g',
    title: 'FTTH & 5G',
    description: 'Politique opérateurs & déploiement',
    icon: Radio,
    keywords: ['FTTH', '5G', 'fibre', 'déploiement', 'haut débit'],
    quadrants: ['tech', 'market'],
  },
  {
    id: 'reputation-ansut',
    title: 'Réputation ANSUT',
    description: 'Image institutionnelle & mentions',
    icon: MessageCircle,
    keywords: ['ANSUT', 'service universel', 'image', 'communication'],
    quadrants: ['reputation'],
  },
  {
    id: 'inclusion-numerique',
    title: 'Inclusion Numérique',
    description: 'Usages citoyens & alphabétisation',
    icon: Users,
    keywords: ['inclusion numérique', 'fracture', 'usages', 'citoyen'],
    quadrants: ['reputation', 'market'],
  },
  {
    id: 'satellite-leo',
    title: 'Satellite & LEO',
    description: 'Connectivité rurale & Starlink',
    icon: Satellite,
    keywords: ['Starlink', 'satellite', 'LEO', 'OneWeb', 'connectivité satellitaire'],
    quadrants: ['tech', 'market'],
  },
  {
    id: 'regulation-telecom',
    title: 'Régulation Télécom',
    description: 'Décisions ARTCI & cadre légal',
    icon: Scale,
    keywords: ['ARTCI', 'régulation', 'spectre', 'licence', 'décision'],
    quadrants: ['regulation'],
  },
  {
    id: 'mobile-money',
    title: 'Mobile Money',
    description: 'Inclusion financière & paiement mobile',
    icon: Coins,
    keywords: ['mobile money', 'paiement mobile', 'fintech', 'inclusion financière'],
    quadrants: ['market', 'tech'],
  },
  {
    id: 'julaba-insights',
    title: 'Jùlaba Insights',
    description: 'Économie informelle & numérique',
    icon: BookOpen,
    keywords: ['informel', 'économie', 'jùlaba', 'commerce', 'PME'],
    quadrants: ['market'],
  },
];

interface FluxTemplateCardProps {
  template: FluxTemplate;
  onSelect: (template: FluxTemplate) => void;
}

export function FluxTemplateCard({ template, onSelect }: FluxTemplateCardProps) {
  const Icon = template.icon;

  return (
    <button
      onClick={() => onSelect(template)}
      className="group relative flex flex-col p-4 border border-border/60 rounded-xl bg-card hover:border-primary/40 hover:shadow-md transition-all text-left h-full w-full overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between mb-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <h4 className="relative font-bold text-foreground text-sm mb-1">{template.title}</h4>
      <p className="relative text-xs text-muted-foreground line-clamp-2">{template.description}</p>
    </button>
  );
}
