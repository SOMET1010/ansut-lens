import { Card, CardContent } from '@/components/ui/card';
import { Users, Database, Bell, Tag, UserPlus, ClipboardList, Clock, Mail, Shield, Presentation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminStats } from '@/hooks/useAdminStats';
import { AdminStatBadge } from '@/components/admin/AdminStatBadge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function getCollecteVariant(derniereCollecte: string | null): 'success' | 'warning' | 'error' | 'muted' {
  if (!derniereCollecte) return 'muted';
  const heuresDepuis = (Date.now() - new Date(derniereCollecte).getTime()) / (1000 * 60 * 60);
  if (heuresDepuis < 6) return 'success';
  if (heuresDepuis < 24) return 'warning';
  return 'error';
}

export default function AdminPage() {
  const { data: stats, isLoading } = useAdminStats();

  const collecteLabel = stats?.derniereCollecte
    ? formatDistanceToNow(new Date(stats.derniereCollecte), { addSuffix: true, locale: fr })
    : 'Jamais';

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">Configuration et gestion du système</p>
      </div>

      {/* Section Gestion Opérationnelle */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-primary" />
          <h2 className="text-lg font-semibold text-foreground">Gestion opérationnelle</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/admin/users">
            <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Users className="h-10 w-10 text-chart-3 mb-3" />
                <h3 className="font-semibold">Utilisateurs</h3>
                <p className="text-sm text-muted-foreground">Inviter & gérer</p>
                <AdminStatBadge
                  value={stats?.usersActifs ?? 0}
                  label="actifs"
                  variant={stats?.usersActifs && stats.usersActifs > 0 ? 'success' : 'warning'}
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/roles">
            <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Shield className="h-10 w-10 text-red-400 mb-3" />
                <h3 className="font-semibold">Rôles & Permissions</h3>
                <p className="text-sm text-muted-foreground">RBAC configurable</p>
                <AdminStatBadge
                  value="4 rôles"
                  variant="info"
                  loading={false}
                />
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/import-acteurs">
            <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <UserPlus className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Import Acteurs</h3>
                <p className="text-sm text-muted-foreground">Via Perplexity</p>
                <AdminStatBadge
                  value={stats?.totalActeurs ?? 0}
                  label="acteurs"
                  variant="info"
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/mots-cles">
            <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Tag className="h-10 w-10 text-secondary mb-3" />
                <h3 className="font-semibold">Mots-Clés</h3>
                <p className="text-sm text-muted-foreground">Veille & alertes</p>
                <AdminStatBadge
                  value={stats?.motsClesActifs ?? 0}
                  label="actifs"
                  variant="info"
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/newsletters">
            <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Mail className="h-10 w-10 text-chart-1 mb-3" />
                <h3 className="font-semibold">Newsletters</h3>
                <p className="text-sm text-muted-foreground">Génération IA</p>
                <AdminStatBadge
                  value={stats?.newslettersEnAttente ?? 0}
                  label="en attente"
                  variant={stats?.newslettersEnAttente && stats.newslettersEnAttente > 0 ? 'warning' : 'muted'}
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/presentation">
            <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Presentation className="h-10 w-10 text-purple-400 mb-3" />
                <h3 className="font-semibold">Présentation</h3>
                <p className="text-sm text-muted-foreground">Slides PDF</p>
                <AdminStatBadge
                  value="11 slides"
                  variant="info"
                  loading={false}
                />
              </CardContent>
            </Card>
          </Link>
          <Card className="glass cursor-pointer hover:shadow-glow transition-shadow">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Bell className="h-10 w-10 text-chart-4 mb-3" />
              <h3 className="font-semibold">Alertes</h3>
              <p className="text-sm text-muted-foreground">Configurer seuils</p>
              <AdminStatBadge
                value={stats?.alertesNonLues ?? 0}
                label="non lues"
                variant={stats?.alertesNonLues && stats.alertesNonLues > 0 ? 'warning' : 'muted'}
                loading={isLoading}
              />
            </CardContent>
          </Card>
          <Link to="/admin/sources">
            <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Database className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Sources</h3>
                <p className="text-sm text-muted-foreground">Médias & flux</p>
                <AdminStatBadge
                  value={stats?.sourcesActives ?? 0}
                  label="actives"
                  variant={stats?.sourcesActives && stats.sourcesActives > 0 ? 'success' : 'warning'}
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Section Supervision Technique */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
          <h2 className="text-lg font-semibold text-muted-foreground">Supervision technique</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/admin/cron-jobs">
            <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full border-muted">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Clock className="h-10 w-10 text-chart-2 mb-3" />
                <h3 className="font-semibold">Tâches CRON</h3>
                <p className="text-sm text-muted-foreground">Collecte automatisée</p>
                <AdminStatBadge
                  value={collecteLabel}
                  variant={getCollecteVariant(stats?.derniereCollecte ?? null)}
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/audit-logs">
            <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full border-muted">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <ClipboardList className="h-10 w-10 text-chart-5 mb-3" />
                <h3 className="font-semibold">Historique d'audit</h3>
                <p className="text-sm text-muted-foreground">Actions admin</p>
                <AdminStatBadge
                  value={stats?.actionsAudit24h ?? 0}
                  label="actions (24h)"
                  variant="muted"
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}