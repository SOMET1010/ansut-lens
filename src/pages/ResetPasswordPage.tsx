import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff, CheckCircle, KeyRound, ArrowRight, ShieldCheck, AlertTriangle, Mail } from 'lucide-react';
import logoAnsut from '@/assets/logo-ansut.jpg';

// ── Schemas ──────────────────────────────────────────
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(72, 'Le mot de passe ne peut pas dépasser 72 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ── Sub-components ───────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '6 caractères minimum', ok: password.length >= 6 },
    { label: 'Une majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Un chiffre', ok: /\d/.test(password) },
    { label: 'Un caractère spécial', ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const color = score <= 1 ? 'bg-destructive' : score <= 2 ? 'bg-orange-500' : score <= 3 ? 'bg-amber-500' : 'bg-emerald-500';

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? color : 'bg-muted'}`} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c, i) => (
          <li key={i} className={`text-xs flex items-center gap-1 ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {c.ok ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <div className={`flex items-center gap-2 text-xs font-medium ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          1
        </div>
        <span className="hidden sm:inline">Mot de passe</span>
      </div>
      <div className={`h-px w-8 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
      <div className={`flex items-center gap-2 text-xs font-medium ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          2
        </div>
        <span className="hidden sm:inline">Accès</span>
      </div>
    </div>
  );
}

// ── Token Error UI ───────────────────────────────────
function TokenErrorView() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error('Veuillez saisir votre adresse email');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { email: email.trim() },
      });

      if (error) throw error;

      setSent(true);
      toast.success('Un nouveau lien vous a été envoyé par email');
    } catch (err: any) {
      console.error('Erreur renvoi lien:', err);
      toast.error('Impossible d\'envoyer le lien. Vérifiez votre adresse email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoAnsut} alt="ANSUT" className="w-20 h-20 rounded-xl object-contain bg-white p-2" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">
            Lien expiré ou invalide
          </CardTitle>
          <CardDescription className="text-base">
            Ce lien a peut-être déjà été utilisé ou est expiré. Entrez votre adresse email pour recevoir un nouveau lien.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Mail className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Un nouveau lien a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="resend-email" className="text-sm font-medium">
                  Adresse email
                </label>
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResend()}
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleResend}
                disabled={sending}
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Mail className="h-4 w-4" />
                Renvoyer un lien
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => navigate('/auth')}
          >
            Retour à la connexion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────
export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = form.watch('password');

  // Vérifier et échanger le token de récupération
  useEffect(() => {
    const handleRecoveryToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const type = hashParams.get('type') || queryParams.get('type');
      const tokenHash = queryParams.get('token_hash');
      
      // Cas 1: Token dans l'URL (format hash avec access_token)
      if (accessToken && refreshToken && (type === 'recovery' || type === 'invite')) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          console.error('Erreur session:', error);
          setTokenError(true);
          return;
        }
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      
      // Cas 2: Token hash dans l'URL (format email link avec token_hash)
      if (tokenHash && (type === 'recovery' || type === 'invite')) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === 'invite' ? 'invite' : 'recovery',
        });
        
        if (error) {
          console.error('Erreur vérification OTP:', error);
          setTokenError(true);
          return;
        }
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      
      // Cas 3: Vérifier si une session existe déjà
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[ResetPasswordPage] Session existante détectée, prêt pour reset');
        return;
      }
      
      setTokenError(true);
    };
    
    handleRecoveryToken();
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error(error.message || 'Erreur lors de la réinitialisation');
      } else {
        // Mettre à jour password_set_at dans profiles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const now = new Date().toISOString();
          await supabase
            .from('profiles')
            .update({ 
              password_set_at: now, 
              last_active_at: now 
            } as any)
            .eq('id', user.id);

          // Logger le succès dans admin_audit_logs
          await supabase.from('admin_audit_logs').insert({
            admin_id: user.id,
            target_user_id: user.id,
            action: 'password_reset_completed',
            details: {
              method: 'recovery_link',
              timestamp: now
            }
          });
        }
        
        setSuccess(true);
        toast.success('Mot de passe défini avec succès !');
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // ── Token error state ──
  if (tokenError) {
    return <TokenErrorView />;
  }

  // ── Success state ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <StepIndicator currentStep={2} />
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Compte activé !
            </CardTitle>
            <CardDescription className="text-base">
              Votre mot de passe a été défini avec succès. Vous pouvez maintenant accéder à ANSUT RADAR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full gap-2" 
              onClick={() => navigate('/radar')}
            >
              Accéder à l'application
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Password form state ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <StepIndicator currentStep={1} />
          <div className="flex justify-center mb-4">
            <img src={logoAnsut} alt="ANSUT" className="w-20 h-20 rounded-xl object-contain bg-white p-2" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Bienvenue sur ANSUT RADAR
          </CardTitle>
          <CardDescription className="text-base">
            Définissez votre mot de passe pour activer votre compte et accéder à la plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Choisissez un mot de passe fort que vous n'utilisez nulle part ailleurs.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoFocus
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <PasswordStrength password={watchedPassword} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <KeyRound className="h-4 w-4" />
                Définir mon mot de passe
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
