import { ExternalLink, Globe, Newspaper, Linkedin, Building2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SourceBadgeProps {
  url: string;
}

type SourceType = 'officiel' | 'presse' | 'linkedin' | 'gouvernement' | 'autre';

function detecterTypeSource(url: string): { type: SourceType; domaine: string } {
  try {
    const urlObj = new URL(url);
    const domaine = urlObj.hostname.replace('www.', '');
    
    // LinkedIn
    if (domaine.includes('linkedin.com')) {
      return { type: 'linkedin', domaine: 'LinkedIn' };
    }
    
    // Sites gouvernementaux
    if (domaine.endsWith('.gouv.ci') || domaine.endsWith('.gov') || domaine.includes('gouv')) {
      return { type: 'gouvernement', domaine };
    }
    
    // Sites officiels d'organisations
    if (domaine.includes('artci.ci') || domaine.includes('ansut.ci') || 
        domaine.includes('orange.ci') || domaine.includes('mtn.ci') ||
        domaine.includes('moov') || domaine.includes('banquemondiale') ||
        domaine.includes('worldbank') || domaine.includes('afdb')) {
      return { type: 'officiel', domaine };
    }
    
    // Presse
    const presseDomaines = ['abidjan.net', 'fratmat.info', 'linfodrome.com', 
                           'koaci.com', 'reuters.com', 'jeuneafrique.com',
                           'lemonde.fr', 'africanews', 'rfi.fr'];
    if (presseDomaines.some(p => domaine.includes(p))) {
      return { type: 'presse', domaine };
    }
    
    return { type: 'autre', domaine };
  } catch {
    return { type: 'autre', domaine: url.slice(0, 30) };
  }
}

const TYPE_CONFIG: Record<SourceType, { icon: typeof Globe; className: string; label: string }> = {
  officiel: { 
    icon: Building2, 
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
    label: 'Site officiel'
  },
  gouvernement: { 
    icon: FileText, 
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
    label: 'Gouvernement'
  },
  presse: { 
    icon: Newspaper, 
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
    label: 'Presse'
  },
  linkedin: { 
    icon: Linkedin, 
    className: 'bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30',
    label: 'LinkedIn'
  },
  autre: { 
    icon: Globe, 
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
    label: 'Autre'
  },
};

export function SourceBadge({ url }: SourceBadgeProps) {
  const { type, domaine } = detecterTypeSource(url);
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Badge 
              variant="outline" 
              className={`${config.className} cursor-pointer transition-colors text-xs gap-1 px-2`}
            >
              <Icon className="h-3 w-3" />
              <span className="max-w-[100px] truncate">{domaine}</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </Badge>
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground break-all">{url}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
