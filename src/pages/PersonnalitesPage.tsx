import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const personnalites = [
  { id: 1, nom: 'Bilé Diéméléou', fonction: 'DG ARTCI', categorie: 'regulateur', score: 95 },
  { id: 2, nom: 'Mamadou Bamba', fonction: 'DG Orange CI', categorie: 'operateur', score: 90 },
  { id: 3, nom: 'Djibril Ouattara', fonction: 'DG MTN CI', categorie: 'operateur', score: 88 },
  { id: 4, nom: 'Roger Adom', fonction: 'Ministre Économie Numérique', categorie: 'politique', score: 92 },
];

const categorieColors: Record<string, string> = {
  regulateur: 'bg-primary/20 text-primary',
  operateur: 'bg-secondary/20 text-secondary',
  politique: 'bg-chart-5/20 text-chart-5',
};

export default function PersonnalitesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Personnalités</h1>
        <p className="text-muted-foreground">Suivi des acteurs clés du secteur</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {personnalites.map((p) => (
          <Card key={p.id} className="glass hover:shadow-glow transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {p.nom.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{p.nom}</h3>
                  <p className="text-sm text-muted-foreground">{p.fonction}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={categorieColors[p.categorie]}>{p.categorie}</Badge>
                    <span className="text-xs text-muted-foreground">Score: {p.score}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
