import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit, Trash2, X, Clock, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  useDeleteDossier,
  CATEGORIE_LABELS, 
  STATUT_LABELS,
  type Dossier 
} from '@/hooks/useDossiers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DossierViewProps {
  dossier: Dossier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (dossier: Dossier) => void;
}

export function DossierView({ dossier, open, onOpenChange, onEdit }: DossierViewProps) {
  const { isAdmin } = useAuth();
  const deleteMutation = useDeleteDossier();

  if (!dossier) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(dossier.id);
      toast.success('Dossier supprimé');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const categorieInfo = CATEGORIE_LABELS[dossier.categorie];
  const statutInfo = STATUT_LABELS[dossier.statut];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline"
                  className={`${categorieInfo.color} text-white border-0`}
                >
                  {categorieInfo.icon} {categorieInfo.label}
                </Badge>
                <Badge variant={statutInfo.variant}>
                  {statutInfo.label}
                </Badge>
              </div>
              <SheetTitle className="text-xl text-left">
                {dossier.titre}
              </SheetTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(dossier.updated_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          {dossier.resume && (
            <>
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Résumé exécutif</h4>
                <p className="text-sm italic">{dossier.resume}</p>
              </div>
            </>
          )}

          {dossier.contenu ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {dossier.contenu}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground italic text-center py-8">
              Aucun contenu pour ce dossier.
            </p>
          )}
        </ScrollArea>

        {isAdmin && (
          <div className="p-4 border-t flex justify-end gap-2 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce dossier ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le dossier "{dossier.titre}" sera définitivement supprimé.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="sm" onClick={() => onEdit(dossier)}>
              <Edit className="h-4 w-4 mr-1" />
              Modifier
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
