import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  email?: string;
  fullName?: string | null;
  onSubmit: (data: { full_name: string }) => void;
  isSubmitting?: boolean;
}

export function ProfileForm({ email, fullName, onSubmit, isSubmitting }: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: fullName || '',
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (fullName !== undefined) {
      form.reset({ full_name: fullName || '' });
    }
  }, [fullName, form]);

  const handleSubmit = (data: ProfileFormValues) => {
    onSubmit({ full_name: data.full_name });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet</FormLabel>
              <FormControl>
                <Input
                  placeholder="Votre nom complet"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Email
          </label>
          <div className="relative">
            <Input
              value={email || ''}
              disabled
              className="pr-10 bg-muted/50 text-muted-foreground"
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            L'email ne peut pas être modifié
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer les modifications'
          )}
        </Button>
      </form>
    </Form>
  );
}
