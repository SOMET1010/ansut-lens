import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePersonnalites, CERCLE_LABELS, type PersonnalitesFilters } from '@/hooks/usePersonnalites';
import { StatsBar } from '@/components/personnalites/StatsBar';
import { ActeurFilters } from '@/components/personnalites/ActeurFilters';
import { ActeurCard } from '@/components/personnalites/ActeurCard';
import { CercleHeader } from '@/components/personnalites/CercleHeader';
import { ActeurDetail } from '@/components/personnalites/ActeurDetail';
import type { Personnalite, CercleStrategique } from '@/types';

export default function PersonnalitesPage() {
  const [filters, setFilters] = useState<PersonnalitesFilters>({ actif: true });
  const [selectedActeur, setSelectedActeur] = useState<Personnalite | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  const { data: personnalites, isLoading } = usePersonnalites(filters);

  // Grouper par cercle
  const parCercle = useMemo(() => {
    if (!personnalites) return { 1: [], 2: [], 3: [], 4: [] };
    return personnalites.reduce((acc, p) => {
      const cercle = p.cercle || 2;
      if (!acc[cercle]) acc[cercle] = [];
      acc[cercle].push(p);
      return acc;
    }, {} as Record<CercleStrategique, Personnalite[]>);
  }, [personnalites]);

  const handleActeurClick = (acteur: Personnalite) => {
    setSelectedActeur(acteur);
    setDetailOpen(true);
  };

  const filteredPersonnalites = useMemo(() => {
    if (activeTab === 'all') return personnalites || [];
    const cercle = parseInt(activeTab) as CercleStrategique;
    return parCercle[cercle] || [];
  }, [activeTab, personnalites, parCercle]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Acteurs Clés
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivi des personnalités stratégiques du secteur numérique
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsBar />

      {/* Filters */}
      <ActeurFilters filters={filters} onFiltersChange={setFilters} />

      {/* Tabs par cercle */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="gap-2">
            Tous
            {personnalites && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {personnalites.length}
              </span>
            )}
          </TabsTrigger>
          {([1, 2, 3, 4] as CercleStrategique[]).map((cercle) => (
            <TabsTrigger key={cercle} value={cercle.toString()} className="gap-2">
              <div className={`h-2 w-2 rounded-full ${CERCLE_LABELS[cercle].color}`} />
              <span className="hidden sm:inline">Cercle</span> {cercle}
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {parCercle[cercle]?.length || 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Contenu - Tous */}
        <TabsContent value="all" className="mt-6 space-y-8">
          {isLoading ? (
            <LoadingSkeleton />
          ) : personnalites?.length === 0 ? (
            <EmptyState />
          ) : (
            ([1, 2, 3, 4] as CercleStrategique[]).map((cercle) => {
              const acteurs = parCercle[cercle];
              if (!acteurs || acteurs.length === 0) return null;
              return (
                <div key={cercle}>
                  <CercleHeader cercle={cercle} count={acteurs.length} />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                    {acteurs.map((acteur) => (
                      <ActeurCard
                        key={acteur.id}
                        personnalite={acteur}
                        onClick={() => handleActeurClick(acteur)}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* Contenu - Par cercle */}
        {([1, 2, 3, 4] as CercleStrategique[]).map((cercle) => (
          <TabsContent key={cercle} value={cercle.toString()} className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <>
                <CercleHeader cercle={cercle} count={parCercle[cercle]?.length || 0} />
                {parCercle[cercle]?.length === 0 ? (
                  <EmptyState cercle={cercle} />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                    {parCercle[cercle]?.map((acteur) => (
                      <ActeurCard
                        key={acteur.id}
                        personnalite={acteur}
                        onClick={() => handleActeurClick(acteur)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail panel */}
      <ActeurDetail
        personnalite={selectedActeur}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-4 rounded-lg border bg-card">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ cercle }: { cercle?: CercleStrategique }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Si c'est un cercle spécifique vide, message simple
  if (cercle) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">Aucun acteur trouvé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Aucun acteur dans le cercle {cercle} pour le moment.
        </p>
      </div>
    );
  }

  // EmptyState global avec actions
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-6">
        <Users className="h-16 w-16 text-primary" />
      </div>
      <h3 className="text-xl font-semibold">Aucun acteur dans la base</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        La base d'acteurs est vide. Commencez par générer des personnalités
        clés du secteur numérique ivoirien.
      </p>
      
      {isAdmin ? (
        <Button 
          size="lg" 
          className="mt-6 gap-2"
          onClick={() => navigate('/admin/import-acteurs')}
        >
          <Sparkles className="h-5 w-5" />
          Générer des acteurs
        </Button>
      ) : (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-3 rounded-lg">
          <UserPlus className="h-4 w-4" />
          <span>Contactez un administrateur pour alimenter la base</span>
        </div>
      )}
    </div>
  );
}
