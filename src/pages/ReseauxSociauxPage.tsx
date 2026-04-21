import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, AlertTriangle, Users, MessageSquare, Heart, Share2, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useVipAccountStatuses, useTopPosts, useSocialKpis, useEngagementTimeline, useCollectSocialNow } from '@/hooks/useReseauxSociaux';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const platformColors: Record<string, string> = {
  twitter: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  linkedin: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  facebook: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
};

const statusConfig = {
  active: { label: 'Actif', color: 'bg-emerald-500' },
  warning: { label: '>24h', color: 'bg-amber-500' },
  critical: { label: 'Inactif', color: 'bg-red-500' },
};

export default function ReseauxSociauxPage() {
  const { data: accounts, isLoading: accountsLoading } = useVipAccountStatuses();
  const { data: topPosts, isLoading: postsLoading } = useTopPosts();
  const { data: kpis, isLoading: kpisLoading } = useSocialKpis();
  const { data: timeline } = useEngagementTimeline();
  const collectNow = useCollectSocialNow();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Réseaux Sociaux</h1>
          <p className="text-muted-foreground">Suivi en temps réel des comptes ANSUT</p>
        </div>
        <Button
          onClick={() => collectNow.mutate()}
          disabled={collectNow.isPending}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${collectNow.isPending ? 'animate-spin' : ''}`} />
          Collecter maintenant
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpisLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <KpiCard icon={<MessageSquare className="h-5 w-5" />} label="Posts 24h" value={kpis?.totalPosts || 0} />
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Engagement moy." value={kpis?.avgEngagement || 0} />
            <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Posts critiques" value={kpis?.criticalCount || 0} accent />
            <KpiCard icon={<Users className="h-5 w-5" />} label="Comptes actifs" value={kpis?.activeVips || 0} />
          </>
        )}
      </div>

      <Tabs defaultValue="comptes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comptes">Comptes VIP</TabsTrigger>
          <TabsTrigger value="top-posts">Top Posts</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Comptes VIP */}
        <TabsContent value="comptes">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {accountsLoading ? (
              [...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
            ) : (
              (accounts || []).map((account) => (
                <Card key={account.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-3 h-3 m-3 rounded-full ${statusConfig[account.status].color}`} />
                  <CardContent className="pt-4 pb-3 px-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={platformColors[account.plateforme] || ''}>
                        {account.plateforme}
                      </Badge>
                      <span className="font-medium text-sm truncate">{account.nom}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">@{account.identifiant}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span>{account.posts_24h} posts (24h)</span>
                      <span className="text-muted-foreground">
                        {account.derniere_publication
                          ? formatDistanceToNow(new Date(account.derniere_publication), { addSuffix: true, locale: fr })
                          : 'Jamais'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Top Posts */}
        <TabsContent value="top-posts">
          <div className="space-y-3">
            {postsLoading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : (
              (topPosts || []).map((post) => (
                <Card key={post.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={platformColors[post.plateforme] || ''}>
                            {post.plateforme}
                          </Badge>
                          <span className="text-sm font-medium">{post.auteur}</span>
                          {post.date_publication && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.date_publication), { addSuffix: true, locale: fr })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{post.contenu}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes_count || 0}</span>
                          <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{post.shares_count || 0}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.comments_count || 0}</span>
                          <span className="font-medium text-primary">Score: {post.engagement_score}</span>
                        </div>
                      </div>
                      {post.url_original && (
                        <a href={post.url_original} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Engagement Chart */}
        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Engagement par plateforme (7 jours)</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline && timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="twitter" name="X / Twitter" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="linkedin" name="LinkedIn" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="facebook" name="Facebook" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">Pas encore de données d'engagement</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4 px-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${accent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
