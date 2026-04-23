import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Clock, Database, FileWarning, CheckCircle2, XCircle,
  Save, Loader2, Calendar, Filter, Settings2, Info, Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  useFreshnessStats, useFreshnessSettings, useUpdateFreshnessSettings,
  type FreshnessSettings,
} from '@/hooks/useFreshnessSettings';

export default function FreshnessPage() {
  const { data: stats, isLoading: statsLoading } = useFreshnessStats();
  const { data: settings, isLoading: settingsLoading } = useFreshnessSettings();
  const update = useUpdateFreshnessSettings();
  const [draft, setDraft] = useState<FreshnessSettings | null>(null);

  useEffect(() => {
    if (settings && !draft) setDraft(settings);
  }, [settings, draft]);

  const dirty = draft && settings && (
    draft.default_window_hours !== settings.default_window_hours ||
    draft.publication_tolerance_hours !== settings.publication_tolerance_hours ||
    draft.max_articles !== settings.max_articles ||
    draft.drop_without_pub_date !== settings.drop_without_pub_date ||
    draft.alert_drop_rate_pct !== settings.alert_drop_rate_pct ||
    draft.alert_min_raw_articles !== settings.alert_min_raw_articles
  );

  const filteredOut = stats ? stats.recent_ingest_old_pub : 0;
  const filterRate = stats && stats.ingested_24h > 0
    ? Math.round((filteredOut / stats.ingested_24h) * 100)
    : 0;

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            Fraîcheur des données
          </h1>
          <p className="text-muted-foreground">
            Comprendre, mesurer et ajuster les filtres de pertinence temporelle des articles.
          </p>
        </div>
      </div>

      {/* Pédagogie : created_at vs date_publication */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Comment fonctionne la fraîcheur ?
          </CardTitle>
          <CardDescription>
            Deux dates coexistent pour chaque article. Confondre les deux entraîne la diffusion d'informations obsolètes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold">created_at — date d'ingestion</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Moment où l'article a été <strong>collecté</strong> par notre moteur de veille
              (Perplexity, RSS, Firecrawl). Indique la fraîcheur côté plateforme, pas côté info.
            </p>
            <Badge variant="secondary" className="text-xs">Toujours présent</Badge>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <h3 className="font-semibold">date_publication — date de l'événement</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Date à laquelle la <strong>source d'origine</strong> (média, blog, organisme) a publié l'article.
              C'est elle qui détermine si l'info est récente ou non.
            </p>
            <Badge variant="secondary" className="text-xs">Parfois manquante</Badge>
          </div>

          <Alert className="md:col-span-2 border-amber-500/30 bg-amber-500/5">
            <FileWarning className="h-4 w-4 text-amber-600" />
            <AlertTitle>Cas problématique</AlertTitle>
            <AlertDescription className="text-sm">
              Un article publié en <strong>juin 2025</strong> mais ré-indexé aujourd'hui aurait un
              <code className="mx-1 px-1 rounded bg-muted">created_at</code> récent.
              Sans filtre sur <code className="mx-1 px-1 rounded bg-muted">date_publication</code>,
              il apparaîtrait dans la Matinale du jour comme une info fraîche. C'est ce que ce module empêche.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Stats live */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Mesure en direct (24 dernières heures)
          </CardTitle>
          <CardDescription>
            Combien d'articles ont été ingérés, et combien sont écartés faute de publication récente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading || !stats ? (
            <div className="grid gap-3 md:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <StatTile
                  icon={<Database className="h-4 w-4" />}
                  label="Articles ingérés"
                  value={stats.ingested_24h}
                  hint="created_at < 24h"
                />
                <StatTile
                  icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  label="Publiés récemment"
                  value={stats.published_24h}
                  hint="date_publication < 24h"
                  tone="success"
                />
                <StatTile
                  icon={<XCircle className="h-4 w-4 text-amber-600" />}
                  label="Écartés (trop anciens)"
                  value={filteredOut}
                  hint={`${filterRate}% des ingérés`}
                  tone="warning"
                />
                <StatTile
                  icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
                  label="Sans date"
                  value={stats.no_pub_date}
                  hint="Sur l'ensemble"
                />
              </div>

              <Separator className="my-4" />

              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <FenetreStat label="48 dernières heures" count={stats.published_48h} />
                <FenetreStat label="7 derniers jours" count={stats.published_7d} />
                <FenetreStat label="Total en base" count={stats.total} muted />
              </div>

              {stats.newest_recent && (
                <div className="mt-4 text-xs text-muted-foreground flex flex-wrap gap-3">
                  <span>
                    Article le + récent ingéré :{' '}
                    <strong className="text-foreground">
                      {format(new Date(stats.newest_recent), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </strong>
                  </span>
                  {stats.oldest_recent && (
                    <span>
                      Le + ancien (sur ingérés 24h) :{' '}
                      <strong className="text-foreground">
                        {format(new Date(stats.oldest_recent), 'dd MMM yyyy', { locale: fr })}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Paramètres */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Paramètres de filtrage
          </CardTitle>
          <CardDescription>
            Ces réglages s'appliquent à la Matinale, aux briefings et aux digests automatiques.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {settingsLoading || !draft ? (
            <Skeleton className="h-48" />
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="window">
                    Fenêtre par défaut (heures)
                  </Label>
                  <Input
                    id="window"
                    type="number"
                    min={1}
                    max={720}
                    value={draft.default_window_hours}
                    onChange={(e) => setDraft({ ...draft, default_window_hours: Number(e.target.value) || 24 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Plage d'âge maximale d'un article pour être considéré « frais ». Recommandé : 24h.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tolerance">
                    Tolérance de publication (heures)
                  </Label>
                  <Input
                    id="tolerance"
                    type="number"
                    min={0}
                    max={168}
                    value={draft.publication_tolerance_hours}
                    onChange={(e) => setDraft({ ...draft, publication_tolerance_hours: Number(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Marge ajoutée à la fenêtre pour conserver les articles publiés peu avant la fenêtre d'ingestion.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max">
                    Nombre max d'articles retenus
                  </Label>
                  <Input
                    id="max"
                    type="number"
                    min={1}
                    max={100}
                    value={draft.max_articles}
                    onChange={(e) => setDraft({ ...draft, max_articles: Number(e.target.value) || 20 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite du volume injecté dans l'IA pour la synthèse Matinale.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="drop">
                    Articles sans date de publication
                  </Label>
                  <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
                    <span className="text-sm">
                      {draft.drop_without_pub_date ? 'Écarter automatiquement' : 'Conserver (par défaut)'}
                    </span>
                    <Switch
                      id="drop"
                      checked={draft.drop_without_pub_date}
                      onCheckedChange={(v) => setDraft({ ...draft, drop_without_pub_date: v })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Activez si vos sources fournissent toujours une date fiable.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Alertes automatiques */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <FileWarning className="h-4 w-4 text-amber-600" />
                  Alerte automatique de fraîcheur dégradée
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Une alerte est créée dans le centre de notifications dès qu'une Matinale est générée
                  avec un taux d'articles écartés (date de publication trop ancienne) supérieur au seuil défini.
                  Niveau <strong>critique</strong> au-delà de 70%.
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="alert-rate">Seuil de déclenchement (%)</Label>
                    <Input
                      id="alert-rate"
                      type="number"
                      min={0}
                      max={100}
                      value={draft.alert_drop_rate_pct}
                      onChange={(e) => setDraft({ ...draft, alert_drop_rate_pct: Number(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pourcentage minimum d'articles écartés pour générer une alerte. Recommandé : 40%.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alert-min">Volume minimum d'articles bruts</Label>
                    <Input
                      id="alert-min"
                      type="number"
                      min={1}
                      max={100}
                      value={draft.alert_min_raw_articles}
                      onChange={(e) => setDraft({ ...draft, alert_min_raw_articles: Number(e.target.value) || 1 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Évite les fausses alertes lorsque la base contient peu d'articles. Recommandé : 5.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-3 w-3" />
                  Modifications appliquées immédiatement aux prochaines générations.
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => settings && setDraft(settings)}
                    disabled={!dirty || update.isPending}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => draft && update.mutate(draft)}
                    disabled={!dirty || update.isPending}
                  >
                    {update.isPending
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Save className="h-4 w-4 mr-2" />}
                    Enregistrer
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon, label, value, hint, tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  const toneClasses = {
    default: 'border-border',
    success: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
  };
  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value.toLocaleString('fr-FR')}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function FenetreStat({ label, count, muted }: { label: string; count: number; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${muted ? 'bg-muted/30' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{count.toLocaleString('fr-FR')}</span>
    </div>
  );
}
