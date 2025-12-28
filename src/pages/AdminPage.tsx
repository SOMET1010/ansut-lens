import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Database, Bell } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">Configuration et gestion du système</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass cursor-pointer hover:shadow-glow transition-shadow">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Database className="h-10 w-10 text-primary mb-3" />
            <h3 className="font-semibold">Sources</h3>
            <p className="text-sm text-muted-foreground">12 actives</p>
          </CardContent>
        </Card>
        <Card className="glass cursor-pointer hover:shadow-glow transition-shadow">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Bell className="h-10 w-10 text-secondary mb-3" />
            <h3 className="font-semibold">Alertes</h3>
            <p className="text-sm text-muted-foreground">Configurer seuils</p>
          </CardContent>
        </Card>
        <Card className="glass cursor-pointer hover:shadow-glow transition-shadow">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Users className="h-10 w-10 text-chart-3 mb-3" />
            <h3 className="font-semibold">Utilisateurs</h3>
            <p className="text-sm text-muted-foreground">8 utilisateurs</p>
          </CardContent>
        </Card>
        <Card className="glass cursor-pointer hover:shadow-glow transition-shadow">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Settings className="h-10 w-10 text-chart-5 mb-3" />
            <h3 className="font-semibold">Système</h3>
            <p className="text-sm text-muted-foreground">Logs & audit</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
