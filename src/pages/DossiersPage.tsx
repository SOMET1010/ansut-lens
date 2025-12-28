import { useState } from 'react';
import { FileText, Plus, Search, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  useDossiers, 
  CATEGORIE_LABELS, 
  STATUT_LABELS,
  type DossierCategorie,
  type Dossier 
} from '@/hooks/useDossiers';
import { useAuth } from '@/contexts/AuthContext';
import { DossierFormDialog, DossierView } from '@/components/dossiers';

export default function DossiersPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);
  
  const { isAdmin } = useAuth();
  const { data: dossiers, isLoading } = useDossiers();

  const filteredDossiers = dossiers?.filter((d) => {
    const matchesSearch = !searchQuery || 
      d.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.resume?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || d.categorie === activeTab;
    return matchesSearch && matchesTab;
  }) || [];

  const countByCategorie = (categorie: DossierCategorie) => 
    dossiers?.filter(d => d.categorie === categorie).length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Dossiers Stratégiques
          </h1>
          <p className="text-muted-foreground mt-1">
            Notes et briefings pour la Direction Générale et le Conseil
          </p>
        </div>
        
        {isAdmin && (
          <Button className="gap-2" onClick={() => { setEditingDossier(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nouveau dossier
          </Button>
        )}
      </div>

      {/* Cartes mégatendances */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-500">
              <span className="text-2xl">📡</span>
              Service Universel des Télécommunications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Socle de l'inclusion numérique : connectivité, infrastructures, financement et qualité de service.
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{countByCategorie('sut')} dossiers</Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('sut')}
                className="gap-1"
              >
                Voir <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <span className="text-2xl">🤖</span>
              Intelligence Artificielle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Accélérateur des services publics : IA souveraine, régulation, inclusion et éthique.
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{countByCategorie('ia')} dossiers</Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('ia')}
                className="gap-1"
              >
                Voir <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Rechercher un dossier..." 
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs par catégorie */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            Tous
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {dossiers?.length || 0}
            </span>
          </TabsTrigger>
          {(['sut', 'ia', 'acteurs', 'general'] as DossierCategorie[]).map((cat) => (
            <TabsTrigger key={cat} value={cat} className="gap-2">
              <span>{CATEGORIE_LABELS[cat].icon}</span>
              <span className="hidden sm:inline">{CATEGORIE_LABELS[cat].label}</span>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {countByCategorie(cat)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredDossiers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Aucun dossier</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery 
                  ? 'Aucun dossier ne correspond à votre recherche.'
                  : 'Créez votre premier dossier stratégique.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDossiers.map((dossier) => (
                <Card 
                  key={dossier.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedDossier(dossier)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline"
                            className={`${CATEGORIE_LABELS[dossier.categorie].color} text-white border-0`}
                          >
                            {CATEGORIE_LABELS[dossier.categorie].icon} {CATEGORIE_LABELS[dossier.categorie].label}
                          </Badge>
                          <Badge variant={STATUT_LABELS[dossier.statut].variant}>
                            {STATUT_LABELS[dossier.statut].label}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg">{dossier.titre}</h3>
                        {dossier.resume && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {dossier.resume}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {format(new Date(dossier.updated_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Formulation officielle */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground italic text-center">
            La veille stratégique de l'ANSUT s'articule autour de deux mégatendances structurantes : 
            le Service Universel des Télécommunications, socle de l'inclusion numérique, 
            et l'Intelligence Artificielle, nouvel accélérateur des services publics et de la souveraineté numérique.
          </p>
        </CardContent>
      </Card>

      {/* Dialog de création/édition */}
      <DossierFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        dossier={editingDossier}
      />

      {/* Vue de lecture */}
      <DossierView
        dossier={selectedDossier}
        open={!!selectedDossier}
        onOpenChange={(open) => !open && setSelectedDossier(null)}
        onEdit={(dossier) => {
          setSelectedDossier(null);
          setEditingDossier(dossier);
          setIsFormOpen(true);
        }}
      />
    </div>
  );
}
