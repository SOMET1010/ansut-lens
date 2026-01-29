

## Analyse UX/Design : Améliorations pour la page Journal d'audit

### Problèmes identifiés

En comparant `AuditLogsPage` avec les autres pages d'administration (`UsersPage`, `SourcesPage`, `RolesPage`), plusieurs incohérences et opportunités d'amélioration apparaissent :

---

### 1. **Absence de compteurs statistiques**

| Page | Compteurs | Status |
|------|-----------|--------|
| UsersPage | ✅ 4 cartes (Total, Actifs, En attente, Désactivés) | OK |
| SourcesPage | ✅ 4 cartes (Total, Actives, Sites, RSS) | OK |
| AuditLogsPage | ❌ Aucun compteur | À ajouter |

**Amélioration proposée** : Ajouter 4 cartes de statistiques en haut de page :
- Total des logs
- Invitations
- Changements de rôle
- Réinitialisations MDP

---

### 2. **Absence de recherche textuelle**

| Page | Recherche | Status |
|------|-----------|--------|
| UsersPage | ✅ Barre de recherche (nom, email) | OK |
| SourcesPage | ✅ Barre de recherche (nom, URL) | OK |
| AuditLogsPage | ❌ Aucune recherche | À ajouter |

**Amélioration proposée** : Ajouter un champ de recherche pour filtrer par nom d'administrateur ou utilisateur cible.

---

### 3. **Barre de filtres encombrée**

Actuellement, tous les filtres sont alignés horizontalement dans le header de la carte, ce qui crée un encombrement visuel sur les petits écrans.

**Amélioration proposée** : 
- Déplacer les filtres dans une section dédiée avec meilleur espacement
- Grouper les sélecteurs de date visuellement
- Ajouter des labels explicites

---

### 4. **Manque d'indicateurs visuels dans le tableau**

| Page | Indicateurs visuels | Status |
|------|---------------------|--------|
| UsersPage | ✅ Avatars, badges rôles colorés, statuts | OK |
| SourcesPage | ✅ Icônes par type, badges colorés | OK |
| AuditLogsPage | ⚠️ Badges actions OK, mais pas d'avatar admin | Partiel |

**Amélioration proposée** : Ajouter les avatars des administrateurs dans la colonne "Administrateur".

---

### 5. **Pas de pagination**

Le tableau est limité à 100 entrées sans indication visuelle ni possibilité de naviguer.

**Amélioration proposée** : Ajouter une indication du nombre de résultats affichés et potentiellement une pagination.

---

### Modifications techniques proposées

#### Fichier : `src/pages/admin/AuditLogsPage.tsx`

```text
┌─────────────────────────────────────────────────────────────┐
│  AVANT                                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [← Retour] Historique d'audit                           │ │
│  │                                 [Export] [Dates] [Filter]│ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Tableau des logs                                    │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  APRÈS                                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [← Retour] Historique d'audit                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   ← Compteurs          │
│  │Total │ │Invit.│ │Rôles │ │Reset │                        │
│  │ 156  │ │  45  │ │  32  │ │  12  │                        │
│  └──────┘ └──────┘ └──────┘ └──────┘                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔍 [Rechercher...] [Type ▼] [Date début] [Date fin] [X] │ │  ← Filtres dédiés
│  │                                             [Export CSV]│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Actions récentes                        156 résultats   │ │  ← Compteur
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ 👤 Admin Name | 🔑 Action | 👤 Target | Details     │ │ │  ← Avatar
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### Détail des changements

#### 1. Ajouter des compteurs statistiques

```typescript
// Nouveau : calcul des stats
const stats = useMemo(() => {
  if (!logs) return { total: 0, invitations: 0, roleChanges: 0, passwordResets: 0 };
  return {
    total: logs.length,
    invitations: logs.filter(l => l.action === 'user_invited').length,
    roleChanges: logs.filter(l => l.action === 'role_changed').length,
    passwordResets: logs.filter(l => 
      l.action === 'password_reset_requested' || 
      l.action === 'password_reset_completed'
    ).length,
  };
}, [logs]);

// Nouveau : affichage des cartes (après le header)
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <Card className="border-l-4 border-l-primary">...</Card>
  <Card className="border-l-4 border-l-emerald-500">...</Card>
  <Card className="border-l-4 border-l-blue-500">...</Card>
  <Card className="border-l-4 border-l-purple-500">...</Card>
</div>
```

#### 2. Ajouter une barre de recherche

```typescript
// Nouveau state
const [searchQuery, setSearchQuery] = useState('');

// Nouveau : filtrage côté client
const filteredLogs = useMemo(() => {
  if (!logs || !searchQuery.trim()) return logs;
  const query = searchQuery.toLowerCase();
  return logs.filter(log => 
    log.admin_profile?.full_name?.toLowerCase().includes(query) ||
    log.target_profile?.full_name?.toLowerCase().includes(query) ||
    (log.details?.target_email as string)?.toLowerCase().includes(query)
  );
}, [logs, searchQuery]);
```

#### 3. Réorganiser les filtres

Déplacer les filtres dans une carte dédiée avec meilleur layout responsive.

#### 4. Ajouter les avatars admin

```typescript
// Dans le TableCell de l'administrateur
<TableCell>
  <div className="flex items-center gap-2">
    <Avatar className="h-7 w-7">
      <AvatarFallback className="text-xs">
        {getInitials(log.admin_profile?.full_name)}
      </AvatarFallback>
    </Avatar>
    <span className="font-medium">
      {log.admin_profile?.full_name || "Inconnu"}
    </span>
  </div>
</TableCell>
```

#### 5. Ajouter un compteur de résultats

```typescript
// Dans le CardHeader
<CardTitle className="text-lg flex items-center justify-between">
  <span>Actions récentes</span>
  <Badge variant="secondary" className="font-normal">
    {filteredLogs?.length || 0} résultat{(filteredLogs?.length || 0) > 1 ? 's' : ''}
  </Badge>
</CardTitle>
```

---

### Imports à ajouter

```typescript
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMemo } from "react";
```

---

### Résumé des améliorations

| Amélioration | Impact UX | Effort |
|--------------|-----------|--------|
| Compteurs statistiques | Visibilité rapide des métriques | Moyen |
| Barre de recherche | Facilite la navigation | Faible |
| Réorganisation filtres | Meilleure lisibilité mobile | Moyen |
| Avatars admin | Cohérence avec UsersPage | Faible |
| Compteur résultats | Feedback utilisateur | Très faible |

### Fichier à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/admin/AuditLogsPage.tsx` | Toutes les améliorations listées |

