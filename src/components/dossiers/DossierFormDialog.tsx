import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { MarkdownEditor } from './MarkdownEditor';
import { 
  useCreateDossier, 
  useUpdateDossier, 
  CATEGORIE_LABELS, 
  STATUT_LABELS,
  type Dossier,
  type DossierCategorie,
  type DossierStatut
} from '@/hooks/useDossiers';
import { toast } from 'sonner';

const dossierSchema = z.object({
  titre: z.string().min(1, "Le titre est requis").max(200, "Maximum 200 caractères"),
  categorie: z.enum(['sut', 'ia', 'acteurs', 'general'] as const),
  statut: z.enum(['brouillon', 'publie', 'archive'] as const),
  resume: z.string().max(500, "Maximum 500 caractères").optional().or(z.literal('')),
  contenu: z.string().optional().or(z.literal('')),
});

type DossierFormData = z.infer<typeof dossierSchema>;

interface DossierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier?: Dossier | null;
}

export function DossierFormDialog({ open, onOpenChange, dossier }: DossierFormDialogProps) {
  const isEditing = !!dossier;
  const createMutation = useCreateDossier();
  const updateMutation = useUpdateDossier();
  
  const form = useForm<DossierFormData>({
    resolver: zodResolver(dossierSchema),
    defaultValues: {
      titre: '',
      categorie: 'general',
      statut: 'brouillon',
      resume: '',
      contenu: '',
    },
  });

  useEffect(() => {
    if (dossier) {
      form.reset({
        titre: dossier.titre,
        categorie: dossier.categorie as DossierCategorie,
        statut: dossier.statut as DossierStatut,
        resume: dossier.resume || '',
        contenu: dossier.contenu || '',
      });
    } else {
      form.reset({
        titre: '',
        categorie: 'general',
        statut: 'brouillon',
        resume: '',
        contenu: '',
      });
    }
  }, [dossier, form]);

  const onSubmit = async (data: DossierFormData) => {
    try {
      const payload = {
        titre: data.titre,
        categorie: data.categorie,
        statut: data.statut,
        resume: data.resume || undefined,
        contenu: data.contenu || undefined,
      };
      
      if (isEditing && dossier) {
        await updateMutation.mutateAsync({ id: dossier.id, ...payload });
        toast.success('Dossier mis à jour');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Dossier créé');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Modifier : ${dossier?.titre}` : 'Nouveau dossier stratégique'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Titre du dossier" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categorie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(CATEGORIE_LABELS) as DossierCategorie[]).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {CATEGORIE_LABELS[cat].icon} {CATEGORIE_LABELS[cat].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="statut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(STATUT_LABELS) as DossierStatut[]).map((statut) => (
                          <SelectItem key={statut} value={statut}>
                            {STATUT_LABELS[statut].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="resume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Résumé exécutif</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Synthèse en quelques lignes pour la Direction..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contenu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu</FormLabel>
                  <FormControl>
                    <MarkdownEditor 
                      value={field.value || ''} 
                      onChange={field.onChange}
                      placeholder="Rédigez le contenu du dossier en Markdown..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
