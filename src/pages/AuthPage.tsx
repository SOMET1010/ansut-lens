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

type FormData = z.infer<typeof signUpSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { user, isLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/radar';

  const form = useForm<FormData>({
    resolver: zodResolver(isLogin ? loginSchema : signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: ''
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
  const handleModeChange = () => {
    form.reset();
    setIsLogin(!isLogin);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          toast.error(error.message || 'Erreur de connexion');
        } else {
          toast.success('Connexion réussie');
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await signUp(data.email, data.password, data.fullName);
        if (error) {
          toast.error(error.message || 'Erreur lors de l\'inscription');
        } else {
          toast.success('Compte créé ! Vérifiez votre email.');
          setIsLogin(true);
          form.reset();
        }
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

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
              {!isLogin && (
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
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer un compte'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleModeChange}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? 'Pas de compte ? Inscrivez-vous' : 'Déjà un compte ? Connectez-vous'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
