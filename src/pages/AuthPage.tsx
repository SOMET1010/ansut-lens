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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Mail, KeyRound, Sparkles } from 'lucide-react';
import logoAnsut from '@/assets/logo-ansut.jpg';

// ── Schemas ──────────────────────────────────────────
const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
  password: z.string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

const resetSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
});

const magicLinkSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type ResetFormData = z.infer<typeof resetSchema>;
type MagicLinkFormData = z.infer<typeof magicLinkSchema>;
type AuthMode = 'login' | 'forgot-password' | 'magic-link';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { user, isLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/radar';

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });

  const magicLinkForm = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [user, isLoading, from, navigate]);

  const handleModeChange = (newMode: AuthMode) => {
    form.reset();
    resetForm.reset();
    magicLinkForm.reset();
    setMagicLinkSent(false);
    setMode(newMode);
  };

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        toast.error(error.message || 'Erreur de connexion');
      } else {
        toast.success('Connexion réussie');
        navigate(from, { replace: true });
      }
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    setLoading(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('reset-user-password', {
        body: { email: data.email },
      });

      if (fnError) {
        console.error('Reset password error:', fnError);
        toast.error("Erreur lors de l'envoi de l'email");
      } else if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result?.message || 'Un email de réinitialisation a été envoyé');
        handleModeChange('login');
      }
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const onMagicLinkSubmit = async (data: MagicLinkFormData) => {
    setLoading(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('send-magic-link', {
        body: { email: data.email },
      });

      if (fnError) {
        console.error('Magic link error:', fnError);
        toast.error("Erreur lors de l'envoi du lien magique");
      } else if (result?.error) {
        toast.error(result.error);
      } else {
        setMagicLinkSent(true);
        toast.success(result?.message || 'Lien magique envoyé ! Vérifiez votre boîte mail.');
      }
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // ── Magic link view ──
  if (mode === 'magic-link') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoAnsut} alt="ANSUT" className="w-20 h-20 rounded-xl object-contain bg-white p-2" />
            </div>
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Connexion rapide
            </CardTitle>
            <CardDescription>
              {magicLinkSent 
                ? "Consultez votre boîte mail et cliquez sur le lien pour vous connecter"
                : "Recevez un lien de connexion par email — sans mot de passe"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {magicLinkSent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Un lien de connexion a été envoyé à votre adresse email. 
                  Il est valable pendant 1 heure.
                </p>
                <Button variant="outline" onClick={() => setMagicLinkSent(false)} className="w-full">
                  Renvoyer le lien
                </Button>
              </div>
            ) : (
              <Form {...magicLinkForm}>
                <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
                  <FormField
                    control={magicLinkForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email professionnel</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="vous@ansut.ci" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer le lien magique
                  </Button>
                </form>
              </Form>
            )}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Connexion par mot de passe
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Forgot password view ──
  if (mode === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoAnsut} alt="ANSUT" className="w-20 h-20 rounded-xl object-contain bg-white p-2" />
            </div>
            <CardTitle className="text-2xl font-bold">Mot de passe oublié</CardTitle>
            <CardDescription>Entrez votre email pour recevoir un lien de réinitialisation</CardDescription>
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

  // ── Login view ──
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
          <CardDescription>Plateforme de veille stratégique</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <button
                        type="button"
                        onClick={() => handleModeChange('forgot-password')}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Se connecter
              </Button>
            </form>
          </Form>

          <div className="relative my-5">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              ou
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleModeChange('magic-link')}
          >
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            Connexion sans mot de passe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
