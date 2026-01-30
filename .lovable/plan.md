

## Plan : Ajouter la pagination au tableau du Journal d'audit

### Objectif
Implémenter une pagination complète pour le tableau des logs d'audit, permettant de naviguer au-delà des 100 premiers résultats avec un comptage exact et des contrôles de navigation.

---

### Aperçu visuel

```text
┌─────────────────────────────────────────────────────────────┐
│  Actions récentes                           50 résultat(s)  │
├─────────────────────────────────────────────────────────────┤
│  Date       │ Admin    │ Action    │ Cible     │ Détails   │
│─────────────┼──────────┼───────────┼───────────┼───────────│
│  28/01/26   │ Admin A  │ Invitation│ User X    │ ...       │
│  ...        │ ...      │ ...       │ ...       │ ...       │
│  (25 lignes par page)                                       │
├─────────────────────────────────────────────────────────────┤
│         ◀ Précédent  │ 1 │ 2 │ ... │ Suivant ▶             │  ← NOUVEAU
│                   Page 1 sur 2                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| **Pagination côté serveur** | Utilise `.range()` de Supabase pour charger uniquement la page courante |
| **Comptage exact** | Affiche le total réel de résultats (pas limité à 100) |
| **25 éléments par page** | Taille de page standard pour une bonne lisibilité |
| **Navigation intelligente** | Affiche jusqu'à 5 numéros de pages avec ellipsis si nécessaire |
| **Reset automatique** | Retour à la page 1 quand les filtres changent |
| **Indicateur de position** | Affiche "Page X sur Y" sous les contrôles |

---

### Implémentation technique

#### 1. Nouveaux états

Ajouter l'état de pagination et la constante de taille de page :

```typescript
const PAGE_SIZE = 25;
const [page, setPage] = useState(1);
```

#### 2. Modification de la requête

Remplacer `.limit(100)` par une pagination avec comptage :

```typescript
const { data: logsData, isLoading } = useQuery({
  queryKey: ["admin-audit-logs", actionFilter, startDate?.toISOString(), endDate?.toISOString(), page],
  queryFn: async () => {
    let query = supabase
      .from("admin_audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (actionFilter !== "all") {
      query = query.eq("action", actionFilter);
    }

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }

    // Pagination
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    // Fetch profiles...
    return {
      logs: enrichedLogs,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    };
  },
});
```

#### 3. Reset de la page lors du changement de filtres

Ajouter un effet pour réinitialiser la page :

```typescript
// Reset page when filters change
useEffect(() => {
  setPage(1);
}, [actionFilter, startDate, endDate, searchQuery]);
```

#### 4. Extraction des données

Adapter l'accès aux données :

```typescript
const logs = logsData?.logs ?? [];
const totalCount = logsData?.total ?? 0;
const totalPages = logsData?.totalPages ?? 1;
```

#### 5. Mise à jour des stats

Les stats doivent utiliser le count total, pas la longueur des logs paginés :

```typescript
const stats = useMemo(() => {
  if (!logs) return { total: totalCount, invitations: 0, roleChanges: 0, passwordResets: 0 };
  return {
    total: totalCount,
    invitations: logs.filter((l) => l.action === "user_invited").length,
    roleChanges: logs.filter((l) => l.action === "role_changed").length,
    passwordResets: logs.filter((l) => l.action.includes("password")).length,
  };
}, [logs, totalCount]);
```

Note : Les stats comptent uniquement la page actuelle. Pour des stats globales précises, une requête séparée serait nécessaire.

#### 6. Composant de pagination

Utiliser le pattern existant de `AlertesHistoryPage` :

```typescript
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

// Après le tableau, dans CardContent :
{totalPages > 1 && (
  <div className="mt-6 flex flex-col items-center gap-2">
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
        
        {/* Première page */}
        <PaginationItem>
          <PaginationLink
            onClick={() => setPage(1)}
            isActive={page === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
        
        {/* Ellipsis début */}
        {page > 3 && <PaginationEllipsis />}
        
        {/* Pages autour de la courante */}
        {[...Array(totalPages)].map((_, i) => {
          const pageNum = i + 1;
          if (pageNum === 1 || pageNum === totalPages) return null;
          if (pageNum < page - 1 || pageNum > page + 1) return null;
          return (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={() => setPage(pageNum)}
                isActive={page === pageNum}
                className="cursor-pointer"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        
        {/* Ellipsis fin */}
        {page < totalPages - 2 && <PaginationEllipsis />}
        
        {/* Dernière page */}
        {totalPages > 1 && (
          <PaginationItem>
            <PaginationLink
              onClick={() => setPage(totalPages)}
              isActive={page === totalPages}
              className="cursor-pointer"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}
        
        <PaginationItem>
          <PaginationNext
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
    
    <p className="text-xs text-muted-foreground">
      Page {page} sur {totalPages} • {totalCount} résultat{totalCount > 1 ? "s" : ""}
    </p>
  </div>
)}
```

---

### Imports à ajouter

```typescript
import { useEffect } from "react"; // Ajouter useEffect aux imports existants
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
```

---

### Mise à jour du badge de résultats

Modifier l'affichage pour montrer le total réel :

```typescript
<Badge variant="secondary" className="font-normal">
  {totalCount} résultat{totalCount > 1 ? "s" : ""} • Page {page}/{totalPages}
</Badge>
```

---

### Fichier à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/admin/AuditLogsPage.tsx` | Ajouter état page, modifier requête avec range/count, ajouter composant Pagination |

