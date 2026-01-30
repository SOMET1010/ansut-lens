

# Transformation de "Dossiers" en "Studio de Publication"

## Diagnostic

La page actuelle (`DossiersPage.tsx`) présente plusieurs problèmes :

1. **Identité floue** : Elle ressemble à un classeur/dossier statique plutôt qu'à un atelier de production
2. **Cartes mégatendances volumineuses** : Elles prennent de l'espace sans apporter de valeur actionnable
3. **Pas de workflow visible** : Aucune distinction entre "En cours" et "Livré"
4. **Newsletter isolée** : Le générateur de newsletter est caché dans l'Administration alors qu'il s'agit d'un livrable

## Architecture de la transformation

```text
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│  📝 Studio de Publication                                                                 │
│  Centralisez la production de vos Notes Stratégiques et Newsletters.                     │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  COLONNE GAUCHE (65%)                    │  COLONNE DROITE (35%)                         │
│  ┌─────────────────────────────────────┐ │  ┌────────────────────────────────────────┐   │
│  │ 📄 Notes & Briefings   [+ Nouveau]  │ │  │ 📧 Hebdo Télécoms                      │   │
│  │                                     │ │  │                                        │   │
│  │ ✍️ Brouillons & En cours            │ │  │  ┌────────────────────────────────┐   │   │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐│ │  │  │ 🟣 WIDGET GÉNÉRATION MAGIQUE   │   │   │
│  │ │Note     │ │Alerte   │ │+ Créer  ││ │  │  │ "Semaine 42"                   │   │   │
│  │ │Impact5G │ │Rachat   │ │         ││ │  │  │ "L'IA a sélectionné 12 articles│   │   │
│  │ │[Brouil] │ │[Revue]  │ │         ││ │  │  │ pour 145 décideurs"            │   │   │
│  │ └─────────┘ └─────────┘ └─────────┘│ │  │  │                                │   │   │
│  │                                     │ │  │  │ [⚡ Générer le brouillon]      │   │   │
│  │ 📤 Derniers envois au Conseil      │ │  │  └────────────────────────────────┘   │   │
│  │ ┌───────────────────────────────────┐│ │  │                                        │   │
│  │ │ Titre           │ Date   │ Action ││ │  │  📬 Derniers envois                    │   │
│  │ │ Rapport Q4 2025 │ 15 Jan │  Voir  ││ │  │  ┌────────────────────────────────┐   │   │
│  │ │ Note Régulation │ 10 Jan │  Voir  ││ │  │  │ 24 JAN │ Essentiel #41 │ 68% │   │   │
│  │ └───────────────────────────────────┘│ │  │  │ 17 JAN │ Spécial Infra │ 72% │   │   │
│  │                                     │ │  │  └────────────────────────────────┘   │   │
│  └─────────────────────────────────────┘ │  │                                        │   │
│                                          │  │  [🔗 Gérer les abonnés & modèles]       │   │
│                                          │  └────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers a modifier/creer

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/pages/DossiersPage.tsx` | Remplacer | Nouveau layout "Studio de Publication" en 2 colonnes |
| `src/components/dossiers/BriefingCard.tsx` | Creer | Carte moderne pour les notes/briefings |
| `src/components/dossiers/NewsletterWidget.tsx` | Creer | Widget de generation rapide Newsletter |
| `src/components/dossiers/RecentSendsTable.tsx` | Creer | Tableau des derniers envois au Conseil |
| `src/components/dossiers/NewsletterHistoryItem.tsx` | Creer | Item d'historique newsletter compact |

---

## Details d'implementation

### 1. Nouveau composant BriefingCard

Carte de note/briefing avec statut visuel, auteur et actions :

```tsx
interface BriefingCardProps {
  dossier: Dossier;
  onClick: () => void;
}

// Statuts visuels
const statusStyles = {
  brouillon: { color: 'bg-muted text-muted-foreground', label: 'Brouillon', icon: Edit3 },
  publie: { color: 'bg-green-50 text-green-700', label: 'Envoye', icon: CheckCircle },
  archive: { color: 'bg-secondary text-secondary-foreground', label: 'Archive', icon: Archive },
};

// Structure de la carte
<Card className="hover:shadow-md transition-all cursor-pointer">
  {/* Badge type (Note de Synthese, Alerte, Rapport) */}
  <Badge className="bg-primary/10 text-primary text-[10px]">
    {CATEGORIE_LABELS[dossier.categorie].label}
  </Badge>
  
  {/* Titre */}
  <h3 className="font-bold text-sm leading-tight">{dossier.titre}</h3>
  
  {/* Resume tronque */}
  <p className="text-xs text-muted-foreground line-clamp-2">{dossier.resume}</p>
  
  {/* Footer : Auteur + Date + Statut */}
  <div className="flex items-center justify-between border-t pt-3">
    <div className="flex items-center gap-2">
      <Avatar className="h-5 w-5" />
      <span className="text-xs">{formatRelativeDate(dossier.updated_at)}</span>
    </div>
    <Badge variant={statutInfo.variant}>{statutInfo.label}</Badge>
  </div>
</Card>
```

### 2. Widget Newsletter "Magique"

Widget gradient qui propose de generer la newsletter de la semaine :

```tsx
// Recuperation des stats de contenu disponible
const { data: previewStats } = useQuery({
  queryKey: ['newsletter-preview-stats'],
  queryFn: async () => {
    // Compter actualites des 7 derniers jours
    // Compter destinataires actifs
    return { actualites: 12, destinataires: 145 };
  },
});

// Structure du widget
<div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
  <div className="flex items-center gap-2 text-sm opacity-80">
    <Calendar className="h-4 w-4" />
    Semaine {getWeekNumber(new Date())}
  </div>
  
  <h3 className="text-xl font-bold">La Newsletter est prete a etre generee.</h3>
  
  <p className="text-sm opacity-80">
    L'IA a selectionne {previewStats.actualites} articles pertinents 
    pour votre audience de {previewStats.destinataires} decideurs.
  </p>
  
  <Button onClick={handleGenerateNewsletter} className="w-full bg-background text-primary">
    <Sparkles className="h-4 w-4 mr-2 text-orange-500" />
    Generer le brouillon
  </Button>
</div>
```

### 3. Tableau des derniers envois

Liste des dossiers publies recents sous forme de tableau compact :

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Titre du document</TableHead>
      <TableHead>Thematique</TableHead>
      <TableHead>Date d'envoi</TableHead>
      <TableHead>Destinataires</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {publiedDossiers.map(dossier => (
      <TableRow key={dossier.id} className="hover:bg-muted/50">
        <TableCell className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {dossier.titre}
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{CATEGORIE_LABELS[dossier.categorie].label}</Badge>
        </TableCell>
        <TableCell>{format(dossier.updated_at, 'dd MMM yyyy')}</TableCell>
        <TableCell>DG, PCA</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm">Voir</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 4. Historique Newsletter compact

Items d'historique avec date, titre et taux d'ouverture :

```tsx
<div className="flex items-center gap-4 p-4 bg-card border rounded-xl">
  {/* Badge date */}
  <div className="flex flex-col items-center h-12 w-12 bg-primary/10 rounded-lg">
    <span className="text-[10px] font-bold uppercase">{format(date, 'MMM')}</span>
    <span className="text-lg font-bold">{format(date, 'dd')}</span>
  </div>
  
  {/* Info */}
  <div className="flex-1">
    <h4 className="font-bold text-sm">{newsletter.contenu?.edito?.texte?.slice(0,40)}...</h4>
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-green-600 bg-green-50">
        <Send className="h-3 w-3 mr-1" /> Envoye
      </Badge>
      <span className="text-xs text-muted-foreground">{openRate}% ouvertures</span>
    </div>
  </div>
  
  {/* Action */}
  <Button variant="ghost" size="icon"><Edit3 /></Button>
</div>
```

---

## Structure finale de DossiersPage.tsx

```tsx
export default function DossiersPage() {
  // States
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGeneratingNewsletter, setIsGeneratingNewsletter] = useState(false);
  
  // Data
  const { data: dossiers, isLoading } = useDossiers();
  const { data: newsletters } = useNewsletters();
  const { isAdmin } = useAuth();
  
  // Filtres
  const brouillons = dossiers?.filter(d => d.statut === 'brouillon') || [];
  const publies = dossiers?.filter(d => d.statut === 'publie') || [];
  const recentNewsletters = newsletters?.filter(n => n.statut === 'envoye').slice(0, 3) || [];
  
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Studio de Publication</h1>
          <p className="text-muted-foreground">
            Centralisez la production de vos Notes Strategiques et Newsletters.
          </p>
        </div>
      </div>
      
      {/* LAYOUT 2 COLONNES */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* COLONNE GAUCHE : Notes & Briefings */}
        <div className="flex-1 space-y-6">
          
          {/* Section Brouillons */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Edit3 className="h-4 w-4" /> Brouillons & En cours
              </h2>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(true)}>
                  + Nouvelle Note
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brouillons.map(dossier => (
                <BriefingCard 
                  key={dossier.id} 
                  dossier={dossier} 
                  onClick={() => setSelectedDossier(dossier)} 
                />
              ))}
              
              {/* Carte creation */}
              {isAdmin && (
                <CreateCard onClick={() => setIsFormOpen(true)} />
              )}
            </div>
          </section>
          
          {/* Section Derniers envois */}
          <section>
            <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4">
              <Send className="h-4 w-4" /> Derniers envois au Conseil
            </h2>
            <RecentSendsTable dossiers={publies} onSelect={setSelectedDossier} />
          </section>
          
        </div>
        
        {/* COLONNE DROITE : Newsletter Studio */}
        <div className="w-full lg:w-[400px] space-y-6">
          
          <h2 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" /> Hebdo Telecoms
          </h2>
          
          {/* Widget Generation */}
          <NewsletterWidget 
            onGenerate={() => setIsGeneratingNewsletter(true)} 
          />
          
          {/* Historique recent */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">
              Derniers envois
            </h3>
            {recentNewsletters.map(newsletter => (
              <NewsletterHistoryItem 
                key={newsletter.id} 
                newsletter={newsletter} 
              />
            ))}
          </div>
          
          {/* Lien Admin */}
          <div className="pt-4 text-center">
            <NavLink 
              to="/admin/newsletters" 
              className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
            >
              <Users className="h-3 w-3" /> Gerer les abonnes & modeles
            </NavLink>
          </div>
          
        </div>
        
      </div>
      
      {/* Dialogs existants */}
      <DossierFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} dossier={null} />
      <DossierView 
        dossier={selectedDossier} 
        open={!!selectedDossier} 
        onOpenChange={(open) => !open && setSelectedDossier(null)}
        onEdit={(d) => { setSelectedDossier(null); setIsFormOpen(true); }}
      />
      
    </div>
  );
}
```

---

## Separation des responsabilites

| Page | Responsabilite |
|------|----------------|
| **DossiersPage** (Studio) | Creer, rediger, valider et envoyer des livrables |
| **Admin/NewslettersPage** | Configurer les templates, abonnes et programmation SMTP |

La page Admin conserve les onglets "Destinataires" et "Programmation", mais le generateur principal migre vers le Studio.

---

## Recapitulatif des ameliorations UX

| Avant | Apres |
|-------|-------|
| Page "Dossiers Strategiques" statique | "Studio de Publication" oriente action |
| Cartes megatendances volumineuses | Header compact, espace maximise |
| Pas de workflow visible | Sections "Brouillons" vs "Envoyes" |
| Newsletter cachee dans Admin | Widget proactif "Generer le brouillon" |
| Tableau generique | Tableau des envois recents avec contexte |
| Isolation des outils | Vision unifiee Notes + Newsletter |

