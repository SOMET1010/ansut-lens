import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Edit3, Send, Mail, Users, AlertTriangle, TrendingUp, Eye, Sparkles, Calendar, Palette, Archive, Newspaper, Radio, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useDossiers, 
  type Dossier 
} from '@/hooks/useDossiers';
import { useNewsletters, useNewsletter } from '@/hooks/useNewsletters';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
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
import { PhraseSynthese } from '@/components/common';
import { NewsletterStudio } from '@/components/newsletter/studio';
import { CoffreContenu } from '@/components/dossiers/CoffreContenu';
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
  const [activeTab, setActiveTab] = useState<'notes' | 'newsletters' | 'coffre'>('notes');
  
  // Newsletter management states
  const [newsletterView, setNewsletterView] = useState<NewsletterView>('list');
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  
  const { isAdmin } = useAuth();
  const { hasPermission } = useUserPermissions();
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

  // Garde-fou : le mode "crise" est définitivement désactivé sur cette page.
  // Si le contexte global est en "crise", on force l'affichage en mode analyste.
  const safeMode: 'dg' | 'analyste' = mode === 'dg' ? 'dg' : 'analyste';

  // Filter dossiers by status
  const brouillons = dossiers?.filter(d => d.statut === 'brouillon') || [];
  const publies = dossiers?.filter(d => d.statut === 'publie') || [];

  // Get recent newsletters (both sent and drafts)
  const recentSentNewsletters = newsletters?.filter(n => n.statut === 'envoye').slice(0, 3) || [];
  const recentDraftNewsletters = newsletters?.filter(n => n.statut === 'brouillon' || n.statut === 'en_revision').slice(0, 2) || [];

  // Totaux réels (non tronqués) pour la phrase de synthèse — comptages bruts.
  const totalNewslettersEnvoyees = newsletters?.filter(n => n.statut === 'envoye').length ?? 0;


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

  // Mode-specific titles and descriptions (mode "crise" exclu de cette page)
  const modeConfig = {
    dg: {
      title: 'Statistiques',
      subtitle: 'Synthèse chiffrée des productions et envois.',
      icon: TrendingUp,
      label: 'STATISTIQUES'
    },
    analyste: {
      title: 'Studio Publication',
      subtitle: 'Centralisez la production de vos Notes Stratégiques et Newsletters.',
      icon: FileText,
      label: 'PRODUCTION'
    },
  } as const;

  const currentConfig = modeConfig[safeMode];
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
            <ModeIcon className="h-7 w-7 text-primary" />
            {currentConfig.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentConfig.subtitle}
          </p>
        </div>
        
        {/* Mode indicator badge */}
        <Badge
          variant="secondary"
          className="uppercase text-xs tracking-wider"
        >
          <Eye className="h-3 w-3 mr-1" />
          Mode {currentConfig.label}
        </Badge>
      </div>

      {/* Phrase de synthèse — signature RADAR. Constat d'état de la production
          éditoriale (comptages bruts), jamais un objectif ni un chiffre inventé. */}
      {isLoadingDossiers && !dossiers ? (
        <PhraseSynthese contexte="production" phrase="" isLoading />
      ) : (publies.length > 0 || brouillons.length > 0 || totalNewslettersEnvoyees > 0) ? (
        <PhraseSynthese
          contexte="production"
          phrase={
            <>
              <span className="font-semibold">
                {publies.length} dossier{publies.length > 1 ? 's' : ''} publié{publies.length > 1 ? 's' : ''}
              </span>
              {brouillons.length > 0 && (
                <>, {brouillons.length} en préparation</>
              )}
              {'.'}
              {totalNewslettersEnvoyees > 0 && (
                <>
                  {' '}
                  {totalNewslettersEnvoyees} newsletter{totalNewslettersEnvoyees > 1 ? 's' : ''} diffusée
                  {totalNewslettersEnvoyees > 1 ? 's' : ''}.
                </>
              )}
            </>
          }
          note="Comptages bruts de la base éditoriale."
        />
      ) : (
        <PhraseSynthese
          contexte="production"
          phrase="Aucune production éditoriale pour l'instant. Les dossiers et notes publiés apparaîtront ici."
        />
      )}

      {/*
        Produire & diffuser — la fabrication et l'envoi de la matinale et des
        résumés sont des activités du PRODUIT (règle de navigation : la valeur
        éditoriale vit dans les écrans, pas dans l'administration). Ces accès
        remontent ici l'ancien sas « À intégrer au produit ». Réservés à qui
        peut réellement produire (`manage_newsletters`).
      */}
      {hasPermission('manage_newsletters') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/admin/matinale"
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Newspaper className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                Note « Ce matin »
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Composer, exporter et diffuser la synthèse du matin.
              </span>
            </span>
          </Link>
          <Link
            to="/admin/diffusion"
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Radio className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                Canaux de diffusion
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Programmer l’envoi du résumé par courriel, SMS ou Telegram.
              </span>
            </span>
          </Link>
        </div>
      )}

      {/* MODE: DG - Vue synthétique */}
      {safeMode === 'dg' && (
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
                        <p className="text-3xl font-bold text-attention">{brouillons.length}</p>
                      </div>
                      <div className="h-12 w-12 bg-attention/10 rounded-full flex items-center justify-center">
                        <Edit3 className="h-6 w-6 text-attention" />
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

            </>
          )}
        </div>
      )}

      {/* MODE: ANALYSTE - Vue complète avec onglets */}
      {safeMode === 'analyste' && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notes' | 'newsletters' | 'coffre')} className="space-y-6">
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
              <TabsTrigger value="coffre" className="gap-2">
                <Archive className="h-4 w-4" />
                Coffre à contenus
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
                    <h3 className="text-xs font-bold uppercase text-attention flex items-center gap-1">
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

      {/* Mode "crise" supprimé sur demande de l'audit */}

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
