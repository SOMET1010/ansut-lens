import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, Mail, Pencil, Trash2, Rss, Eye } from 'lucide-react';
import { FluxVeille, useToggleFluxActive } from '@/hooks/useFluxVeille';
import { useNavigate } from 'react-router-dom';

interface FluxCardProps {
  flux: FluxVeille;
  actualitesCount?: number;
  onEdit: (flux: FluxVeille) => void;
  onDelete: (flux: FluxVeille) => void;
}

const frequenceLabels: Record<string, string> = {
  instantane: 'Instantané',
  quotidien: 'Quotidien',
  hebdo: 'Hebdomadaire',
};

const quadrantLabels: Record<string, string> = {
  tech: 'Technologie',
  regulation: 'Régulation',
  market: 'Marché',
  reputation: 'Réputation',
};

export function FluxCard({ flux, actualitesCount = 0, onEdit, onDelete }: FluxCardProps) {
  const navigate = useNavigate();
  const toggleActive = useToggleFluxActive();

  const handleToggleActive = () => {
    toggleActive.mutate({ id: flux.id, actif: !flux.actif });
  };

  return (
    <Card className={`glass transition-all hover:shadow-glow ${!flux.actif ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Rss className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-lg truncate">{flux.nom}</CardTitle>
          </div>
          <Switch 
            checked={flux.actif} 
            onCheckedChange={handleToggleActive}
            disabled={toggleActive.isPending}
          />
        </div>
        {flux.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {flux.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-primary">{actualitesCount}</span>
            <span className="text-muted-foreground">actualités</span>
          </div>
          {flux.importance_min > 0 && (
            <Badge variant="outline">≥{flux.importance_min}%</Badge>
          )}
        </div>

        {/* Keywords preview */}
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

        {/* Quadrants preview */}
        {flux.quadrants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {flux.quadrants.map((q) => (
              <Badge key={q} variant="outline" className="text-xs">
                {quadrantLabels[q] || q}
              </Badge>
            ))}
          </div>
        )}

        {/* Notifications */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {flux.alerte_push ? (
            <span className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {frequenceLabels[flux.frequence_digest] || flux.frequence_digest}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <BellOff className="h-3 w-3" />
              Pas d'alerte
            </span>
          )}
          {flux.alerte_email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Email
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate(`/flux/${flux.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Voir le flux
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onEdit(flux)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onDelete(flux)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
