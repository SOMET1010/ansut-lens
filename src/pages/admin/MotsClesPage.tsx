import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  AlertTriangle,
  Tag,
  BarChart3,
  Filter,
  Bell,
  Zap,
} from 'lucide-react';
import {
  useCategoriesVeille,
  useMotsClesVeille,
  useUpdateMotCle,
  useCreateMotCle,
  useMotsClesMatching,
  type CategorieVeille,
  type MotCleVeille,
} from '@/hooks/useMotsClesVeille';

const quadrantLabels: Record<string, string> = {
  tech: 'Technologie',
  regulation: 'Régulation',
  market: 'Marché',
  reputation: 'Réputation',
};

const quadrantColors: Record<string, string> = {
  tech: 'bg-primary text-primary-foreground',
  regulation: 'bg-purple-500 text-white',
  market: 'bg-emerald-500 text-white',
  reputation: 'bg-amber-500 text-white',
};

export default function MotsClesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(null);
  const [showAlerteOnly, setShowAlerteOnly] = useState(false);
  const [testContent, setTestContent] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMotCle, setNewMotCle] = useState({
    mot_cle: '',
    variantes: '',
    categorie_id: '',
    quadrant: '' as 'tech' | 'regulation' | 'market' | 'reputation' | '',
    score_criticite: 50,
    alerte_auto: false,
  });

  const { data: categories, isLoading: loadingCategories } = useCategoriesVeille();
  const { data: motsCles, isLoading: loadingMotsCles } = useMotsClesVeille(
    selectedCategorie || undefined
  );
  const updateMotCle = useUpdateMotCle();
  const createMotCle = useCreateMotCle();
  const { matchContent, calculateTotalScore, hasAlertKeywords, getQuadrantDistribution } =
    useMotsClesMatching();

  // Filter mots-clés
  const filteredMotsCles = motsCles?.filter((mc) => {
    const matchesSearch =
      mc.mot_cle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mc.variantes?.some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAlerte = !showAlerteOnly || mc.alerte_auto;
    return matchesSearch && matchesAlerte;
  });

  // Test matching
  const matchResults = testContent ? matchContent(testContent) : [];
  const totalScore = calculateTotalScore(matchResults);
  const hasAlerts = hasAlertKeywords(matchResults);
  const quadrantDist = getQuadrantDistribution(matchResults);

  // Stats
  const totalMotsCles = motsCles?.length || 0;
  const activeMotsCles = motsCles?.filter((m) => m.actif).length || 0;
  const alerteMotsCles = motsCles?.filter((m) => m.alerte_auto).length || 0;

  const handleToggleActive = (id: string, currentValue: boolean) => {
    updateMotCle.mutate({ id, updates: { actif: !currentValue } });
  };

  const handleToggleAlerte = (id: string, currentValue: boolean) => {
    updateMotCle.mutate({ id, updates: { alerte_auto: !currentValue } });
  };

  const handleAddMotCle = () => {
    if (!newMotCle.mot_cle.trim()) return;

    createMotCle.mutate(
      {
        mot_cle: newMotCle.mot_cle.trim(),
        variantes: newMotCle.variantes
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        categorie_id: newMotCle.categorie_id || null,
        quadrant: newMotCle.quadrant || null,
        score_criticite: newMotCle.score_criticite,
        alerte_auto: newMotCle.alerte_auto,
      },
      {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          setNewMotCle({
            mot_cle: '',
            variantes: '',
            categorie_id: '',
            quadrant: '',
            score_criticite: 50,
            alerte_auto: false,
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mots-Clés de Veille</h1>
          <p className="text-muted-foreground">
            Gérer les {totalMotsCles} mots-clés de surveillance ANSUT RADAR
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un mot-clé
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau mot-clé de veille</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Mot-clé principal</Label>
                <Input
                  value={newMotCle.mot_cle}
                  onChange={(e) =>
                    setNewMotCle({ ...newMotCle, mot_cle: e.target.value })
                  }
                  placeholder="Ex: Cyberattaque"
                />
              </div>
              <div>
                <Label>Variantes (séparées par des virgules)</Label>
                <Textarea
                  value={newMotCle.variantes}
                  onChange={(e) =>
                    setNewMotCle({ ...newMotCle, variantes: e.target.value })
                  }
                  placeholder="Ex: Cyber attaque, Attaque informatique, Piratage"
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select
                  value={newMotCle.categorie_id}
                  onValueChange={(v) =>
                    setNewMotCle({ ...newMotCle, categorie_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quadrant Radar</Label>
                <Select
                  value={newMotCle.quadrant}
                  onValueChange={(v) =>
                    setNewMotCle({
                      ...newMotCle,
                      quadrant: v as 'tech' | 'regulation' | 'market' | 'reputation',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un quadrant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Technologie</SelectItem>
                    <SelectItem value="regulation">Régulation</SelectItem>
                    <SelectItem value="market">Marché</SelectItem>
                    <SelectItem value="reputation">Réputation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Score de criticité (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newMotCle.score_criticite}
                  onChange={(e) =>
                    setNewMotCle({
                      ...newMotCle,
                      score_criticite: parseInt(e.target.value) || 50,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newMotCle.alerte_auto}
                  onCheckedChange={(v) =>
                    setNewMotCle({ ...newMotCle, alerte_auto: v })
                  }
                />
                <Label>Alerte automatique</Label>
              </div>
              <Button onClick={handleAddMotCle} className="w-full">
                Créer le mot-clé
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Tag className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalMotsCles}</p>
                <p className="text-sm text-muted-foreground">Total mots-clés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{activeMotsCles}</p>
                <p className="text-sm text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{alerteMotsCles}</p>
                <p className="text-sm text-muted-foreground">Alertes auto</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{categories?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Catégories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Liste des mots-clés</TabsTrigger>
          <TabsTrigger value="categories">Par catégorie</TabsTrigger>
          <TabsTrigger value="test">Tester le matching</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card className="glass">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un mot-clé..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={selectedCategorie || 'all'}
                  onValueChange={(v) =>
                    setSelectedCategorie(v === 'all' ? null : v)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Toutes catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes catégories</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showAlerteOnly}
                    onCheckedChange={setShowAlerteOnly}
                  />
                  <Label>Alertes uniquement</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="glass">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mot-clé</TableHead>
                    <TableHead>Variantes</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Quadrant</TableHead>
                    <TableHead className="text-center">Criticité</TableHead>
                    <TableHead className="text-center">Alerte</TableHead>
                    <TableHead className="text-center">Actif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMotsCles ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  ) : filteredMotsCles?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Aucun mot-clé trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMotsCles?.map((mc) => (
                      <TableRow key={mc.id}>
                        <TableCell className="font-medium">{mc.mot_cle}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {mc.variantes?.slice(0, 3).map((v, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {v}
                              </Badge>
                            ))}
                            {mc.variantes && mc.variantes.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{mc.variantes.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {mc.categories_veille ? (
                            <Badge
                              style={{
                                backgroundColor: mc.categories_veille.couleur,
                              }}
                              className="text-white"
                            >
                              {mc.categories_veille.nom}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {mc.quadrant && (
                            <Badge className={quadrantColors[mc.quadrant]}>
                              {quadrantLabels[mc.quadrant]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-bold ${
                              mc.score_criticite >= 90
                                ? 'text-destructive'
                                : mc.score_criticite >= 70
                                ? 'text-amber-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {mc.score_criticite}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={mc.alerte_auto}
                            onCheckedChange={() =>
                              handleToggleAlerte(mc.id, mc.alerte_auto)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={mc.actif}
                            onCheckedChange={() =>
                              handleToggleActive(mc.id, mc.actif)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories?.map((cat) => {
              const catMotsCles = motsCles?.filter(
                (m) => m.categorie_id === cat.id
              );
              const activeCount = catMotsCles?.filter((m) => m.actif).length || 0;
              const alerteCount =
                catMotsCles?.filter((m) => m.alerte_auto).length || 0;

              return (
                <Card
                  key={cat.id}
                  className="glass cursor-pointer hover:shadow-glow transition-shadow"
                  onClick={() => {
                    setSelectedCategorie(cat.id);
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.couleur }}
                      />
                      {cat.nom}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {cat.description}
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span>
                        <strong>{catMotsCles?.length || 0}</strong> mots-clés
                      </span>
                      <span className="text-emerald-500">
                        <strong>{activeCount}</strong> actifs
                      </span>
                      {alerteCount > 0 && (
                        <span className="text-destructive">
                          <strong>{alerteCount}</strong> alertes
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Tester le matching de mots-clés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Collez ici un texte pour tester la détection des mots-clés..."
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                rows={6}
              />

              {testContent && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex flex-wrap gap-4">
                    <Card className="flex-1 min-w-[150px]">
                      <CardContent className="pt-4">
                        <p className="text-2xl font-bold">{matchResults.length}</p>
                        <p className="text-sm text-muted-foreground">
                          Mots-clés détectés
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="flex-1 min-w-[150px]">
                      <CardContent className="pt-4">
                        <p className="text-2xl font-bold">{totalScore}</p>
                        <p className="text-sm text-muted-foreground">
                          Score total
                        </p>
                      </CardContent>
                    </Card>
                    <Card
                      className={`flex-1 min-w-[150px] ${
                        hasAlerts ? 'border-destructive' : ''
                      }`}
                    >
                      <CardContent className="pt-4">
                        {hasAlerts ? (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-6 w-6" />
                            <div>
                              <p className="font-bold">ALERTE</p>
                              <p className="text-sm">Mots critiques détectés</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            <p className="font-medium">Pas d'alerte</p>
                            <p className="text-sm">Aucun mot critique</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quadrant distribution */}
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(quadrantDist).map(([quad, score]) => (
                      <div
                        key={quad}
                        className={`p-3 rounded-lg text-center ${
                          score > 0 ? quadrantColors[quad] : 'bg-muted'
                        }`}
                      >
                        <p className="font-bold">{score}</p>
                        <p className="text-xs">{quadrantLabels[quad]}</p>
                      </div>
                    ))}
                  </div>

                  {/* Results */}
                  {matchResults.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Détails des détections</h4>
                      <div className="space-y-2">
                        {matchResults.map((result, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${
                              result.mot_cle.alerte_auto
                                ? 'border-destructive bg-destructive/10'
                                : 'border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {result.mot_cle.alerte_auto && (
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                )}
                                <span className="font-medium">
                                  {result.mot_cle.mot_cle}
                                </span>
                                {result.mot_cle.quadrant && (
                                  <Badge
                                    className={quadrantColors[result.mot_cle.quadrant]}
                                  >
                                    {quadrantLabels[result.mot_cle.quadrant]}
                                  </Badge>
                                )}
                              </div>
                              <span className="font-bold">
                                Score: {result.score}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Termes trouvés: {result.matches.join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
