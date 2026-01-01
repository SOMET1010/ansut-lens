import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import logoAnsut from '@/assets/logo-ansut.jpg';

// Schéma de validation pour la connexion
const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
  password: z.string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  fullName: z.string().optional()
});

// Schéma de validation pour l'inscription
const signUpSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
  password: z.string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  fullName: z.string()
    .trim()
    .min(1, "Le nom complet est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
});

// Schéma pour la réinitialisation
const resetSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
});

type FormData = z.infer<typeof signUpSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const { user, isLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/radar';

  const form = useForm<FormData>({
    resolver: zodResolver(mode === 'signup' ? signUpSchema : loginSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: ''
    },
    mode: 'onBlur'
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onBlur'
  });

  // Rediriger si déjà connecté
  useEffect(() => {
    if (user && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [user, isLoading, from, navigate]);

  // Réinitialiser le formulaire au changement de mode
  const handleModeChange = (newMode: AuthMode) => {
    form.reset();
    resetForm.reset();
    setMode(newMode);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          toast.error(error.message || 'Erreur de connexion');
        } else {
          toast.success('Connexion réussie');
          navigate(from, { replace: true });
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(data.email, data.password, data.fullName);
        if (error) {
          toast.error(error.message || 'Erreur lors de l\'inscription');
        } else {
          toast.success('Compte créé ! Vérifiez votre email.');
          handleModeChange('login');
        }
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast.error(error.message || 'Erreur lors de l\'envoi de l\'email');
      } else {
        toast.success('Un email de réinitialisation a été envoyé');
        handleModeChange('login');
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // Vue pour la réinitialisation du mot de passe
  if (mode === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoAnsut} alt="ANSUT" className="w-20 h-20 rounded-xl object-contain bg-white p-2" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Mot de passe oublié
            </CardTitle>
            <CardDescription>
              Entrez votre email pour recevoir un lien de réinitialisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="vous@ansut.ci" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Envoyer le lien
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Retour à la connexion
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoAnsut} alt="ANSUT" className="w-20 h-20 rounded-xl object-contain bg-white p-2" />
          </div>
          <CardTitle className="text-2xl font-bold">
            <span className="text-primary">ANSUT</span> RADAR
          </CardTitle>
          <CardDescription>
            Plateforme de veille stratégique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {mode === 'signup' && (
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="vous@ansut.ci" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Mot de passe</FormLabel>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => handleModeChange('forgot-password')}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Mot de passe oublié ?
                        </button>
                      )}
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === 'login' ? 'Pas de compte ? Inscrivez-vous' : 'Déjà un compte ? Connectez-vous'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
