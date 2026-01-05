import { Card, CardContent } from '@/components/ui/card';
import { Users, Database, Bell, Tag, UserPlus, ClipboardList, Clock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">Configuration et gestion du système</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/import-acteurs">
          <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <UserPlus className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold">Import Acteurs</h3>
              <p className="text-sm text-muted-foreground">Via Perplexity</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="glass cursor-pointer hover:shadow-glow transition-shadow">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Database className="h-10 w-10 text-primary mb-3" />
            <h3 className="font-semibold">Sources</h3>
            <p className="text-sm text-muted-foreground">12 actives</p>
          </CardContent>
        </Card>
        <Link to="/admin/mots-cles">
          <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Tag className="h-10 w-10 text-secondary mb-3" />
              <h3 className="font-semibold">Mots-Clés</h3>
              <p className="text-sm text-muted-foreground">Veille & alertes</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="glass cursor-pointer hover:shadow-glow transition-shadow">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Bell className="h-10 w-10 text-chart-4 mb-3" />
            <h3 className="font-semibold">Alertes</h3>
            <p className="text-sm text-muted-foreground">Configurer seuils</p>
          </CardContent>
        </Card>
        <Link to="/admin/users">
          <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Users className="h-10 w-10 text-chart-3 mb-3" />
              <h3 className="font-semibold">Utilisateurs</h3>
              <p className="text-sm text-muted-foreground">Inviter & gérer</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/audit-logs">
          <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <ClipboardList className="h-10 w-10 text-chart-5 mb-3" />
              <h3 className="font-semibold">Historique d'audit</h3>
              <p className="text-sm text-muted-foreground">Actions admin</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/cron-jobs">
          <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Clock className="h-10 w-10 text-chart-2 mb-3" />
              <h3 className="font-semibold">Tâches CRON</h3>
              <p className="text-sm text-muted-foreground">Collecte automatisée</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/newsletters">
          <Card className="glass cursor-pointer hover:shadow-glow transition-shadow h-full">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Mail className="h-10 w-10 text-chart-1 mb-3" />
              <h3 className="font-semibold">Newsletters</h3>
              <p className="text-sm text-muted-foreground">Génération IA</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
