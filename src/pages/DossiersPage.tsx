import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FileText, Edit3, Send, Mail, Users, AlertTriangle, TrendingUp, Eye, Sparkles, Calendar, Palette, Search, FolderOpen, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useDossiers, 
  CATEGORIE_LABELS,
  STATUT_LABELS,
  type Dossier,
  type DossierCategorie,
  type DossierStatut,
} from '@/hooks/useDossiers';
import { useNewsletters, useNewsletter } from '@/hooks/useNewsletters';
import { useAuth } from '@/contexts/AuthContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { 
  DossierFormDialog, 
  DossierView,
  BriefingCard,
  CreateCard,
  NewsletterWidget,
  RecentSendsTable,
  NewsletterHistoryItem
} from '@/components/dossiers';
import {
  NewsletterList,
  NewsletterGenerator,
  NewsletterPreview,
  NewsletterEditor,
  DestinataireManager,
  NewsletterScheduler
} from '@/components/newsletter';
import { NewsletterStudio } from '@/components/newsletter/studio';
import { FocusBanner } from '@/components/radar';
import { SectionEmptyState } from '@/components/radar/SectionEmptyState';
import { toErrorMessage } from '@/utils/errors';
import type { Newsletter } from '@/types/newsletter';

type NewsletterView = 'list' | 'generate' | 'preview' | 'edit' | 'studio';

export default function DossiersPage() {
  const [searchParams] = useSearchParams();
  const focusQuery = searchParams.get('q') || '';
  const focusFrom = searchParams.get('from') || undefined;
  const focusItem = searchParams.get('item') || undefined;

  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'newsletters'>('notes');

  // Recherche & filtres pour la section "Recommandations & Dossiers thématiques"
  const [search, setSearch] = useState(focusQuery);
  const [filterCat, setFilterCat] = useState<DossierCategorie | 'all'>('all');
  const [filterStatut, setFilterStatut] = useState<DossierStatut | 'all'>('all');
  
  // Newsletter management states
  const [newsletterView, setNewsletterView] = useState<NewsletterView>('list');
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  
  const { isAdmin } = useAuth();
  const { mode, setMode } = useViewMode();
  const { data: dossiers, isLoading: isLoadingDossiers, isError: isErrorDossiers, error: errorDossiers, refetch: refetchDossiers } = useDossiers();
  const { data: newsletters, isLoading: isLoadingNewsletters, isError: isErrorNewsletters, error: errorNewsletters, refetch: refetchNewsletters } = useNewsletters();
  const { data: selectedNewsletter, refetch: refetchNewsletter } = useNewsletter(selectedNewsletterId || undefined);

  // Premier dossier correspondant au focus du briefing
  const firstFocusDossier = useMemo(() => {
    if (!focusQuery || !dossiers) return null;
    const q = focusQuery.toLowerCase();
    return dossiers.find(d =>
      d.titre?.toLowerCase().includes(q) ||
      d.resume?.toLowerCase().includes(q) ||
      d.contenu?.toLowerCase().includes(q)
    ) || null;
  }, [dossiers, focusQuery]);

  const focusMatchCount = useMemo(() => {
    if (!focusQuery || !dossiers) return 0;
    const q = focusQuery.toLowerCase();
    return dossiers.filter(d =>
      d.titre?.toLowerCase().includes(q) ||
      d.resume?.toLowerCase().includes(q) ||
      d.contenu?.toLowerCase().includes(q)
    ).length;
  }, [dossiers, focusQuery]);

  // Auto-scroll vers le dossier ciblé quand les données arrivent
  useEffect(() => {
    if (!firstFocusDossier) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`dossier-${firstFocusDossier.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    return () => clearTimeout(t);
  }, [firstFocusDossier]);

  // Filter dossiers by status
  const brouillons = dossiers?.filter(d => d.statut === 'brouillon') || [];
  const publies = dossiers?.filter(d => d.statut === 'publie') || [];
  
  // Get recent newsletters (both sent and drafts)
  const recentSentNewsletters = newsletters?.filter(n => n.statut === 'envoye').slice(0, 3) || [];
  const recentDraftNewsletters = newsletters?.filter(n => n.statut === 'brouillon' || n.statut === 'en_revision').slice(0, 2) || [];

  // Filter for "Crise" mode - show only high-priority items (IA or acteurs categories as proxy for urgency)
  const urgentDossiers = dossiers?.filter(d => 
    d.categorie === 'ia' || d.categorie === 'acteurs'
  ) || [];

  // Liste filtrée pour la section "Recommandations & Dossiers thématiques"
  const filteredDossiers = useMemo(() => {
    if (!dossiers) return [] as Dossier[];
    const q = search.trim().toLowerCase();
    return dossiers.filter(d => {
      if (filterCat !== 'all' && d.categorie !== filterCat) return false;
      if (filterStatut !== 'all' && d.statut !== filterStatut) return false;
      if (!q) return true;
      return (
        d.titre?.toLowerCase().includes(q) ||
        d.resume?.toLowerCase().includes(q) ||
        d.contenu?.toLowerCase().includes(q)
      );
    });
  }, [dossiers, search, filterCat, filterStatut]);

  // Compteur par catégorie pour les pastilles
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (dossiers || []).forEach(d => {
      counts[d.categorie] = (counts[d.categorie] || 0) + 1;
    });
    return counts;
  }, [dossiers]);

  const hasActiveFilter = !!search.trim() || filterCat !== 'all' || filterStatut !== 'all';
  const clearFilters = () => { setSearch(''); setFilterCat('all'); setFilterStatut('all'); };

  const handleEditDossier = (dossier: Dossier) => {
    setSelectedDossier(null);
    setEditingDossier(dossier);
    setIsFormOpen(true);
  };

  const handleNewDossier = () => {
    setEditingDossier(null);
    setIsFormOpen(true);
  };

  // Newsletter handlers
  const handleSelectNewsletter = (newsletter: Newsletter) => {
    setSelectedNewsletterId(newsletter.id);
    setNewsletterView('preview');
  };

  const handleNewsletterGenerated = (newsletter: Newsletter) => {
    setSelectedNewsletterId(newsletter.id);
    setNewsletterView('preview');
  };

  const handleNewsletterBack = () => {
    setSelectedNewsletterId(null);
    setNewsletterView('list');
  };

  // Mode-specific titles and descriptions
  const modeConfig = {
    dg: {
      title: 'Vue Statistique',
      subtitle: 'Synthèse chiffrée des productions et envois.',
      icon: TrendingUp,
      label: 'STATISTIQUE'
    },
    analyste: {
      title: 'Studio de Publication',
      subtitle: 'Centralisez la production de vos Notes Stratégiques et Newsletters.',
      icon: FileText,
      label: 'PRODUCTION'
    },
    crise: {
      title: 'Centre de Crise',
      subtitle: 'Documents prioritaires et alertes en temps réel.',
      icon: AlertTriangle,
      label: 'CRISE'
    }
  };

  const currentConfig = modeConfig[mode];
  const ModeIcon = currentConfig.icon;

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Bandeau "Vu depuis Briefing" */}
      {(focusQuery || focusItem) && (
        <FocusBanner
          query={focusQuery}
          itemLabel={focusItem}
          origin={focusFrom}
          originLabel={!focusFrom ? 'Recommandation ANSUT' : undefined}
          matchCount={focusMatchCount}
        />
      )}

      {/* Erreurs de chargement */}
      {isErrorDossiers && (
        <SectionEmptyState
          variant="error"
          title="Impossible de charger les dossiers"
          description={toErrorMessage(errorDossiers)}
          onRetry={() => refetchDossiers()}
        />
      )}
      {isErrorNewsletters && (
        <SectionEmptyState
          variant="error"
          title="Impossible de charger les newsletters"
          description={toErrorMessage(errorNewsletters)}
          onRetry={() => refetchNewsletters()}
        />
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <ModeIcon className={`h-7 w-7 ${mode === 'crise' ? 'text-destructive' : 'text-primary'}`} />
            {currentConfig.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentConfig.subtitle}
          </p>
        </div>
        
        {/* Mode indicator badge */}
        <Badge 
          variant={mode === 'crise' ? 'destructive' : 'secondary'}
          className="uppercase text-xs tracking-wider"
        >
          <Eye className="h-3 w-3 mr-1" />
          Mode {currentConfig.label}
        </Badge>
      </div>

      {/* MODE: DG - Vue synthétique */}
      {mode === 'dg' && (
        <div className="space-y-6">
          {/* Empty State when no published content */}
          {publies.length === 0 && !isLoadingDossiers && (
            <Card className="p-12 text-center border-dashed border-2">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-bold mb-2">Aucune statistique disponible</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                La vue statistique affiche les documents validés et les indicateurs d'activité. 
                Passez en mode Production pour créer et publier du contenu.
              </p>
              <Button onClick={() => setMode('analyste')}>
                <FileText className="h-4 w-4 mr-2" />
                Passer en mode Production
              </Button>
            </Card>
          )}

          {/* KPI Cards - only show when there's data */}
          {(publies.length > 0 || brouillons.length > 0 || recentSentNewsletters.length > 0) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Notes publiées</p>
                        <p className="text-3xl font-bold text-primary">{publies.length}</p>
                      </div>
                      <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Send className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">En préparation</p>
                        <p className="text-3xl font-bold text-orange-500">{brouillons.length}</p>
                      </div>
                      <div className="h-12 w-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                        <Edit3 className="h-6 w-6 text-orange-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Newsletters envoyées</p>
                        <p className="text-3xl font-bold text-blue-500">{recentSentNewsletters.length}</p>
                      </div>
                      <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <Mail className="h-6 w-6 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent published documents only */}
              <section>
                <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4">
                  <Send className="h-4 w-4" /> Derniers documents validés
                </h2>
                
                {isLoadingDossiers ? (
                  <Skeleton className="h-[200px]" />
                ) : (
                  <RecentSendsTable 
                    dossiers={publies} 
                    onSelect={setSelectedDossier} 
                  />
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* MODE: ANALYSTE - Vue complète avec onglets */}
      {mode === 'analyste' && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notes' | 'newsletters')} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="notes" className="gap-2">
                <FileText className="h-4 w-4" />
                Notes Stratégiques
              </TabsTrigger>
              <TabsTrigger value="newsletters" className="gap-2">
                <Mail className="h-4 w-4" />
                Newsletters
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'notes' && isAdmin && (
              <Button onClick={handleNewDossier} size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Nouvelle note
              </Button>
            )}
            
            {activeTab === 'newsletters' && newsletterView === 'list' && (
              <Button onClick={() => setNewsletterView('generate')} size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Générer Newsletter
              </Button>
            )}
          </div>

          {/* Onglet Notes Stratégiques */}
          <TabsContent value="notes" className="space-y-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* COLONNE GAUCHE : Notes & Briefings (65%) */}
              <div className="flex-1 space-y-8">

                {/* Section "Recommandations & Dossiers thématiques" */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      Recommandations & Dossiers thématiques
                      {filteredDossiers.length > 0 && (
                        <Badge variant="secondary" className="ml-1">{filteredDossiers.length}</Badge>
                      )}
                    </h2>
                    {hasActiveFilter && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                        <X className="h-3 w-3" /> Effacer
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher dans les dossiers (titre, résumé, contenu)…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {(['all', 'brouillon', 'publie', 'archive'] as const).map(s => (
                        <Button
                          key={s}
                          variant={filterStatut === s ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setFilterStatut(s)}
                          className="h-8 text-xs"
                        >
                          {s === 'all' ? 'Tous statuts' : STATUT_LABELS[s].label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setFilterCat('all')}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                        filterCat === 'all'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card hover:bg-accent border-border text-foreground/80'
                      )}
                      aria-pressed={filterCat === 'all'}
                    >
                      Toutes
                      <Badge variant={filterCat === 'all' ? 'secondary' : 'outline'} className="h-4 px-1.5 text-[10px]">
                        {dossiers?.length || 0}
                      </Badge>
                    </button>
                    {(Object.keys(CATEGORIE_LABELS) as DossierCategorie[]).map(cat => {
                      const isActive = filterCat === cat;
                      const meta = CATEGORIE_LABELS[cat];
                      const count = catCounts[cat] || 0;
                      return (
                        <button
                          key={cat}
                          onClick={() => setFilterCat(isActive ? 'all' : cat)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card hover:bg-accent border-border text-foreground/80'
                          )}
                          aria-pressed={isActive}
                        >
                          <span aria-hidden>{meta.icon}</span>
                          <span>{meta.label}</span>
                          <Badge variant={isActive ? 'secondary' : 'outline'} className="h-4 px-1.5 text-[10px]">
                            {count}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>

                  {isLoadingDossiers ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-[160px]" />)}
                    </div>
                  ) : filteredDossiers.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-sm text-muted-foreground">
                        Aucun dossier ne correspond à vos critères.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredDossiers.map(d => {
                        const q = focusQuery.toLowerCase();
                        const isMatch = focusQuery && (
                          d.titre?.toLowerCase().includes(q) ||
                          d.resume?.toLowerCase().includes(q)
                        );
                        const cat = CATEGORIE_LABELS[d.categorie];
                        const statut = STATUT_LABELS[d.statut];
                        return (
                          <Card
                            key={d.id}
                            id={`dossier-${d.id}`}
                            className={cn(
                              'group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md scroll-mt-4',
                              isMatch && 'ring-2 ring-primary/50 border-primary/40 bg-primary/[0.03]'
                            )}
                            onClick={() => setSelectedDossier(d)}
                          >
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <span aria-hidden>{cat.icon}</span> {cat.label}
                                </Badge>
                                <Badge variant={statut.variant} className="text-[10px]">
                                  {statut.label}
                                </Badge>
                              </div>
                              <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                                {d.titre}
                              </h3>
                              {d.resume && (
                                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                                  {d.resume}
                                </p>
                              )}
                              <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Source : Dossier interne
                                </span>
                                <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                                  Ouvrir <ExternalLink className="h-3 w-3" />
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-1">
                    <Link
                      to="/radar"
                      className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                    >
                      ← Retour au Centre de Veille
                    </Link>
                  </div>
                </section>

                {/* Section unifiée Mes notes (brouillons + création) */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <Edit3 className="h-4 w-4" /> Mes notes en cours
                      {brouillons.length > 0 && (
                        <Badge variant="secondary" className="ml-1">{brouillons.length}</Badge>
                      )}
                    </h2>
                  </div>
                  
                  {isLoadingDossiers ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-[180px]" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {/* CreateCard en premier pour fusion claire avec "Nouvelle note" */}
                      {isAdmin && <CreateCard onClick={handleNewDossier} />}
                      
                      {brouillons.map(dossier => {
                        const q = focusQuery.toLowerCase();
                        const isMatch = focusQuery && (
                          dossier.titre?.toLowerCase().includes(q) ||
                          dossier.resume?.toLowerCase().includes(q)
                        );
                        return (
                          <div
                            key={dossier.id}
                            id={`dossier-${dossier.id}`}
                            className={cn(
                              'scroll-mt-4 rounded-xl transition-all',
                              isMatch && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                            )}
                          >
                            <BriefingCard
                              dossier={dossier}
                              onClick={() => setSelectedDossier(dossier)}
                              onEdit={() => handleEditDossier(dossier)}
                            />
                          </div>
                        );
                      })}
                      
                      {brouillons.length === 0 && !isAdmin && (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucune note en cours</p>
                        </div>
                      )}
                    </div>
                  )}
                </section>
                
                {/* Section Derniers envois */}
                <section>
                  <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4">
                    <Send className="h-4 w-4" /> Derniers envois au Conseil
                  </h2>
                  
                  {isLoadingDossiers ? (
                    <Skeleton className="h-[200px]" />
                  ) : (
                    <RecentSendsTable 
                      dossiers={publies} 
                      onSelect={setSelectedDossier} 
                    />
                  )}
                </section>
              </div>
              
              {/* COLONNE DROITE : Newsletter Quick View (35%) */}
              <div className="w-full lg:w-[380px] space-y-6">
                
                <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Hebdo Télécoms
                </h2>
                
                <NewsletterWidget />
                
                {/* Brouillons de newsletters */}
                {recentDraftNewsletters.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-orange-500 flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Brouillons à finaliser
                    </h3>
                    {recentDraftNewsletters.map(newsletter => (
                      <NewsletterHistoryItem 
                        key={newsletter.id} 
                        newsletter={newsletter}
                        onClick={() => {
                          setActiveTab('newsletters');
                          setSelectedNewsletterId(newsletter.id);
                          setNewsletterView('preview');
                        }}
                      />
                    ))}
                  </div>
                )}
                
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground">
                    Derniers envois
                  </h3>
                  
                  {isLoadingNewsletters ? (
                    <>
                      <Skeleton className="h-[80px]" />
                      <Skeleton className="h-[80px]" />
                    </>
                  ) : recentSentNewsletters.length > 0 ? (
                    recentSentNewsletters.map(newsletter => (
                      <NewsletterHistoryItem 
                        key={newsletter.id} 
                        newsletter={newsletter}
                        onClick={() => {
                          setActiveTab('newsletters');
                          setSelectedNewsletterId(newsletter.id);
                          setNewsletterView('preview');
                        }}
                      />
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <Mail className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      Aucune newsletter envoyée
                    </div>
                  )}
                </div>
                
                <div className="pt-4 text-center border-t border-border">
                  <button 
                    onClick={() => setActiveTab('newsletters')}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 transition-colors w-full"
                  >
                    <Users className="h-3 w-3" /> Gérer les newsletters & abonnés
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Onglet Newsletters - Gestion complète */}
          <TabsContent value="newsletters" className="space-y-6">
            {newsletterView === 'list' && (
              <Tabs defaultValue="newsletters" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="newsletters">Toutes les newsletters</TabsTrigger>
                  <TabsTrigger value="destinataires">
                    <Users className="h-4 w-4 mr-1" />
                    Destinataires
                  </TabsTrigger>
                  <TabsTrigger value="programmation">
                    <Calendar className="h-4 w-4 mr-1" />
                    Programmation
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="newsletters">
                  <NewsletterList onSelect={handleSelectNewsletter} />
                </TabsContent>

                <TabsContent value="destinataires">
                  <DestinataireManager />
                </TabsContent>

                <TabsContent value="programmation">
                  <NewsletterScheduler />
                </TabsContent>
              </Tabs>
            )}

            {newsletterView === 'generate' && (
              <div className="max-w-2xl mx-auto">
                <Button variant="ghost" onClick={handleNewsletterBack} className="mb-4 gap-2">
                  ← Retour
                </Button>
                <NewsletterGenerator onGenerated={handleNewsletterGenerated} />
              </div>
            )}

            {newsletterView === 'preview' && selectedNewsletter && (
              <NewsletterPreview 
                newsletter={selectedNewsletter}
                onBack={handleNewsletterBack}
                onEdit={() => setNewsletterView('edit')}
                onStudio={() => setNewsletterView('studio')}
                onRefresh={() => refetchNewsletter()}
              />
            )}

            {newsletterView === 'edit' && selectedNewsletter && (
              <NewsletterEditor 
                newsletter={selectedNewsletter}
                onBack={() => setNewsletterView('preview')}
                onSaved={() => {
                  refetchNewsletter();
                  setNewsletterView('preview');
                }}
              />
            )}

            {newsletterView === 'studio' && selectedNewsletter && (
              <NewsletterStudio 
                newsletter={selectedNewsletter}
                onBack={() => setNewsletterView('preview')}
                onSaved={() => {
                  refetchNewsletter();
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* MODE: CRISE - Vue alertes */}
      {mode === 'crise' && (
        <div className="space-y-6">
          {/* Alert Banner */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Mode Crise Activé</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Affichage des documents prioritaires (IA et Acteurs Clés) nécessitant une attention immédiate.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Urgent Documents */}
          <section>
            <h2 className="text-sm font-bold uppercase text-destructive flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4" /> Documents Prioritaires ({urgentDossiers.length})
            </h2>
            
            {isLoadingDossiers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-[180px]" />
                ))}
              </div>
            ) : urgentDossiers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {urgentDossiers.map(dossier => (
                  <BriefingCard 
                    key={dossier.id} 
                    dossier={dossier} 
                    onClick={() => setSelectedDossier(dossier)}
                    onEdit={() => handleEditDossier(dossier)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucun document prioritaire en attente.
                </p>
              </Card>
            )}
          </section>

          {/* Quick action for crisis response */}
          {isAdmin && (
            <div className="flex justify-center">
              <Button 
                variant="destructive" 
                size="lg"
                onClick={handleNewDossier}
                className="gap-2"
              >
                <AlertTriangle className="h-5 w-5" />
                Rédiger une alerte urgente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <DossierFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        dossier={editingDossier}
      />

      <DossierView
        dossier={selectedDossier}
        open={!!selectedDossier}
        onOpenChange={(open) => !open && setSelectedDossier(null)}
        onEdit={handleEditDossier}
      />
    </div>
  );
}
