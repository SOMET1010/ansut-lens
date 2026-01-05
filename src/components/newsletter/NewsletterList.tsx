import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Clock, 
  Archive,
  Trash2,
  Eye,
  MoreHorizontal 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useNewsletters, useDeleteNewsletter } from '@/hooks/useNewsletters';
import type { Newsletter, NewsletterStatut } from '@/types/newsletter';

const statutConfig: Record<NewsletterStatut, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  brouillon: { label: 'Brouillon', icon: FileText, variant: 'secondary' },
  en_revision: { label: 'En révision', icon: Clock, variant: 'outline' },
  valide: { label: 'Validée', icon: CheckCircle, variant: 'default' },
  envoye: { label: 'Envoyée', icon: Send, variant: 'default' },
  archive: { label: 'Archivée', icon: Archive, variant: 'secondary' },
};

const cibleLabels = {
  dg_ca: 'DG / CA',
  partenaires: 'Partenaires',
  general: 'Grand public',
};

interface NewsletterListProps {
  onSelect: (newsletter: Newsletter) => void;
}

export function NewsletterList({ onSelect }: NewsletterListProps) {
  const { data: newsletters, isLoading } = useNewsletters();
  const deleteNewsletter = useDeleteNewsletter();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!newsletters?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Aucune newsletter générée.<br />
            Créez votre première newsletter intelligente !
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {newsletters.map((newsletter) => {
        const config = statutConfig[newsletter.statut];
        const StatusIcon = config.icon;

        return (
          <Card 
            key={newsletter.id} 
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onSelect(newsletter)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                    <span className="text-lg font-bold text-primary">#{newsletter.numero}</span>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        Newsletter {newsletter.periode === 'hebdo' ? 'hebdomadaire' : 'mensuelle'}
                      </span>
                      <Badge variant={config.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {format(new Date(newsletter.date_debut), 'dd MMM', { locale: fr })} - {format(new Date(newsletter.date_fin), 'dd MMM yyyy', { locale: fr })}
                      </span>
                      <span>•</span>
                      <span>{cibleLabels[newsletter.cible]}</span>
                      {newsletter.nb_destinataires > 0 && (
                        <>
                          <span>•</span>
                          <span>{newsletter.nb_destinataires} envois</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(newsletter); }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir / Modifier
                    </DropdownMenuItem>
                    {newsletter.statut === 'brouillon' && (
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          deleteNewsletter.mutate(newsletter.id); 
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
