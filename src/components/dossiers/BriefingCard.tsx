import { FileText, Edit3, CheckCircle, Archive, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  type Dossier, 
  type DossierStatut,
  CATEGORIE_LABELS 
} from '@/hooks/useDossiers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BriefingCardProps {
  dossier: Dossier;
  onClick: () => void;
  onEdit?: () => void;
}

const statusStyles: Record<DossierStatut, { 
  color: string; 
  label: string; 
  Icon: typeof Edit3 
}> = {
  brouillon: { 
    color: 'bg-muted text-muted-foreground', 
    label: 'Brouillon', 
    Icon: Edit3 
  },
  publie: { 
    color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400', 
    label: 'Envoyé', 
    Icon: CheckCircle 
  },
  archive: { 
    color: 'bg-secondary text-secondary-foreground', 
    label: 'Archivé', 
    Icon: Archive 
  },
};

export function BriefingCard({ dossier, onClick, onEdit }: BriefingCardProps) {
  const statutInfo = statusStyles[dossier.statut];
  const categorieInfo = CATEGORIE_LABELS[dossier.categorie];
  const StatusIcon = statutInfo.Icon;

  const formatRelativeDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: false, 
        locale: fr 
      });
    } catch {
      return 'récemment';
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer group relative"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header: Type badge + Menu */}
        <div className="flex justify-between items-start mb-3">
          <Badge 
            variant="secondary"
            className={`${categorieInfo.color} text-white border-0 text-[10px] font-bold uppercase`}
          >
            {categorieInfo.icon} {categorieInfo.label}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                <Edit3 className="h-4 w-4 mr-2" /> Modifier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h3 className="font-bold text-foreground text-sm leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {dossier.titre}
        </h3>

        {/* Resume */}
        {dossier.resume && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
            {dossier.resume}
          </p>
        )}

        {/* Footer: Author + Date + Status */}
        <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px] bg-muted">
                {dossier.auteur_id ? 'AU' : 'AN'}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground">
              {formatRelativeDate(dossier.updated_at)}
            </span>
          </div>
          
          <Badge 
            variant="outline"
            className={`${statutInfo.color} text-[10px] font-medium flex items-center gap-1 border-0`}
          >
            <StatusIcon className="h-3 w-3" />
            {statutInfo.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreateCardProps {
  onClick: () => void;
}

export function CreateCard({ onClick }: CreateCardProps) {
  return (
    <button 
      onClick={onClick}
      className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary transition-all min-h-[180px] w-full"
    >
      <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center mb-2">
        <FileText className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium">Créer un document</span>
    </button>
  );
}
