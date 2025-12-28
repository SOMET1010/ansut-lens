import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Search, Filter, TrendingUp, AlertTriangle, Newspaper, Clock } from 'lucide-react';
import { useActualites, useLastCollecte, useTriggerCollecte, useEnrichActualite, calculateFreshness } from '@/hooks/useActualites';
import { FreshnessIndicator, CollecteStatus } from '@/components/actualites/FreshnessIndicator';
import { useCategoriesVeille } from '@/hooks/useMotsClesVeille';

const quadrantLabels: Record<string, string> = {
  tech: 'Technologie',
  regulation: 'Régulation',
  market: 'Marché',
  reputation: 'Réputation',
};

export default function ActualitesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('all');
  const [freshnessFilter, setFreshnessFilter] = useState<string>('all');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');

  const { data: categories } = useCategoriesVeille();
  const { data: lastCollecte, isLoading: isLoadingCollecte } = useLastCollecte();
  const triggerCollecte = useTriggerCollecte();
  const enrichActualite = useEnrichActualite();

  // Calculer les filtres basés sur la fraîcheur
  const maxAgeHours = freshnessFilter === '24h' ? 24 : freshnessFilter === '72h' ? 72 : freshnessFilter === '7d' ? 168 : undefined;
  const minImportance = importanceFilter === 'high' ? 70 : importanceFilter === 'medium' ? 50 : undefined;

  const { data: actualites, isLoading, refetch } = useActualites({
    categorie: selectedCategorie !== 'all' ? selectedCategorie : undefined,
    maxAgeHours,
    minImportance,
  });

  // Filtrer par recherche
  const filteredActualites = actualites?.filter(actu => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      actu.titre.toLowerCase().includes(searchLower) ||
      actu.resume?.toLowerCase().includes(searchLower) ||
      actu.source_nom?.toLowerCase().includes(searchLower) ||
      actu.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  const handleRefresh = () => {
    triggerCollecte.mutate('critique');
  };

  const handleEnrich = (id: string) => {
    enrichActualite.mutate(id);
  };

  const parseAnalyseIA = (analyseIA: string | null) => {
    if (!analyseIA) return null;
    try {
      return JSON.parse(analyseIA);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Actualités du Jour</h1>
          <p className="text-muted-foreground">Veille temps réel secteur télécoms Côte d'Ivoire</p>
        </div>

        <div className="flex items-center gap-3">
          <CollecteStatus 
            lastCollecteDate={lastCollecte?.created_at || null}
            status={triggerCollecte.isPending ? 'loading' : lastCollecte?.statut === 'success' ? 'success' : 'error'}
            nbResultats={lastCollecte?.nb_resultats || undefined}
          />
          <Button 
            onClick={handleRefresh} 
            disabled={triggerCollecte.isPending}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerCollecte.isPending ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="glass">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, source, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.nom}>{cat.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={freshnessFilter} onValueChange={setFreshnessFilter}>
              <SelectTrigger className="w-[150px]">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Fraîcheur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="24h">🟢 Moins de 24h</SelectItem>
                <SelectItem value="72h">🟡 Moins de 72h</SelectItem>
                <SelectItem value="7d">Moins de 7 jours</SelectItem>
              </SelectContent>
            </Select>

            <Select value={importanceFilter} onValueChange={setImportanceFilter}>
              <SelectTrigger className="w-[150px]">
                <TrendingUp className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Importance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="high">Haute (70%+)</SelectItem>
                <SelectItem value="medium">Moyenne (50%+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{actualites?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Actualités</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🟢</span>
              <div>
                <p className="text-2xl font-bold">
                  {actualites?.filter(a => calculateFreshness(a.date_publication).level === 'fresh').length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Moins de 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-signal-positive" />
              <div>
                <p className="text-2xl font-bold">
                  {actualites?.filter(a => (a.importance || 0) >= 70).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Haute importance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-signal-warning" />
              <div>
                <p className="text-2xl font-bold">
                  {actualites?.filter(a => {
                    const analyse = parseAnalyseIA(a.analyse_ia);
                    return analyse?.alertes_declenchees?.length > 0;
                  }).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Alertes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des actualités */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="cards">Cartes</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="glass">
                <CardContent className="pt-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredActualites?.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune actualité trouvée</p>
                <Button onClick={handleRefresh} className="mt-4" variant="outline">
                  Lancer une collecte
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredActualites?.map((actu) => {
              const analyse = parseAnalyseIA(actu.analyse_ia);
              const hasAlerts = analyse?.alertes_declenchees?.length > 0;

              return (
                <Card 
                  key={actu.id} 
                  className={`glass hover:shadow-glow transition-all cursor-pointer ${hasAlerts ? 'border-signal-warning/50' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FreshnessIndicator 
                            datePublication={actu.date_publication}
                            sourceUrl={actu.source_url}
                          />
                          {hasAlerts && (
                            <Badge variant="destructive" className="animate-pulse">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Alerte
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight">{actu.titre}</CardTitle>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={actu.importance && actu.importance > 70 ? 'default' : 'secondary'}>
                          {actu.importance || 50}%
                        </Badge>
                        {analyse?.quadrant_dominant && (
                          <Badge variant="outline" className="text-xs">
                            {quadrantLabels[analyse.quadrant_dominant] || analyse.quadrant_dominant}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {actu.resume && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {actu.resume}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">{actu.source_nom}</span>
                      {actu.categorie && (
                        <Badge variant="outline">{actu.categorie}</Badge>
                      )}
                      {actu.tags?.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {actu.tags && actu.tags.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{actu.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="glass">
                <CardContent className="pt-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : (
            filteredActualites?.map((actu) => {
              const analyse = parseAnalyseIA(actu.analyse_ia);
              const hasAlerts = analyse?.alertes_declenchees?.length > 0;

              return (
                <Card 
                  key={actu.id} 
                  className={`glass hover:shadow-glow transition-all cursor-pointer h-full ${hasAlerts ? 'border-signal-warning/50' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <FreshnessIndicator datePublication={actu.date_publication} />
                      <Badge variant={actu.importance && actu.importance > 70 ? 'default' : 'secondary'}>
                        {actu.importance || 50}%
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-tight line-clamp-2">{actu.titre}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {actu.resume && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {actu.resume}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {actu.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
