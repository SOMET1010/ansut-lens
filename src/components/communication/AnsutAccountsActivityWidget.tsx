import React from 'react';
import {
  Linkedin, Twitter, Globe, Facebook, RefreshCw, AlertTriangle, CheckCircle2,
  ExternalLink, TrendingUp, TrendingDown, Heart, MessageCircle, Share2, Eye,
  Sparkles, Target, Megaphone, ShieldAlert, Lightbulb, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAnsutAccountsActivity, type AccountActivity } from '@/hooks/useAnsutAccountsActivity';

const platformIcons: Record<string, React.ElementType> = {
  linkedin: Linkedin, facebook: Facebook, twitter: Twitter, x: Twitter, site_web: Globe,
};

const PILIER_LABELS: Record<string, string> = {
  connectivite: 'Connectivité', inclusion: 'Inclusion', innovation: 'Innovation',
  service_universel: 'Service Universel', eservices: 'eServices',
  institutionnel: 'Institutionnel', evenementiel: 'Événementiel', autre: 'Autre',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
    : score >= 50 ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
    : 'bg-red-500/15 text-red-600 border-red-500/30';
  const label = score >= 70 ? 'Bon' : score >= 50 ? 'Moyen' : 'Faible';
  return <Badge className={`${color} border`}>{score}/100 · {label}</Badge>;
}

function StatutBadge({ statut }: { statut: AccountActivity['statut_activite'] }) {
  const map = {
    actif: { c: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', l: 'Actif' },
    faible: { c: 'bg-amber-500/10 text-amber-600 border-amber-500/30', l: 'Faible' },
    dormant: { c: 'bg-red-500/10 text-red-600 border-red-500/30', l: 'Dormant' },
  };
  const s = map[statut];
  return <Badge variant="outline" className={s.c}>{s.l}</Badge>;
}

function AccountRow({ account }: { account: AccountActivity }) {
  const Icon = platformIcons[account.plateforme] || Globe;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
      <div className="p-2 rounded-lg bg-background"><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{account.nom}</p>
          {account.url_profil && (
            <a href={account.url_profil} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
            </a>
          )}
          <StatutBadge statut={account.statut_activite} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
          <span>{account.publications_24h} pub/24h</span>
          <span>·</span>
          <span>{account.publications_7j} pub/7j</span>
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{account.total_likes}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{account.total_comments}</span>
          <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{account.total_shares}</span>
          {account.total_vues > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{account.total_vues}</span>}
          <span>· Engagement {account.taux_engagement}%</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-xs font-semibold flex items-center gap-1 justify-end ${account.variation_vs_veille >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {account.variation_vs_veille >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {account.variation_vs_veille >= 0 ? '+' : ''}{account.variation_vs_veille}% vs veille
        </div>
        {account.derniere_publication && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(account.derniere_publication), { addSuffix: true, locale: fr })}
          </p>
        )}
      </div>
    </div>
  );
}

type DiagCheck = { step: string; status: 'ok' | 'warn' | 'fail' | 'skip'; detail: string; durationMs?: number };
type DiagAccount = {
  id: string; nom: string; plateforme: string; identifiant: string; url_profil: string | null;
  globalStatus: 'healthy' | 'degraded' | 'blocked' | 'no_data';
  diagnosis: string; recommendation: string;
  checks: DiagCheck[];
  publications_24h: number; publications_7j: number; derniere_publication: string | null;
};
type DiagResponse = {
  summary: { total: number; healthy: number; blocked: number; no_data: number; degraded: number;
    firecrawl_configured: boolean; twitter_api_configured: boolean; linkedin_oauth_configured: boolean; };
  results: DiagAccount[]; generated_at: string;
};

export function AnsutAccountsActivityWidget() {
  const { data, isLoading, refetch } = useAnsutAccountsActivity();
  const [collecting, setCollecting] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<any>(null);
  const [diag, setDiag] = React.useState<DiagResponse | null>(null);
  const [diagLoading, setDiagLoading] = React.useState(false);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const { error } = await supabase.functions.invoke('collecte-institutionnelle');
      if (error) throw error;
      toast.success('Collecte lancée');
      setTimeout(() => refetch(), 5000);
    } catch (err: any) {
      toast.error(err.message || 'Erreur collecte');
    } finally { setCollecting(false); }
  };

  const handleDiagnostic = async () => {
    setDiagLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('diagnostic-comptes-ansut');
      if (error) throw error;
      setDiag(res as DiagResponse);
      toast.success('Diagnostic terminé');
    } catch (err: any) {
      toast.error(err.message || 'Erreur diagnostic');
    } finally { setDiagLoading(false); }
  };

  const handleAnalyze = async () => {
    if (!data) return;
    setAnalyzing(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('analyse-activite-ansut', {
        body: {
          visibilityScore: data.visibilityScore,
          totalPubs: data.totalPubs,
          totalPubs7j: data.totalPubs7j,
          variationGlobale: data.variationGlobale,
          networks: data.networks,
          sentimentBreakdown: data.sentimentBreakdown,
          formatCounts: data.formatCounts,
          piliers: data.piliers,
          alerts: data.alerts,
          accounts: data.accounts.map(a => ({
            nom: a.nom, plateforme: a.plateforme,
            publications_24h: a.publications_24h, publications_7j: a.publications_7j,
            taux_engagement: a.taux_engagement, statut_activite: a.statut_activite,
          })),
        },
      });
      if (error) throw error;
      setAnalysis(res?.analysis);
      toast.success('Analyse IA générée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur analyse IA');
    } finally { setAnalyzing(false); }
  };

  if (isLoading || !data) {
    return (
      <Card className="col-span-full">
        <CardHeader><CardTitle>Activité numérique ANSUT</CardTitle></CardHeader>
        <CardContent><div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div></CardContent>
      </Card>
    );
  }

  const totalSentiment = data.sentimentBreakdown.total;
  const totalFormat = (data.formatCounts.video || 0) + (data.formatCounts.image || 0) + (data.formatCounts.texte || 0) || 1;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <Activity className="h-5 w-5 text-primary" />
              Cockpit Réputationnel ANSUT — 24h / 7j
              <ScoreBadge score={data.visibilityScore} />
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalPubs} pub/24h ({data.variationGlobale >= 0 ? '+' : ''}{data.variationGlobale}% vs veille) · {data.totalPubs7j} pub/7j · {data.accounts.length} comptes suivis · {data.inactiveCount} dormant{data.inactiveCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCollect} disabled={collecting} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${collecting ? 'animate-spin' : ''}`} />
              Collecter
            </Button>
            <Button size="sm" onClick={handleAnalyze} disabled={analyzing} className="gap-1.5">
              <Sparkles className={`h-3.5 w-3.5 ${analyzing ? 'animate-pulse' : ''}`} />
              {analyzing ? 'Analyse…' : 'Analyse IA'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className="space-y-1.5">
            {data.alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-md text-xs border ${
                a.niveau === 'critique' ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                : a.niveau === 'attention' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
              }`}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="font-medium">{a.message}</span>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="comptes" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="comptes">Comptes</TabsTrigger>
            <TabsTrigger value="reseaux">Réseaux</TabsTrigger>
            <TabsTrigger value="sentiment">Réputation</TabsTrigger>
            <TabsTrigger value="alignement">Alignement</TabsTrigger>
            <TabsTrigger value="ia">Analyse IA</TabsTrigger>
          </TabsList>

          {/* COMPTES */}
          <TabsContent value="comptes" className="space-y-2 mt-3">
            {data.accounts
              .sort((a, b) => a.publications_7j - b.publications_7j)
              .map(a => <AccountRow key={a.id} account={a} />)}
          </TabsContent>

          {/* RESEAUX */}
          <TabsContent value="reseaux" className="space-y-2 mt-3">
            {data.networks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée par réseau</p>
            ) : data.networks.map((n: any) => {
              const Icon = platformIcons[n.plateforme] || Globe;
              return (
                <div key={n.plateforme} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                  <Icon className="h-5 w-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{n.plateforme}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.publications} pub · {n.likes} ❤ · {n.comments} 💬 · {n.shares} 🔁 · {n.vues} 👁
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{n.taux_engagement}%</p>
                    <p className="text-[10px] text-muted-foreground">engagement</p>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* SENTIMENT */}
          <TabsContent value="sentiment" className="space-y-3 mt-3">
            {totalSentiment === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Aucun sentiment analysé sur la période</p>
            ) : (
              <>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>🟢 Positif</span><span className="font-medium">{data.sentimentBreakdown.positif}%</span></div>
                    <Progress value={data.sentimentBreakdown.positif} className="h-2 [&>div]:bg-emerald-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>🟠 Neutre</span><span className="font-medium">{data.sentimentBreakdown.neutre}%</span></div>
                    <Progress value={data.sentimentBreakdown.neutre} className="h-2 [&>div]:bg-amber-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>🔴 Négatif</span><span className="font-medium">{data.sentimentBreakdown.negatif}%</span></div>
                    <Progress value={data.sentimentBreakdown.negatif} className="h-2 [&>div]:bg-red-500" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Basé sur {totalSentiment} publication(s) avec sentiment analysé sur 7 jours.</p>
              </>
            )}
          </TabsContent>

          {/* ALIGNEMENT */}
          <TabsContent value="alignement" className="space-y-3 mt-3">
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Répartition par pilier ANSUT (7j)</p>
              <div className="space-y-1.5">
                {data.piliers.map(p => (
                  <div key={p.pilier}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{PILIER_LABELS[p.pilier] || p.pilier}</span>
                      <span className="font-medium">{p.pct}% ({p.count})</span>
                    </div>
                    <Progress value={p.pct} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Répartition formats</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {(['video', 'image', 'texte'] as const).map(f => (
                  <div key={f} className="p-2 rounded-md bg-muted/40 border">
                    <p className="text-lg font-bold">{Math.round(((data.formatCounts[f] || 0) / totalFormat) * 100)}%</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* IA */}
          <TabsContent value="ia" className="space-y-3 mt-3">
            {!analysis ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Lancez l'analyse IA pour obtenir verdict, risques et recommandations stratégiques.</p>
                <Button onClick={handleAnalyze} disabled={analyzing} className="mt-3 gap-1.5" size="sm">
                  <Sparkles className="h-3.5 w-3.5" /> Générer l'analyse
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={
                      analysis.niveau_alerte === 'rouge' ? 'border-red-500 text-red-600'
                      : analysis.niveau_alerte === 'orange' ? 'border-amber-500 text-amber-600'
                      : 'border-emerald-500 text-emerald-600'
                    }>{(analysis.niveau_alerte || '').toUpperCase()}</Badge>
                    <span className="font-medium">Verdict</span>
                  </div>
                  <p className="text-sm">{analysis.verdict_global}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <Section icon={CheckCircle2} title="Ce qui fonctionne" items={analysis.ce_qui_fonctionne} color="text-emerald-600" />
                  <Section icon={AlertTriangle} title="Ce qui échoue" items={analysis.ce_qui_echoue} color="text-red-600" />
                  <Section icon={Target} title="Manques critiques" items={analysis.manques_critiques} color="text-amber-600" />
                  <Section icon={ShieldAlert} title="Risques réputation" items={analysis.risques_reputation} color="text-red-600" />
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-amber-500" /><span className="font-medium text-sm">Recommandations</span></div>
                  <div className="space-y-1.5">
                    {(analysis.recommandations || []).map((r: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className={
                          r.priorite === 'haute' ? 'border-red-500 text-red-600'
                          : r.priorite === 'moyenne' ? 'border-amber-500 text-amber-600'
                          : 'border-blue-500 text-blue-600'
                        }>{r.priorite}</Badge>
                        <span className="flex-1">{r.action}</span>
                        <span className="text-muted-foreground">{r.delai}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {analysis.campagne_prioritaire && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30">
                    <div className="flex items-center gap-2 mb-1"><Megaphone className="h-4 w-4 text-primary" /><span className="font-medium">Campagne prioritaire</span></div>
                    <p className="text-sm">{analysis.campagne_prioritaire}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Section({ icon: Icon, title, items, color }: { icon: React.ElementType; title: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div className="p-3 rounded-lg border bg-muted/20">
      <div className="flex items-center gap-2 mb-2"><Icon className={`h-4 w-4 ${color}`} /><span className="font-medium text-sm">{title}</span></div>
      <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}
