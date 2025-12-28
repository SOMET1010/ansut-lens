import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  AlertTriangle, 
  Share2, 
  Tag,
  Linkedin,
  Newspaper,
  Mic,
  FileText,
  Check,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarquerRecommandationVue } from '@/hooks/usePresenceDigitale';
import type { RecommandationSPDI, CanalCommunication, TypeRecommandationSPDI } from '@/types';

interface SPDIRecommandationsProps {
  recommandations: RecommandationSPDI[];
  compact?: boolean;
}

const TYPE_CONFIG: Record<TypeRecommandationSPDI, { icon: typeof Lightbulb; color: string; bgColor: string }> = {
  opportunite: { 
    icon: Lightbulb, 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10' 
  },
  alerte: { 
    icon: AlertTriangle, 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/10' 
  },
  canal: { 
    icon: Share2, 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/10' 
  },
  thematique: { 
    icon: Tag, 
    color: 'text-purple-500', 
    bgColor: 'bg-purple-500/10' 
  },
};

const CANAL_ICONS: Record<CanalCommunication, typeof Linkedin> = {
  linkedin: Linkedin,
  presse: Newspaper,
  conference: Mic,
  communique: FileText,
};

const PRIORITE_STYLES = {
  haute: 'border-red-500/50 bg-red-500/5',
  normale: 'border-border',
  basse: 'border-muted',
};

export function SPDIRecommandations({ recommandations, compact = false }: SPDIRecommandationsProps) {
  const marquerVue = useMarquerRecommandationVue();

  if (recommandations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucune recommandation pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {recommandations.slice(0, 3).map((reco) => {
          const config = TYPE_CONFIG[reco.type];
          const Icon = config.icon;
          return (
            <div 
              key={reco.id}
              className={cn(
                'flex items-start gap-2 p-2 rounded-lg border',
                PRIORITE_STYLES[reco.priorite],
                reco.vue && 'opacity-60'
              )}
            >
              <div className={cn('p-1 rounded', config.bgColor)}>
                <Icon className={cn('h-3 w-3', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{reco.titre}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Recommandations IA
          <Badge variant="secondary" className="ml-auto">
            {recommandations.filter(r => !r.vue).length} nouvelles
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommandations.map((reco) => {
          const config = TYPE_CONFIG[reco.type];
          const Icon = config.icon;
          const CanalIcon = reco.canal ? CANAL_ICONS[reco.canal] : null;
          
          return (
            <div 
              key={reco.id}
              className={cn(
                'p-3 rounded-lg border transition-all',
                PRIORITE_STYLES[reco.priorite],
                reco.vue && 'opacity-60'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', config.bgColor)}>
                  <Icon className={cn('h-4 w-4', config.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium">{reco.titre}</h4>
                    {reco.priorite === 'haute' && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {reco.message}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    {CanalIcon && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <CanalIcon className="h-3 w-3" />
                        {reco.canal}
                      </Badge>
                    )}
                    {reco.thematique && (
                      <Badge variant="outline" className="text-[10px]">
                        {reco.thematique}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {!reco.vue && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => marquerVue.mutate(reco.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
