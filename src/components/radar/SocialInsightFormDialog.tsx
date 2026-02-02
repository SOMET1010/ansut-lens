import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Newspaper, MessagesSquare, Globe } from 'lucide-react';
import { useCreateSocialInsight, WebPlateforme } from '@/hooks/useSocialInsights';

const PLATFORMS: { value: WebPlateforme; label: string; icon: typeof Globe }[] = [
  { value: 'linkedin', label: 'LinkedIn', icon: Globe },
  { value: 'twitter', label: 'Twitter/X', icon: Globe },
  { value: 'facebook', label: 'Facebook', icon: Globe },
  { value: 'blog', label: 'Blog', icon: Newspaper },
  { value: 'forum', label: 'Forum', icon: MessagesSquare },
  { value: 'news', label: 'Actualités', icon: Globe },
];

const socialInsightSchema = z.object({
  plateforme: z.enum(['linkedin', 'twitter', 'facebook', 'blog', 'forum', 'news'], {
    required_error: 'Sélectionnez une plateforme',
  }),
  contenu: z
    .string()
    .min(10, 'Le contenu doit faire au moins 10 caractères')
    .max(2000, 'Maximum 2000 caractères'),
  url_original: z
    .string()
    .url('URL invalide')
    .optional()
    .or(z.literal('')),
  auteur: z
    .string()
    .max(100, 'Maximum 100 caractères')
    .optional()
    .or(z.literal('')),
  est_critique: z.boolean().default(false),
  hashtags: z.string().optional(),
});

type SocialInsightFormValues = z.infer<typeof socialInsightSchema>;

interface SocialInsightFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SocialInsightFormDialog({ open, onOpenChange }: SocialInsightFormDialogProps) {
  const createMutation = useCreateSocialInsight();

  const form = useForm<SocialInsightFormValues>({
    resolver: zodResolver(socialInsightSchema),
    defaultValues: {
      plateforme: undefined,
      contenu: '',
      url_original: '',
      auteur: '',
      est_critique: false,
      hashtags: '',
    },
  });

  const onSubmit = async (values: SocialInsightFormValues) => {
    const hashtags = values.hashtags
      ? values.hashtags
          .split(/[\s,]+/)
          .map((tag) => tag.replace(/^#/, '').trim())
          .filter(Boolean)
      : undefined;

    await createMutation.mutateAsync({
      plateforme: values.plateforme,
      contenu: values.contenu,
      url_original: values.url_original || undefined,
      auteur: values.auteur || undefined,
      est_critique: values.est_critique,
      hashtags,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un insight
          </DialogTitle>
          <DialogDescription>
            Collez un post ou article intéressant trouvé sur le web ou les réseaux sociaux.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plateforme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plateforme *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLATFORMS.map((platform) => {
                        const Icon = platform.icon;
                        return (
                          <SelectItem key={platform.value} value={platform.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {platform.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contenu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu du post *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Collez le texte du post ou de l'article..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="url_original"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL source</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auteur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auteur</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'auteur" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hashtags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hashtags</FormLabel>
                  <FormControl>
                    <Input placeholder="#innovation #tech (séparés par des espaces)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="est_critique"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Marquer comme critique</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Cet insight sera signalé comme prioritaire dans la veille
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
