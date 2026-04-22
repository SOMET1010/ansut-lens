import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Eye, Megaphone, BarChart3, Users, RefreshCw, Loader2,
  TrendingUp, TrendingDown, Minus, ExternalLink, Linkedin, Twitter, Globe,
  Building, Newspaper, MessageCircle, Layers, ArrowLeft
} from 'lucide-react';
import {
  usePublicationsInstitutionnelles,
  useEchoMetrics,
  usePartDeVoix,
  useVipComptes,
  useVipAlertes,
  useCollecteInstitutionnelle,
  useAnalyserEcho,
  useAutoVeilleStats,
  useArchitectureStats,
} from '@/hooks/useAutoVeille';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const platformIcon = (p: string) => {
  if (p === 'linkedin') return <Linkedin className="h-4 w-4" />;
  if (p === 'twitter' || p === 'x') return <Twitter className="h-4 w-4" />;
  return <Globe className="h-4 w-4" />;
};

const resonanceColor = (score: number) => {
  if (score >= 70) return 'text-emerald-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
};

export default function AutoVeillePage() {
  const { data: stats, isLoading: statsLoading } = useAutoVeilleStats();
  const { data: publications, isLoading: pubLoading } = usePublicationsInstitutionnelles();
  const { data: echoMetrics } = useEchoMetrics();
  const { data: partDeVoix } = usePartDeVoix();
  const { data: vipComptes } = useVipComptes();
  const { data: vipAlertes } = useVipAlertes();
  const { data: archStats, isLoading: archLoading } = useArchitectureStats();
  const collecte = useCollecteInstitutionnelle();
  const analyser = useAnalyserEcho();

  const voixChartData = (partDeVoix || []).slice(0, 6).reverse().map((v: any) => ({
    periode: v.periode,
    'Publications ANSUT': v.nb_publications_ansut,
    'Articles Presse': v.nb_articles_presse,
    'Mentions Social': v.nb_mentions_social,
  }));

  const latestVoix = partDeVoix?.[0];
  const pieData = latestVoix ? [
    { name: 'Communication ANSUT', value: latestVoix.nb_publications_ansut, color: 'hsl(var(--primary))' },
    { name: 'Écho médiatique (Presse)', value: latestVoix.nb_articles_presse, color: 'hsl(var(--chart-2))' },
    { name: 'Mentions sociales', value: latestVoix.nb_mentions_social, color: 'hsl(var(--chart-3))' },
  ] : [];

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Eye className="h-7 w-7 text-primary" />
              Auto-Veille Institutionnelle
            </h1>
          <p className="text-muted-foreground mt-1">
            Miroir de performance : mesurez la résonance de vos propres publications
          </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => collecte.mutate('all')}
            disabled={collecte.isPending}
          >
            {collecte.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Collecter
          </Button>
          <Button
            onClick={() => analyser.mutate({ mode: 'batch' })}
            disabled={analyser.isPending}
          >
            {analyser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
            Analyser Écho
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Publications</p>
            {statsLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <p className="text-2xl font-bold">{stats?.totalPublications || 0}</p>
            )}
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Résonance Moy.</p>
            {statsLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <p className={`text-2xl font-bold ${resonanceColor(stats?.avgResonance || 0)}`}>
                {stats?.avgResonance || 0}/100
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Ratio Écho / Communication</p>
            {statsLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <p className="text-2xl font-bold">
                {stats?.latestVoix?.ratio_earned_owned?.toFixed(1) || '—'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Comptes VIP</p>
            {statsLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <p className="text-2xl font-bold">{stats?.activeVip || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="publications" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="publications">Publications</TabsTrigger>
          <TabsTrigger value="echo">Écho</TabsTrigger>
          <TabsTrigger value="voix">Visibilité Globale</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="vip">VIP</TabsTrigger>
        </TabsList>

        {/* Publications Tab */}
        <TabsContent value="publications" className="space-y-4">
          {pubLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : (publications || []).length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune publication collectée</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ajoutez des comptes VIP puis lancez la collecte pour ingérer vos publications.
                </p>
                <Button onClick={() => collecte.mutate('all')} disabled={collecte.isPending}>
                  Lancer la première collecte
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {(publications || []).map((pub: any) => (
                <Card key={pub.id} className="glass hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {platformIcon(pub.plateforme)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{pub.auteur || 'ANSUT'}</span>
                          <Badge variant="outline" className="text-xs">{pub.plateforme}</Badge>
                          {pub.est_officiel && <Badge className="text-xs bg-primary/20 text-primary">Officiel</Badge>}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {pub.date_publication && formatDistanceToNow(new Date(pub.date_publication), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{pub.contenu}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>❤️ {pub.likes_count}</span>
                          <span>🔄 {pub.shares_count}</span>
                          <span>💬 {pub.comments_count}</span>
                          {pub.url_original && (
                            <a href={pub.url_original} target="_blank" rel="noopener noreferrer" className="ml-auto text-primary hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> Voir
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Echo & Resonance Tab */}
        <TabsContent value="echo" className="space-y-4">
          {(echoMetrics || []).length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune analyse d'écho</h3>
                <p className="text-sm text-muted-foreground">Collectez des publications puis lancez l'analyse Écho.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(echoMetrics || []).map((echo: any) => {
                const pub = echo.publications_institutionnelles;
                // Parse recommandation_ia to separate sentiment and action
                const recommandation = echo.recommandation_ia || '';
                const sentimentMatch = recommandation.match(/(?:Sentiment|Citoyens?|Commentaires?)\s*:\s*([^|]+)/i);
                const actionMatch = recommandation.match(/(?:Action\s*Com|Recommandation|Suggestion)\s*:\s*(.+)/i);
                const sentimentText = sentimentMatch?.[1]?.trim() || (pub?.resume_commentaires);
                const actionText = actionMatch?.[1]?.trim();
                const generalRecommandation = (!sentimentMatch && !actionMatch) ? recommandation : null;

                return (
                  <Card key={echo.id} className="glass">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{pub?.contenu?.substring(0, 100)}</p>
                          <p className="text-xs text-muted-foreground">{pub?.auteur} • {pub?.plateforme}</p>
                        </div>
                        <div className={`text-2xl font-bold ${resonanceColor(Number(echo.score_resonance))}`}>
                          {Math.round(Number(echo.score_resonance))}<span className="text-sm">/100</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center">
                          <p className="text-lg font-semibold">{echo.nb_reprises_presse}</p>
                          <p className="text-xs text-muted-foreground">Reprises presse</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold">{echo.nb_citations_influenceurs}</p>
                          <p className="text-xs text-muted-foreground">Citations influenceurs</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold">{(echo.portee_estimee || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Portée estimée</p>
                        </div>
                      </div>
                      <Progress value={Number(echo.score_resonance)} className="mb-3" />

                      {/* Sentiment citoyens */}
                      {sentimentText && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 mb-2">
                          <MessageCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground mb-0.5">Sentiment citoyens</p>
                            <p className="text-xs text-muted-foreground">{sentimentText}</p>
                          </div>
                        </div>
                      )}

                      {/* Action Com */}
                      {actionText && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 mb-2">
                          <Megaphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground mb-0.5">Action Com recommandée</p>
                            <p className="text-xs text-muted-foreground">{actionText}</p>
                          </div>
                        </div>
                      )}

                      {echo.gap_media && (
                        <p className="text-xs text-destructive mb-1">⚠️ {echo.gap_media}</p>
                      )}
                      {generalRecommandation && (
                        <p className="text-xs text-muted-foreground">💡 {generalRecommandation}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Share of Voice Tab */}
        <TabsContent value="voix" className="space-y-4">
          {latestVoix && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm">Évolution Visibilité Globale</CardTitle>
                </CardHeader>
                <CardContent>
                  {voixChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={voixChartData}>
                        <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="Publications ANSUT" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                        <Bar dataKey="Articles Presse" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
                        <Bar dataKey="Mentions Social" fill="hsl(var(--chart-3))" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Pas encore de données</p>
                  )}
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm">Répartition ce mois</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground py-8">Pas de données ce mois</p>
                  )}
                  {latestVoix.gap_analyse && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">{latestVoix.gap_analyse}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!latestVoix && (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Pas encore de données Visibilité Globale</h3>
                <p className="text-sm text-muted-foreground">Lancez l'analyse Écho en mode batch pour générer le rapport.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Architecture Tab */}
        <TabsContent value="architecture" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Architecture des Sources de Veille
              </CardTitle>
            </CardHeader>
            <CardContent>
              {archLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type de Source</TableHead>
                      <TableHead>Origine</TableHead>
                      <TableHead>Ce mois</TableHead>
                      <TableHead>Utilité pour la Com</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(archStats || []).map((row) => {
                      const IconComp = row.icon === 'building' ? Building
                        : row.icon === 'users' ? Users
                        : row.icon === 'newspaper' ? Newspaper
                        : MessageCircle;
                      return (
                        <TableRow key={row.type}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <IconComp className="h-4 w-4 text-primary" />
                              {row.type}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.origine}</TableCell>
                          <TableCell>
                            <Badge variant={row.count > 0 ? 'default' : 'secondary'}>
                              {row.count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.utilite}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vip" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VIP Comptes */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Comptes VIP Surveillés
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(vipComptes || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun compte VIP configuré. Ajoutez-en depuis le Shadow Tracker.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(vipComptes || []).map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50">
                        <div className="p-1.5 rounded bg-primary/10">{platformIcon(c.plateforme)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.nom}</p>
                          <p className="text-xs text-muted-foreground">{c.fonction} • @{c.identifiant}</p>
                        </div>
                        <Badge variant={c.actif ? 'default' : 'secondary'} className="text-xs">
                          {c.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* VIP Alertes */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  🔔 Alertes VIP Récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(vipAlertes || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune alerte VIP pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(vipAlertes || []).slice(0, 10).map((a: any) => (
                      <div key={a.id} className="p-2 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={a.niveau_risque === 'critique' ? 'destructive' : a.niveau_risque === 'important' ? 'default' : 'secondary'} className="text-xs">
                            {a.niveau_risque}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {a.vip_comptes?.nom} • {a.plateforme}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {a.created_at && formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">{a.contenu}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
