import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Activity, Globe, Pencil, Trash2, Rss, Eye } from 'lucide-react';
import { FluxVeille, useToggleFluxActive } from '@/hooks/useFluxVeille';
import { useNavigate } from 'react-router-dom';

interface FluxCardProps {
  flux: FluxVeille;
  actualitesCount?: number;
  newCount?: number;
  onEdit: (flux: FluxVeille) => void;
  onDelete: (flux: FluxVeille) => void;
}

// Build query string representation for display
function buildQueryString(flux: FluxVeille): string {
  const parts: string[] = [];
  
  if (flux.mots_cles.length > 0) {
    const keywords = flux.mots_cles.slice(0, 3).join(' OR ');
    parts.push(keywords);
    if (flux.mots_cles.length > 3) {
      parts.push('...');
    }
  }
  
  if (flux.quadrants.length > 0 && flux.quadrants.length < 4) {
    parts.push(`[${flux.quadrants.join(', ')}]`);
  }
  
  if (flux.importance_min > 0) {
    parts.push(`≥${flux.importance_min}%`);
  }
  
  return parts.join(' AND ') || 'Tous les articles';
}

export function FluxCard({ flux, actualitesCount = 0, newCount = 0, onEdit, onDelete }: FluxCardProps) {
  const navigate = useNavigate();
  const toggleActive = useToggleFluxActive();

  const handleToggleActive = () => {
    toggleActive.mutate({ id: flux.id, actif: !flux.actif });
  };

  return (
    <Card className={`group relative transition-all duration-300 ${flux.actif ? 'border-primary/30 shadow-sm hover:shadow-glow' : 'opacity-60 grayscale-[0.5] hover:grayscale-0 hover:opacity-80'}`}>
      
      {/* Badge nouveautés */}
      {flux.actif && newCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-background animate-pulse z-10">
          +{newCount} nouveaux
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Icône avec statut */}
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${flux.actif ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Rss className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-foreground leading-tight truncate">{flux.nom}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`h-2 w-2 rounded-full shrink-0 ${flux.actif ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
                <span className="text-xs text-muted-foreground font-medium">
                  {flux.actif ? 'En surveillance' : 'En pause'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <Switch 
            checked={flux.actif} 
            onCheckedChange={handleToggleActive}
            disabled={toggleActive.isPending}
          />
        </div>
        
        {flux.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {flux.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Query preview (style code) */}
        <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs border border-border/50 overflow-hidden">
          <span className="text-muted-foreground select-none font-bold">QUERY: </span>
          <span className="text-foreground break-all">{buildQueryString(flux)}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span className="font-bold text-foreground">{actualitesCount}</span> actus
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="h-4 w-4" />
            {flux.quadrants.length > 0 ? flux.quadrants.length : 'Tous'} quadrants
          </span>
          {flux.importance_min > 0 && (
            <Badge variant="outline" className="text-xs">≥{flux.importance_min}%</Badge>
          )}
        </div>

        {/* Keywords preview (compact) */}
        {flux.mots_cles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {flux.mots_cles.slice(0, 3).map((kw) => (
              <Badge key={kw} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
            {flux.mots_cles.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{flux.mots_cles.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions (hover reveal) */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => navigate(`/flux/${flux.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Voir le flux
          </Button>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onEdit(flux)}
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onDelete(flux)}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
