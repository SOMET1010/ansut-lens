import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { type Dossier, CATEGORIE_LABELS } from '@/hooks/useDossiers';

interface RecentSendsTableProps {
  dossiers: Dossier[];
  onSelect: (dossier: Dossier) => void;
}

export function RecentSendsTable({ dossiers, onSelect }: RecentSendsTableProps) {
  if (dossiers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          Aucun document envoyé pour le moment.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-medium">Titre du document</TableHead>
            <TableHead className="font-medium">Thématique</TableHead>
            <TableHead className="font-medium">Date d'envoi</TableHead>
            <TableHead className="font-medium">Destinataires</TableHead>
            <TableHead className="text-right font-medium">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dossiers.slice(0, 5).map((dossier) => {
            const categorieInfo = CATEGORIE_LABELS[dossier.categorie];
            
            return (
              <TableRow 
                key={dossier.id} 
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onSelect(dossier)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="line-clamp-1">{dossier.titre}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary"
                    className={`${categorieInfo.color} text-white border-0 text-[10px]`}
                  >
                    {categorieInfo.icon} {categorieInfo.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(dossier.updated_at), 'dd MMM yyyy', { locale: fr })}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  DG, PCA
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(dossier);
                    }}
                  >
                    Voir
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
