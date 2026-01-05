import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useCreatePersonnalite, useUpdatePersonnalite, CERCLE_LABELS, SOUS_CATEGORIE_LABELS } from '@/hooks/usePersonnalites';
import { Loader2, User, Building2, MapPin, Tag, Network, StickyNote } from 'lucide-react';
import type { CercleStrategique, CategorieActeur, SousCategorieActeur, Personnalite } from '@/types';

const CATEGORIES: { value: CategorieActeur; label: string }[] = [
  { value: 'operateur', label: 'Opérateur' },
  { value: 'regulateur', label: 'Régulateur' },
  { value: 'expert', label: 'Expert' },
  { value: 'politique', label: 'Politique' },
  { value: 'media', label: 'Média' },
  { value: 'bailleur', label: 'Bailleur' },
  { value: 'fai', label: 'FAI' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'autre', label: 'Autre' },
];

const SOUS_CATEGORIES_PAR_CERCLE: Record<CercleStrategique, SousCategorieActeur[]> = {
  1: ['tutelle_mtnd', 'regulation_artci', 'gouvernance_ansut'],
  2: ['operateurs_mobiles', 'fai_internet', 'fintech_mobile_money', 'equipementiers', 'associations_sectorielles'],
  3: ['bailleurs_financeurs', 'organisations_africaines', 'normalisation_standards'],
  4: ['medias_analystes', 'academique_formation', 'consultants_influenceurs'],
};

const formSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().optional(),
  fonction: z.string().optional(),
  organisation: z.string().optional(),
  cercle: z.number().min(1).max(4),
  categorie: z.string().optional(),
  sous_categorie: z.string().optional(),
  pays: z.string().optional(),
  zone: z.string().optional(),
  bio: z.string().optional(),
  score_influence: z.number().min(0).max(100),
  twitter: z.string().url().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ActeurFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  acteur?: Personnalite;
}

export function ActeurFormDialog({ open, onOpenChange, onSuccess, acteur }: ActeurFormDialogProps) {
  const { toast } = useToast();
  const createPersonnalite = useCreatePersonnalite();
  const updatePersonnalite = useUpdatePersonnalite();
  const isEditMode = !!acteur;

  const defaultValues = {
    nom: '',
    prenom: '',
    fonction: '',
    organisation: '',
    cercle: 2,
    categorie: '',
    sous_categorie: '',
    pays: "Côte d'Ivoire",
    zone: "Afrique de l'Ouest",
    bio: '',
    score_influence: 50,
    twitter: '',
    linkedin: '',
    notes: '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Pré-remplir le formulaire en mode édition
  useEffect(() => {
    if (acteur && open) {
      form.reset({
        nom: acteur.nom,
        prenom: acteur.prenom || '',
        fonction: acteur.fonction || '',
        organisation: acteur.organisation || '',
        cercle: acteur.cercle,
        categorie: acteur.categorie || '',
        sous_categorie: acteur.sous_categorie || '',
        pays: acteur.pays || "Côte d'Ivoire",
        zone: acteur.zone || "Afrique de l'Ouest",
        bio: acteur.bio || '',
        score_influence: acteur.score_influence || 50,
        twitter: acteur.reseaux?.twitter || '',
        linkedin: acteur.reseaux?.linkedin || '',
        notes: acteur.notes || '',
      });
    } else if (!acteur && open) {
      form.reset(defaultValues);
    }
  }, [acteur, open, form]);

  const watchedCercle = form.watch('cercle') as CercleStrategique;
  const availableSousCategories = SOUS_CATEGORIES_PAR_CERCLE[watchedCercle] || [];

  const onSubmit = async (values: FormValues) => {
    try {
      const reseaux: Record<string, string> = {};
      if (values.twitter) reseaux.twitter = values.twitter;
      if (values.linkedin) reseaux.linkedin = values.linkedin;

      const personnaliteData = {
        nom: values.nom,
        prenom: values.prenom || undefined,
        fonction: values.fonction || undefined,
        organisation: values.organisation || undefined,
        cercle: values.cercle as CercleStrategique,
        categorie: (values.categorie || undefined) as CategorieActeur | undefined,
        sous_categorie: (values.sous_categorie || undefined) as SousCategorieActeur | undefined,
        pays: values.pays || undefined,
        zone: values.zone || undefined,
        bio: values.bio || undefined,
        score_influence: values.score_influence,
        reseaux: Object.keys(reseaux).length > 0 ? reseaux : undefined,
        notes: values.notes || undefined,
        actif: true,
      };

      if (isEditMode && acteur) {
        await updatePersonnalite.mutateAsync({
          id: acteur.id,
          ...personnaliteData,
        });
        toast({
          title: 'Acteur modifié',
          description: `Les modifications ont été enregistrées.`,
        });
      } else {
        await createPersonnalite.mutateAsync(personnaliteData);
        toast({
          title: 'Acteur créé',
          description: `${values.prenom ? values.prenom + ' ' : ''}${values.nom} a été ajouté avec succès.`,
        });
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: isEditMode ? "Impossible de modifier l'acteur." : "Impossible de créer l'acteur.",
        variant: 'destructive',
      });
    }
  };

  const isPending = createPersonnalite.isPending || updatePersonnalite.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditMode ? "Modifier l'acteur" : 'Ajouter un acteur'}</DialogTitle>
        <DialogDescription>
          {isEditMode 
            ? "Modifier les informations de cet acteur stratégique" 
            : 'Créer manuellement un nouvel acteur stratégique'}
        </DialogDescription>
      </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section Identité */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Identité
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom *</FormLabel>
                      <FormControl>
                        <Input placeholder="Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prenom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fonction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonction</FormLabel>
                      <FormControl>
                        <Input placeholder="Directeur Général" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organisation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation</FormLabel>
                      <FormControl>
                        <Input placeholder="ANSUT" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Classification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Classification
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cercle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cercle</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(val) => {
                          field.onChange(parseInt(val));
                          form.setValue('sous_categorie', '');
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {([1, 2, 3, 4] as CercleStrategique[]).map((c) => (
                            <SelectItem key={c} value={c.toString()}>
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${CERCLE_LABELS[c].color}`} />
                                Cercle {c}
                              </div>
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
                  name="categorie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
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
                  name="sous_categorie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sous-catégorie</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSousCategories.map((sc) => (
                            <SelectItem key={sc} value={sc}>
                              {SOUS_CATEGORIE_LABELS[sc]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Localisation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Localisation
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Détails */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Tag className="h-4 w-4" />
                Détails
              </div>
              <FormField
                control={form.control}
                name="score_influence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score d'influence: {field.value}</FormLabel>
                    <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={(val) => field.onChange(val[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="py-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biographie</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Parcours, réalisations, domaines d'expertise..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section Réseaux */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Network className="h-4 w-4" />
                Réseaux sociaux
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter / X</FormLabel>
                      <FormControl>
                        <Input placeholder="https://x.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Notes */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <StickyNote className="h-4 w-4" />
                Notes internes
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Notes confidentielles, remarques..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditMode ? 'Enregistrer' : "Créer l'acteur"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}