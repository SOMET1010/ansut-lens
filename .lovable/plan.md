

# Transformation de la Page des Rôles en "Cartes d'Accréditation"

## Vision

Remplacer l'approche actuelle "matrice de permissions Excel" par une interface visuelle **"Cartes d'Accréditation"** où chaque rôle est présenté comme un badge de sécurité autonome, avec un résumé visuel des pouvoirs et un compteur de membres.

## Analyse de l'existant

### Points faibles actuels
- Interface sous forme de tableaux avec cases à cocher (cognitif lourd)
- Orientation "par permission" plutôt que "par rôle"
- Pas de contexte humain (combien de personnes ont ce rôle ?)
- Pas de hiérarchie visuelle des niveaux d'accès

### Données disponibles
- 17 permissions organisées en 3 catégories (consultation, actions, admin)
- 4 rôles prédéfinis (admin, user, council_user, guest)
- Comptage des membres par rôle (actuellement 3 admins, 2 users dans la base)
- Système de toggle existant fonctionnel

## Architecture proposée

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ← Retour    Rôles & Accréditations           [Documentation]      │
│              Définissez les niveaux d'accès aux données sensibles  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Note RBAC ──────────────────────────────────────────────────┐  │
│  │  Les permissions sont appliquées immédiatement...            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐          │
│  │ 🛡️ ADMIN       │ │ 📊 ANALYSTE    │ │ 🎯 DÉCIDEUR    │          │
│  │ Violet         │ │ Bleu           │ │ Orange         │          │
│  │                │ │                │ │                │          │
│  │ 3 membres      │ │ 2 membres      │ │ 0 membres      │          │
│  │                │ │                │ │                │          │
│  │ Accès autorisés│ │ Accès autorisés│ │ Accès autorisés│          │
│  │ ✓ Consultation │ │ ✓ Consultation │ │ ✓ Consultation │          │
│  │ ✓ Actions      │ │ ✓ Actions      │ │ ○ Actions      │          │
│  │ ✓ Admin        │ │ ○ Admin        │ │ ○ Admin        │          │
│  │                │ │                │ │                │          │
│  │ [🔒 Protégé]   │ │ [Configurer]   │ │ [Configurer]   │          │
│  └────────────────┘ └────────────────┘ └────────────────┘          │
│                                                                     │
│  ┌────────────────┐                                                 │
│  │ 👁️ OBSERVATEUR │                                                 │
│  │ Gris           │                                                 │
│  │ 0 membres      │                                                 │
│  │ [Configurer]   │                                                 │
│  └────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/admin/RoleAccreditationCard.tsx` | Carte d'accréditation pour chaque rôle |
| `src/components/admin/RolePermissionsDialog.tsx` | Dialog pour configurer les permissions d'un rôle |

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/admin/RolesPage.tsx` | Refonte complète avec vue cartes |
| `src/hooks/useRolePermissions.ts` | Ajouter le comptage des membres par rôle |
| `src/components/admin/index.ts` | Exporter les nouveaux composants |

## Détails des composants

### 1. RoleAccreditationCard.tsx

Carte visuelle pour chaque rôle avec :

```text
Props:
- role: { value, label, description, theme, userCount, isSystem }
- permissions: Permission[]
- rolePermissions: RolePermission[]
- onConfigure: () => void

Structure visuelle:
┌───────────────────────────────────────┐
│ [🔒]                     3 membres 👥 │  <- Badge compteur
│                                       │
│  ┌────────┐                           │
│  │  🛡️   │  ADMINISTRATEUR           │  <- Icône + Titre
│  └────────┘  Accès complet            │  <- Description
│                                       │
│  ACCÈS AUTORISÉS                      │
│  ✓ Consultation (4/4)    Complet      │  <- Résumé catégorie
│  ✓ Actions (4/4)         Complet      │
│  ✓ Administration (9/9)  Complet      │
│                                       │
│  ─────────────────────────────────    │
│  [         Configurer         ]       │  <- Bouton action
└───────────────────────────────────────┘
```

Couleurs sémantiques :
- Admin : Violet (pouvoir royal)
- Analyste (user) : Bleu (travail standard)
- Décideur (council_user) : Orange/Ambre (VIP consultation)
- Observateur (guest) : Gris (accès minimal)

### 2. RolePermissionsDialog.tsx

Dialog pour modifier les permissions d'un rôle spécifique :

```text
┌─────────────────────────────────────────────────────┐
│ Configurer : Analyste                          [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  👁️ CONSULTATION                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ [✓] Voir le radar           Accès au tableau│   │
│  │ [✓] Voir les actualités     Liste des news  │   │
│  │ [✓] Voir les personnalités  Fiches acteurs  │   │
│  │ [✓] Voir les dossiers       Dossiers strat. │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ⚡ ACTIONS                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ [✓] Créer des flux          Propres flux    │   │
│  │ [✓] Modifier les dossiers   Créer/modifier  │   │
│  │ [✓] Utiliser l'assistant    Questions IA    │   │
│  │ [ ] Recevoir des alertes    Notifications   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ⚙️ ADMINISTRATION                                  │
│  ┌─────────────────────────────────────────────┐   │
│  │ [ ] Accès administration                    │   │
│  │ [ ] Gérer les utilisateurs                  │   │
│  │ [ ] ...                                     │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│                            [Annuler]  [Enregistrer] │
└─────────────────────────────────────────────────────┘
```

### 3. Modification de useRolePermissions.ts

Ajouter une query pour compter les membres par rôle :

```typescript
// Nouvelle query pour le comptage
const userCountByRoleQuery = useQuery({
  queryKey: ['user-count-by-role'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role');
    
    if (error) throw error;
    
    // Compter par rôle
    const counts: Record<string, number> = {
      admin: 0,
      user: 0,
      council_user: 0,
      guest: 0,
    };
    
    data?.forEach(({ role }) => {
      if (role in counts) counts[role]++;
    });
    
    return counts;
  },
});

// Ajouter dans le return
return {
  // ...existing
  userCountByRole: userCountByRoleQuery.data ?? { admin: 0, user: 0, council_user: 0, guest: 0 },
};
```

### 4. Refonte de RolesPage.tsx

Structure principale :

```typescript
export default function RolesPage() {
  const { 
    permissions,
    permissionsByCategory, 
    hasRolePermission, 
    togglePermission,
    userCountByRole,
    isLoading 
  } = useRolePermissions();

  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const ROLES_CONFIG = [
    { 
      value: 'admin', 
      label: 'Administrateur', 
      description: 'Accès complet à la configuration et aux données',
      theme: 'purple',
      icon: Shield,
      isSystem: true,
    },
    { 
      value: 'user', 
      label: 'Analyste', 
      description: 'Peut créer des veilles et rédiger des notes',
      theme: 'blue',
      icon: BarChart3,
      isSystem: false,
    },
    { 
      value: 'council_user', 
      label: 'Décideur', 
      description: 'Consultation des rapports finaux uniquement',
      theme: 'amber',
      icon: Crown,
      isSystem: false,
    },
    { 
      value: 'guest', 
      label: 'Observateur', 
      description: 'Accès temporaire restreint',
      theme: 'slate',
      icon: Eye,
      isSystem: false,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      {/* Note RBAC */}
      
      {/* Grille des cartes d'accréditation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {ROLES_CONFIG.map(role => (
          <RoleAccreditationCard
            key={role.value}
            role={role}
            userCount={userCountByRole[role.value] || 0}
            permissionsByCategory={permissionsByCategory}
            hasRolePermission={hasRolePermission}
            onConfigure={() => setSelectedRole(role.value)}
          />
        ))}
      </div>

      {/* Dialog de configuration */}
      <RolePermissionsDialog
        open={!!selectedRole}
        onOpenChange={() => setSelectedRole(null)}
        role={ROLES_CONFIG.find(r => r.value === selectedRole)}
        permissions={permissions}
        permissionsByCategory={permissionsByCategory}
        hasRolePermission={hasRolePermission}
        onToggle={togglePermission.mutate}
        isLoading={togglePermission.isPending}
      />
    </div>
  );
}
```

## Avantages de la nouvelle approche

| Aspect | Avant (Matrice) | Après (Cartes) |
|--------|-----------------|----------------|
| **Orientation** | Par permission | Par rôle |
| **Compréhension** | Technique (codes) | Métier (niveaux) |
| **Contexte humain** | Aucun | Compteur membres |
| **Charge cognitive** | Élevée (17×4 cases) | Faible (4 cartes) |
| **Sécurité visuelle** | Abstraite | Couleurs + icônes |
| **Actions** | Dans le tableau | Dans un dialog dédié |

## Labels métier enrichis

Cohérence avec la page UsersPage :

| Rôle technique | Label affiché | Icône | Couleur |
|----------------|---------------|-------|---------|
| `admin` | Administrateur | Shield | Violet |
| `user` | Analyste | BarChart3 | Bleu |
| `council_user` | Décideur | Crown | Orange/Ambre |
| `guest` | Observateur | Eye | Gris |

## Résumé des permissions par catégorie

Sur chaque carte, afficher un résumé :
- ✓ Consultation (4/4) → Complet
- ✓ Consultation (2/4) → Partiel
- ○ Consultation (0/4) → Aucun

Cela permet de voir en un coup d'œil le niveau d'accès sans ouvrir le détail.

## Résultat attendu

1. **Vue d'ensemble claire** - 4 cartes représentant les 4 niveaux d'accréditation
2. **Contexte humain** - Combien de personnes ont chaque rôle
3. **Hiérarchie visuelle** - Couleurs sémantiques indiquant le niveau de pouvoir
4. **Configuration séparée** - Dialog dédié pour modifier les permissions
5. **Protection visible** - Badge "Protégé" sur le rôle Admin
6. **Cohérence UI** - Même style que les UserCard de la page utilisateurs

