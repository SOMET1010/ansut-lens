import { useState } from 'react';
import { FileText, Edit3, Send, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NavLink } from 'react-router-dom';
import { 
  useDossiers, 
  type Dossier 
} from '@/hooks/useDossiers';
import { useNewsletters } from '@/hooks/useNewsletters';
import { useAuth } from '@/contexts/AuthContext';
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
  const { data: dossiers, isLoading: isLoadingDossiers } = useDossiers();
  const { data: newsletters, isLoading: isLoadingNewsletters } = useNewsletters();

  // Filter dossiers by status
  const brouillons = dossiers?.filter(d => d.statut === 'brouillon') || [];
  const publies = dossiers?.filter(d => d.statut === 'publie') || [];
  
  // Get recent sent newsletters
  const recentNewsletters = newsletters?.filter(n => n.statut === 'envoye').slice(0, 3) || [];

  const handleEditDossier = (dossier: Dossier) => {
    setSelectedDossier(null);
    setEditingDossier(dossier);
    setIsFormOpen(true);
  };

  const handleNewDossier = () => {
    setEditingDossier(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            Studio de Publication
          </h1>
          <p className="text-muted-foreground mt-1">
            Centralisez la production de vos Notes Stratégiques et Newsletters.
          </p>
        </div>
      </div>

      {/* LAYOUT 2 COLONNES */}
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
                
                {/* Create card - always visible for admins */}
                {isAdmin && <CreateCard onClick={handleNewDossier} />}
                
                {/* Empty state when no drafts and not admin */}
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
          
          {/* Widget Generation */}
          <NewsletterWidget />
          
          {/* Historique recent */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">
              Derniers envois
            </h3>
            
            {isLoadingNewsletters ? (
              <>
                <Skeleton className="h-[80px]" />
                <Skeleton className="h-[80px]" />
              </>
            ) : recentNewsletters.length > 0 ? (
              recentNewsletters.map(newsletter => (
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
          
          {/* Lien Admin */}
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
