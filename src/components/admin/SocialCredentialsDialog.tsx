import { useEffect, useState } from 'react';
import { Loader2, KeyRound, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
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

  const handleSave = async () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Configurer {connectorName}
          </DialogTitle>
          <DialogDescription>
            Saisissez les secrets API. Stockés de manière sécurisée (RLS admin
            uniquement). Laissez vide pour ne pas modifier.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {secrets.map((s) => {
              const visible = reveal[s.name];
              const isStored = stored[s.name];
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
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <Input
                        id={s.name}
                        type={visible ? 'text' : 'password'}
                        autoComplete="off"
                        placeholder={isStored ? '•••••••• (laisser vide = inchangé)' : 'Coller la valeur'}
                        value={values[s.name] || ''}
                        onChange={(e) =>
                          setValues((p) => ({ ...p, [s.name]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setReveal((p) => ({ ...p, [s.name]: !visible }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
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
