import { useEffect, useMemo, useState } from 'react';
import { Loader2, KeyRound, Eye, EyeOff, Save, Trash2, Info, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

type SecretField = {
  name: string;
  label: string;
  required: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  connectorId: string;
  connectorName: string;
  secrets: SecretField[];
  onSaved?: () => void;
};

// ----- Validation rules per secret-name pattern -----
type Rule = {
  match: (name: string) => boolean;
  // human-friendly description for Com team
  hint: string;
  example: string;
  // returns null if valid, else error message
  validate: (value: string) => string | null;
};

const RULES: Rule[] = [
  {
    match: (n) => /BEARER|ACCESS_TOKEN|TOKEN$/i.test(n) && !/REFRESH/i.test(n),
    hint: "Chaîne longue commençant souvent par des lettres (ex: AAAA…, EAAB…). Aucun espace.",
    example: "AAAAAAAAAAAAAAAAAAAAAB%2BxxxxxxxxxxxxxxxxxxxxxxxxBLgUW9DvYFTC2",
    validate: (v) => {
      if (v.length < 20) return "Trop court — un token fait généralement 40+ caractères.";
      if (/\s/.test(v)) return "Le token ne doit contenir aucun espace.";
      if (!/^[A-Za-z0-9._\-~%+/=:]+$/.test(v)) return "Caractères inattendus — copiez la valeur brute fournie par le portail.";
      return null;
    },
  },
  {
    match: (n) => /REFRESH_TOKEN/i.test(n),
    hint: "Token long permettant de renouveler l'accès. Conservez-le précieusement.",
    example: "1//0gL9xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    validate: (v) => (v.length < 20 ? "Trop court pour un refresh token." : null),
  },
  {
    match: (n) => /CLIENT_ID|APP_ID|CONSUMER_KEY|API_KEY$/i.test(n),
    hint: "Identifiant public de l'application (visible dans le portail développeur).",
    example: "78abxyz1234567",
    validate: (v) => {
      if (v.length < 6) return "Identifiant trop court.";
      if (/\s/.test(v)) return "Aucun espace autorisé.";
      return null;
    },
  },
  {
    match: (n) => /CLIENT_SECRET|CONSUMER_SECRET|APP_SECRET/i.test(n),
    hint: "Secret applicatif (équivalent d'un mot de passe). Ne le partagez jamais par email/WhatsApp.",
    example: "Aa1Bb2Cc3Dd4Ee5Ff6Gg7Hh8",
    validate: (v) => {
      if (v.length < 16) return "Un secret fait généralement au moins 16 caractères.";
      if (/\s/.test(v)) return "Aucun espace autorisé.";
      return null;
    },
  },
  {
    match: (n) => /PAGE_ID|ACCOUNT_ID|CHANNEL_ID|USER_ID/i.test(n),
    hint: "Identifiant numérique du compte/page (chiffres uniquement la plupart du temps).",
    example: "102345678901234",
    validate: (v) => {
      if (!/^[A-Za-z0-9_\-]+$/.test(v)) return "Uniquement chiffres/lettres/_/-.";
      if (v.length < 4) return "Identifiant trop court.";
      return null;
    },
  },
  {
    match: (n) => /URL$/i.test(n) || /WEBHOOK/i.test(n),
    hint: "Adresse complète commençant par https://",
    example: "https://api.example.com/v1/send",
    validate: (v) => {
      try {
        const u = new URL(v);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return "URL invalide (http/https requis).";
        return null;
      } catch {
        return "Format d'URL invalide.";
      }
    },
  },
  {
    match: (n) => /EMAIL|FROM$/i.test(n),
    hint: "Adresse email ou identifiant d'expéditeur.",
    example: "communication@ansut.ci",
    validate: (v) => {
      if (v.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        return "Format email invalide.";
      return null;
    },
  },
  {
    match: (n) => /USERNAME|LOGIN/i.test(n),
    hint: "Identifiant de connexion fourni par le prestataire.",
    example: "ansut_radar",
    validate: (v) => (v.length < 3 ? "Trop court." : null),
  },
  {
    match: (n) => /PASSWORD/i.test(n),
    hint: "Mot de passe applicatif (jamais le mot de passe personnel d'un agent).",
    example: "••••••••••••",
    validate: (v) => (v.length < 8 ? "Mot de passe trop court (min 8 caractères)." : null),
  },
];

const DEFAULT_RULE: Rule = {
  match: () => true,
  hint: "Collez la valeur exacte fournie par le portail développeur.",
  example: "",
  validate: (v) => (v.trim().length === 0 ? "Champ vide." : null),
};

function ruleFor(name: string): Rule {
  return RULES.find((r) => r.match(name)) || DEFAULT_RULE;
}

export function SocialCredentialsDialog({
  open,
  onOpenChange,
  connectorId,
  connectorName,
  secrets,
  onSaved,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [stored, setStored] = useState<Record<string, boolean>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rotationMode, setRotationMode] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [rotateAction, setRotateAction] = useState<'rotate' | 'revoke'>('rotate');
  const [rotateReason, setRotateReason] = useState('');
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues({});
    setReveal({});
    setLoading(true);
    supabase
      .from('social_api_credentials')
      .select('secret_name, secret_value')
      .eq('connector', connectorId)
      .then(({ data, error }) => {
        if (error) {
          toast.error('Lecture impossible : ' + error.message);
        } else {
          const map: Record<string, string> = {};
          const exist: Record<string, boolean> = {};
          (data || []).forEach((row: any) => {
            map[row.secret_name] = row.secret_value || '';
            exist[row.secret_name] = true;
          });
          setValues(map);
          setStored(exist);
        }
        setLoading(false);
      });
  }, [open, connectorId]);

  // Compute validation errors for filled-in fields
  const errors = useMemo(() => {
    const out: Record<string, string | null> = {};
    secrets.forEach((s) => {
      const v = (values[s.name] || '').trim();
      if (!v) {
        out[s.name] = null; // empty → no inline error (handled at save)
        return;
      }
      out[s.name] = ruleFor(s.name).validate(v);
    });
    return out;
  }, [values, secrets]);

  const hasBlockingError = Object.values(errors).some((e) => !!e);
  const missingRequired = secrets.filter(
    (s) => s.required && !stored[s.name] && !(values[s.name] || '').trim(),
  );

  const handleSave = async () => {
    if (hasBlockingError) {
      toast.error('Corrigez les champs en erreur avant d\'enregistrer.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const rows = secrets
      .filter((s) => values[s.name] && values[s.name].trim().length > 0)
      .map((s) => ({
        connector: connectorId,
        secret_name: s.name,
        secret_value: values[s.name].trim(),
        updated_by: user?.id ?? null,
      }));

    if (rows.length === 0) {
      toast.warning('Aucune valeur à enregistrer');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('social_api_credentials')
      .upsert(rows, { onConflict: 'connector,secret_name' });

    setSaving(false);
    if (error) {
      toast.error('Échec : ' + error.message);
      return;
    }
    toast.success(`${rows.length} secret(s) enregistré(s) pour ${connectorName}`);
    onSaved?.();
    onOpenChange(false);
  };

  const handleDelete = async (name: string) => {
    const { error } = await supabase
      .from('social_api_credentials')
      .delete()
      .eq('connector', connectorId)
      .eq('secret_name', name);
    if (error) {
      toast.error('Suppression impossible : ' + error.message);
      return;
    }
    setStored((p) => ({ ...p, [name]: false }));
    setValues((p) => ({ ...p, [name]: '' }));
    toast.success(`${name} supprimé`);
    onSaved?.();
  };

  const openRotateDialog = () => {
    setRotateAction('rotate');
    setRotateReason('');
    setRotateDialogOpen(true);
  };

  const handleRotate = async () => {
    const reason = rotateReason.trim();
    if (reason.length < 5) {
      toast.error('Indiquez un motif (au moins 5 caractères) pour tracer cette action.');
      return;
    }
    const storedNames = Object.keys(stored).filter((n) => stored[n]);
    setRotating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const actionLabel = rotateAction === 'revoke' ? 'Révocation' : 'Rotation';
    const noteText = `${actionLabel} — ${reason}`;

    if (storedNames.length === 0) {
      // No stored secrets — log a single audit entry to track the intent
      await supabase.from('social_api_audit_log').insert([{
        connector: connectorId,
        secret_name: '(aucun)',
        action: rotateAction,
        performed_by: user?.id ?? null,
        notes: noteText,
      }]);
      setRotating(false);
      setRotateDialogOpen(false);
      setRotationMode(rotateAction === 'rotate');
      toast.info('Aucun secret stocké — action consignée dans le journal.');
      onSaved?.();
      return;
    }

    await supabase.from('social_api_audit_log').insert(
      storedNames.map((name) => ({
        connector: connectorId,
        secret_name: name,
        action: rotateAction,
        performed_by: user?.id ?? null,
        notes: noteText,
      })),
    );
    const { error } = await supabase
      .from('social_api_credentials')
      .delete()
      .eq('connector', connectorId)
      .in('secret_name', storedNames);
    setRotating(false);
    if (error) {
      toast.error(`${actionLabel} impossible : ` + error.message);
      return;
    }
    const cleared: Record<string, boolean> = {};
    storedNames.forEach((n) => (cleared[n] = false));
    setStored((p) => ({ ...p, ...cleared }));
    const clearedVals: Record<string, string> = {};
    storedNames.forEach((n) => (clearedVals[n] = ''));
    setValues((p) => ({ ...p, ...clearedVals }));
    setRotationMode(rotateAction === 'rotate');
    setRotateDialogOpen(false);
    toast.success(
      rotateAction === 'rotate'
        ? `${storedNames.length} secret(s) révoqué(s). Saisissez les nouvelles valeurs.`
        : `${storedNames.length} secret(s) révoqué(s) définitivement.`,
    );
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Configurer {connectorName}
          </DialogTitle>
          <DialogDescription>
            Collez les paramètres reçus de l'équipe Com / du prestataire. Les valeurs
            sont <strong>masquées par défaut</strong>, stockées de façon sécurisée
            (admin uniquement). Laissez un champ vide pour ne rien modifier.
          </DialogDescription>
        </DialogHeader>

        {/* Non-technical guidance banner */}
        <div className="rounded-md border bg-blue-50 border-blue-200 px-3 py-2 text-xs text-blue-900 flex gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div><strong>Aide équipe Com :</strong> chaque champ ci-dessous a une infobulle expliquant à quoi il sert et à quoi ressemble une valeur correcte.</div>
            <div>Si une valeur ne passe pas la validation, c'est qu'elle a probablement été tronquée à la copie. Recopiez-la depuis le portail développeur.</div>
          </div>
        </div>

        {Object.values(stored).some(Boolean) && (
          <div className="flex items-center justify-between rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-900">
            <div className="flex items-center gap-2">
              <RotateCw className="h-4 w-4" />
              <span>Rotation périodique recommandée tous les 90 jours.</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs border-purple-300"
              onClick={handleRotate}
            >
              <RotateCw className="h-3 w-3 mr-1" />
              Régénérer / révoquer
            </Button>
          </div>
        )}

        {rotationMode && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            🔄 Mode rotation actif — saisissez les <strong>nouvelles</strong> valeurs ci-dessous puis cliquez sur Enregistrer.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {secrets.map((s) => {
              const visible = reveal[s.name];
              const isStored = stored[s.name];
              const rule = ruleFor(s.name);
              const value = values[s.name] || '';
              const err = errors[s.name];
              const ok = value.trim().length > 0 && !err;
              return (
                <div key={s.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={s.name} className="text-sm">
                      {s.label}
                      <code className="block text-[10px] text-muted-foreground font-normal">
                        {s.name}
                      </code>
                    </Label>
                    <div className="flex items-center gap-1">
                      <Badge variant={s.required ? 'default' : 'outline'} className="text-[10px]">
                        {s.required ? 'Requis' : 'Optionnel'}
                      </Badge>
                      {isStored && (
                        <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
                          enregistré
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Non-technical hint */}
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{rule.hint}</span>
                  </p>

                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <Input
                        id={s.name}
                        type={visible ? 'text' : 'password'}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={
                          isStored
                            ? '•••••••• (laisser vide = inchangé)'
                            : rule.example
                              ? `Ex : ${rule.example.slice(0, 28)}…`
                              : 'Coller la valeur'
                        }
                        value={value}
                        onChange={(e) =>
                          setValues((p) => ({ ...p, [s.name]: e.target.value }))
                        }
                        className={
                          err
                            ? 'border-red-400 focus-visible:ring-red-400 pr-9'
                            : ok
                              ? 'border-emerald-400 focus-visible:ring-emerald-400 pr-9'
                              : 'pr-9'
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setReveal((p) => ({ ...p, [s.name]: !visible }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={visible ? 'Masquer la valeur' : 'Afficher la valeur'}
                      >
                        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {isStored && (
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => handleDelete(s.name)}
                        title="Supprimer ce secret"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>

                  {err && (
                    <p className="text-[11px] text-red-700 flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{err}</span>
                    </p>
                  )}
                  {ok && (
                    <p className="text-[11px] text-emerald-700 flex items-start gap-1">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>Format valide</span>
                    </p>
                  )}
                </div>
              );
            })}

            {missingRequired.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  Champs requis manquants :{' '}
                  <strong>{missingRequired.map((m) => m.label).join(', ')}</strong>.
                  Vous pouvez enregistrer partiellement, mais le connecteur restera{' '}
                  <em>partiel</em>.
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || hasBlockingError}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
