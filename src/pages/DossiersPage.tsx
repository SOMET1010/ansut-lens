import { useState } from 'react';
import { FileText, Edit3, Send, Mail, Users, AlertTriangle, TrendingUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NavLink } from 'react-router-dom';
import { 
  useDossiers, 
  type Dossier 
} from '@/hooks/useDossiers';
import { useNewsletters } from '@/hooks/useNewsletters';
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

export default function DossiersPage() {
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);
  
  const { isAdmin } = useAuth();
  const { mode, setMode } = useViewMode();
  const { data: dossiers, isLoading: isLoadingDossiers } = useDossiers();
  const { data: newsletters, isLoading: isLoadingNewsletters } = useNewsletters();

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

  const handleEditDossier = (dossier: Dossier) => {
    setSelectedDossier(null);
    setEditingDossier(dossier);
    setIsFormOpen(true);
  };

  const handleNewDossier = () => {
    setEditingDossier(null);
    setIsFormOpen(true);
  };

  // Mode-specific titles and descriptions
  const modeConfig = {
    dg: {
      title: 'Tableau de Bord Stratégique',
      subtitle: 'Vue synthétique pour la Direction Générale',
      icon: TrendingUp
    },
    analyste: {
      title: 'Studio de Publication',
      subtitle: 'Centralisez la production de vos Notes Stratégiques et Newsletters.',
      icon: FileText
    },
    crise: {
      title: 'Centre de Crise',
      subtitle: 'Documents prioritaires et alertes en temps réel.',
      icon: AlertTriangle
    }
  };

  const currentConfig = modeConfig[mode];
  const ModeIcon = currentConfig.icon;

  return (
    <div className="space-y-6 animate-fade-in">
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
          Mode {mode.toUpperCase()}
        </Badge>
      </div>

      {/* MODE: DG - Vue synthétique */}
      {mode === 'dg' && (
        <div className="space-y-6">
          {/* Empty State when no published content */}
          {publies.length === 0 && !isLoadingDossiers && (
            <Card className="p-12 text-center border-dashed border-2">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-bold mb-2">Bienvenue dans le Studio de Publication</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Le tableau de bord stratégique affiche les documents validés. 
                Passez en mode Analyste pour créer et publier du contenu.
              </p>
              <Button onClick={() => setMode('analyste')}>
                <FileText className="h-4 w-4 mr-2" />
                Passer en mode Analyste
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
        </div>
      )}

      {/* MODE: ANALYSTE - Vue complète */}
      {mode === 'analyste' && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* COLONNE GAUCHE : Notes & Briefings (65%) */}
          <div className="flex-1 space-y-8">
            
            {/* Section Brouillons */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Edit3 className="h-4 w-4" /> Brouillons & En cours
                </h2>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary hover:text-primary"
                    onClick={handleNewDossier}
                  >
                    + Nouvelle Note
                  </Button>
                )}
              </div>
              
              {isLoadingDossiers ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-[180px]" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {brouillons.map(dossier => (
                    <BriefingCard 
                      key={dossier.id} 
                      dossier={dossier} 
                      onClick={() => setSelectedDossier(dossier)}
                      onEdit={() => handleEditDossier(dossier)}
                    />
                  ))}
                  
                  {isAdmin && <CreateCard onClick={handleNewDossier} />}
                  
                  {brouillons.length === 0 && !isAdmin && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun brouillon en cours</p>
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
          
          {/* COLONNE DROITE : Newsletter Studio (35%) */}
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
                    onClick={() => window.location.href = `/admin/newsletters`}
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
              <NavLink 
                to="/admin/newsletters" 
                className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 transition-colors"
              >
                <Users className="h-3 w-3" /> Gérer les abonnés & modèles
              </NavLink>
            </div>
          </div>
        </div>
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
