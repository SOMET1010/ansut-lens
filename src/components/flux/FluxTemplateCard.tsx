import { Plus, MessageCircle, Shield, FileText, Coins, LucideIcon } from 'lucide-react';

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
    id: 'ereputation',
    title: 'E-Réputation',
    description: 'Surveillez ce qu\'on dit de votre marque sur les réseaux',
    icon: MessageCircle,
    keywords: ['réputation', 'avis', 'mentions'],
    quadrants: ['reputation']
  },
  {
    id: 'cybersecurity',
    title: 'Cybersécurité',
    description: 'Alertes failles, ransomware et patchs critiques',
    icon: Shield,
    keywords: ['cyberattaque', 'faille', 'ransomware'],
    quadrants: ['tech']
  },
  {
    id: 'tenders',
    title: 'Appels d\'Offres',
    description: 'Détectez les nouveaux marchés publics dès publication',
    icon: FileText,
    keywords: ['appel d\'offres', 'marché public'],
    quadrants: ['market', 'regulation']
  },
  {
    id: 'fintech',
    title: 'Innovations Fintech',
    description: 'Suivi des startups et levées de fonds du secteur',
    icon: Coins,
    keywords: ['fintech', 'startup', 'levée de fonds'],
    quadrants: ['tech', 'market']
  }
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
      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-center h-full w-full"
    >
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        <Plus className="h-5 w-5" />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-bold text-foreground text-sm">{template.title}</h4>
      </div>
      <p className="text-xs text-muted-foreground px-2 line-clamp-2">{template.description}</p>
    </button>
  );
}
