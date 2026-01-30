

# Ajout des fonctionnalités Archiver et Supprimer pour les Acteurs

## Vue d'ensemble

Ajouter la possibilité d'archiver (soft delete via `actif = false`) ou de supprimer définitivement un acteur depuis l'interface utilisateur, avec confirmation et feedback visuel.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ACTEUR CARD (Hover Actions)                                                    │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                           │ │
│  │  [Avatar]  Jean Dupont                                                   │ │
│  │            Directeur Général - ANSUT                                      │ │
│  │                                                                           │ │
│  │  [Cercle 1] [Régulateur]                           [✏️] [📦] [⋮]         │ │
│  │                                                     Edit Archive More     │ │
│  │                                                                           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  Menu déroulant "⋮" :                                                          │
│  ┌──────────────────┐                                                          │
│  │ 📦 Archiver      │ ← Soft delete (actif = false)                           │
│  │ 🗑️ Supprimer     │ ← Hard delete (confirmation requise)                    │
│  └──────────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  PANNEAU DÉTAIL (Sheet) - Actions Admin                                        │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  [Avatar]  Jean Dupont                [Modifier] [⋮]                      │ │
│  │            Directeur Général                                              │ │
│  │            ...                                                            │ │
│  │                                                                           │ │
│  │  ─────────────────────────────────────────────────────────               │ │
│  │                                                                           │ │
│  │  Zone Danger (en bas du panneau)                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  ⚠️ Zone sensible                                                   │ │ │
│  │  │  [📦 Archiver cet acteur]  [🗑️ Supprimer définitivement]           │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/personnalites/ActeurCard.tsx` | Ajouter menu dropdown avec options archiver/supprimer |
| `src/components/personnalites/ActeurDetail.tsx` | Ajouter zone "Danger" avec boutons archiver/supprimer |
| `src/pages/PersonnalitesPage.tsx` | Ajouter dialog de confirmation de suppression + logique |

---

## Logique métier

### Archiver (Soft Delete)
- Met à jour `actif = false` via `useUpdatePersonnalite`
- L'acteur n'apparaît plus dans la liste par défaut (filtre `actif: true`)
- Réversible : peut être restauré ultérieurement

### Supprimer (Hard Delete)  
- Supprime définitivement via `useDeletePersonnalite` (hook existant)
- Requiert une confirmation explicite
- Action irréversible

---

## Composants à implémenter

### 1. Menu d'actions dans ActeurCard

Ajout d'un `DropdownMenu` avec les options :
- Modifier (existant)
- Archiver
- Supprimer

```tsx
// ActeurCard.tsx - Menu contextuel
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={onEdit}>
      <Pencil className="h-4 w-4 mr-2" />
      Modifier
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onArchive}>
      <Archive className="h-4 w-4 mr-2" />
      Archiver
    </DropdownMenuItem>
    <DropdownMenuItem onClick={onDelete} className="text-destructive">
      <Trash2 className="h-4 w-4 mr-2" />
      Supprimer
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 2. Zone Danger dans ActeurDetail

Section en bas du panneau de détail (visible uniquement pour les admins) :

```tsx
// ActeurDetail.tsx - Zone Danger
{isAdmin && (
  <>
    <Separator className="my-4" />
    <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
      <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Zone sensible
      </h3>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onArchive}
          className="gap-1"
        >
          <Archive className="h-3.5 w-3.5" />
          Archiver
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={onDelete}
          className="gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer
        </Button>
      </div>
    </div>
  </>
)}
```

### 3. Dialog de confirmation

Ajout d'un `AlertDialog` dans `PersonnalitesPage.tsx` :

```tsx
// PersonnalitesPage.tsx - État
const [deletingActeur, setDeletingActeur] = useState<Personnalite | null>(null);
const deletePersonnalite = useDeletePersonnalite();
const updatePersonnalite = useUpdatePersonnalite();

// Fonctions
const handleArchive = async (acteur: Personnalite) => {
  await updatePersonnalite.mutateAsync({ id: acteur.id, actif: false });
  toast.success('Acteur archivé', { 
    description: `${acteur.prenom || ''} ${acteur.nom} a été archivé.` 
  });
  setDetailOpen(false);
};

const confirmDelete = async () => {
  if (deletingActeur) {
    await deletePersonnalite.mutateAsync(deletingActeur.id);
    toast.success('Acteur supprimé', { 
      description: `${deletingActeur.prenom || ''} ${deletingActeur.nom} a été supprimé définitivement.` 
    });
    setDeletingActeur(null);
    setDetailOpen(false);
  }
};

// Dialog de confirmation
<AlertDialog open={!!deletingActeur} onOpenChange={(open) => !open && setDeletingActeur(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Supprimer cet acteur ?</AlertDialogTitle>
      <AlertDialogDescription>
        L'acteur "{deletingActeur?.prenom} {deletingActeur?.nom}" sera 
        définitivement supprimé. Cette action est irréversible.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Annuler</AlertDialogCancel>
      <AlertDialogAction 
        onClick={confirmDelete} 
        className="bg-destructive text-destructive-foreground"
      >
        Supprimer
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Props à ajouter

### ActeurCard

```tsx
interface ActeurCardProps {
  personnalite: Personnalite;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;  // NOUVEAU
  onDelete?: () => void;   // NOUVEAU
}
```

### ActeurDetail

```tsx
interface ActeurDetailProps {
  personnalite: Personnalite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onArchive?: () => void;  // NOUVEAU
  onDelete?: () => void;   // NOUVEAU
}
```

---

## Flux utilisateur

### Archivage
1. Clic sur "Archiver" (card ou détail)
2. Action immédiate avec toast de confirmation
3. L'acteur disparaît de la liste (car filtre `actif: true`)

### Suppression
1. Clic sur "Supprimer" (card ou détail)
2. Dialog de confirmation s'affiche
3. Confirmation → suppression + toast
4. L'acteur est définitivement supprimé

---

## Récapitulatif des changements

| Composant | Changement |
|-----------|------------|
| `ActeurCard.tsx` | Ajouter `DropdownMenu` avec Archiver/Supprimer |
| `ActeurDetail.tsx` | Ajouter zone "Danger" avec boutons d'action |
| `PersonnalitesPage.tsx` | Ajouter état `deletingActeur`, hooks, AlertDialog, handlers |
| `usePersonnalites.ts` | Aucun changement (hooks déjà existants) |

