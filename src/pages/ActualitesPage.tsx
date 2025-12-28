import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const actualites = [
  { id: 1, titre: 'L\'ANSUT accélère le déploiement du service universel en zones rurales', source: 'Fraternité Matin', importance: 95, categorie: 'Service Universel', sentiment: 0.8 },
  { id: 2, titre: 'Orange CI et MTN annoncent des investissements massifs en 5G', source: 'Jeune Afrique', importance: 85, categorie: 'Opérateurs', sentiment: 0.5 },
  { id: 3, titre: 'L\'ARTCI renforce le cadre réglementaire des télécoms', source: 'AIP', importance: 80, categorie: 'Régulation', sentiment: 0.3 },
  { id: 4, titre: 'Cybersécurité : La Côte d\'Ivoire monte en puissance', source: 'CIO Mag', importance: 75, categorie: 'Cyber', sentiment: 0.6 },
];

export default function ActualitesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Actualités du Jour</h1>
        <p className="text-muted-foreground">Veille et titrologie secteur télécoms</p>
      </div>
      <div className="space-y-4">
        {actualites.map((actu) => (
          <Card key={actu.id} className="glass hover:shadow-glow transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-lg leading-tight">{actu.titre}</CardTitle>
                <Badge variant={actu.importance > 80 ? 'default' : 'secondary'}>{actu.importance}%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{actu.source}</span>
                <Badge variant="outline">{actu.categorie}</Badge>
                <span className={actu.sentiment > 0.5 ? 'text-signal-positive' : actu.sentiment < 0 ? 'text-signal-critical' : 'text-muted-foreground'}>
                  Sentiment: {actu.sentiment > 0 ? '+' : ''}{(actu.sentiment * 100).toFixed(0)}%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
