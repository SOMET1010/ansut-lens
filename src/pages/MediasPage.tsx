import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function MediasPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Médias ANSUT</h1>
        <p className="text-muted-foreground">E-réputation et suivi des mentions</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm">Volume Mentions (7j)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">847</div><p className="text-xs text-signal-positive">+23% vs semaine précédente</p></CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm">Score Réputation</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-signal-positive">72/100</div><Progress value={72} className="mt-2" /></CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm">Mentions Critiques</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-signal-warning">5</div><p className="text-xs text-muted-foreground">À traiter</p></CardContent>
        </Card>
      </div>
      <Card className="glass">
        <CardHeader><CardTitle>Répartition Sentiment</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3"><span className="w-20 text-sm">Positif</span><Progress value={65} className="flex-1" /><span className="text-sm text-signal-positive">65%</span></div>
            <div className="flex items-center gap-3"><span className="w-20 text-sm">Neutre</span><Progress value={28} className="flex-1" /><span className="text-sm">28%</span></div>
            <div className="flex items-center gap-3"><span className="w-20 text-sm">Négatif</span><Progress value={7} className="flex-1" /><span className="text-sm text-signal-critical">7%</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
