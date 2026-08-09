import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SocialCredentialsDialog } from '@/components/admin/SocialCredentialsDialog';
import { SocialApiAuditLog } from '@/components/admin/SocialApiAuditLog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

type SecretState = {
  name: string;
  label: string;
  required: boolean;
  present: boolean;
};

type ConnectorReport = {
  id: string;
  name: string;
  category: 'social' | 'messaging';
  scope: string;
  secrets: SecretState[];
  status: 'ok' | 'partial' | 'missing';
  missing: string[];
  notes: string;
  docs: string;
};

const STATUS_META: Record<
  ConnectorReport['status'],
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  ok: {
    label: 'Opérationnel',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    Icon: CheckCircle2,
  },
  partial: {
    label: 'Partiel',
    className: 'bg-attention-soft text-attention border-attention-border',
    Icon: AlertTriangle,
  },
  missing: {
    label: 'Non configuré',
    className: 'bg-red-100 text-red-800 border-red-300',
    Icon: XCircle,
  },
};

export default function ConnecteursSociauxPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<ConnectorReport[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ConnectorReport | null>(null);

  const load = async () => {
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke(
      'check-social-connectors',
    );
    if (fnError || !data) {
      setError(fnError?.message || 'Impossible de récupérer le rapport');
      setReport([]);
    } else {
      setReport(data.connectors || []);
      setGeneratedAt(data.generated_at || null);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success('État des connecteurs actualisé');
  };

  const totals = {
    total: report.length,
    ok: report.filter((c) => c.status === 'ok').length,
    partial: report.filter((c) => c.status === 'partial').length,
    missing: report.filter((c) => c.status === 'missing').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour Administration
            </Link>
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Connecteurs sociaux
          </h1>
          <p className="text-muted-foreground mt-1">
            État des secrets et autorisations pour chaque réseau institutionnel ANSUT.
            Aucune valeur de secret n'est exposée — uniquement leur présence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/guide-com-api">
              📄 Guide Com (imprimable)
            </Link>
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Connecteurs</CardDescription>
            <CardTitle className="text-2xl">{totals.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-700">Opérationnels</CardDescription>
            <CardTitle className="text-2xl text-emerald-700">{totals.ok}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-attention">Partiels</CardDescription>
            <CardTitle className="text-2xl text-attention">{totals.partial}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-red-700">Non configurés</CardDescription>
            <CardTitle className="text-2xl text-red-700">{totals.missing}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {generatedAt && (
        <p className="text-xs text-muted-foreground">
          Dernière vérification : {new Date(generatedAt).toLocaleString('fr-FR')}
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6 text-red-800 text-sm">
            <strong>Erreur : </strong>
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          {report.map((c) => {
            const meta = STATUS_META[c.status];
            const Icon = meta.Icon;
            return (
              <Card key={c.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {c.name}
                        <Badge variant="outline" className="text-xs">
                          {c.category === 'social' ? 'Réseau social' : 'Messagerie'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">{c.scope}</CardDescription>
                    </div>
                    <Badge className={`${meta.className} gap-1 border`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    {c.secrets.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center justify-between text-sm border rounded-md px-3 py-2 bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          {s.present ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : s.required ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-attention" />
                          )}
                          <div>
                            <div className="font-medium">{s.label}</div>
                            <code className="text-xs text-muted-foreground">
                              {s.name}
                            </code>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={s.required ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {s.required ? 'Requis' : 'Optionnel'}
                          </Badge>
                          <span
                            className={`text-xs ${
                              s.present ? 'text-emerald-700' : 'text-muted-foreground'
                            }`}
                          >
                            {s.present ? 'configuré' : 'absent'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {c.notes && (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground italic">{c.notes}</p>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href={c.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Console développeur
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {c.missing.length > 0 && (
                      <span className="text-xs text-red-700">
                        Manquants : {c.missing.join(', ')}
                      </span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => setEditing(c)}
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-2" />
                    Configurer les secrets
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SocialApiAuditLog refreshKey={generatedAt ? new Date(generatedAt).getTime() : 0} />

      <Card className="bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">🔐 Gouvernance des accès</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Jamais de mot de passe partagé d'un compte institutionnel.</p>
          <p>• Toujours via OAuth ou Bearer token applicatif.</p>
          <p>• Rotation des secrets recommandée tous les 90 jours (bouton « Régénérer / révoquer » dans chaque connecteur).</p>
          <p>• Toute action est tracée dans le journal d'audit ci-dessus (jamais la valeur en clair).</p>
        </CardContent>
      </Card>

      {editing && (
        <SocialCredentialsDialog
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          connectorId={editing.id}
          connectorName={editing.name}
          secrets={editing.secrets.map((s) => ({
            name: s.name,
            label: s.label,
            required: s.required,
          }))}
          onSaved={load}
        />
      )}
    </div>
  );
}
