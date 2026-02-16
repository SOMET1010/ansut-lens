
# Fix: Onglets "Dashboard SPDI", "Revue Stabilite" et "Benchmark" vides

## Diagnostic

Le probleme est dans le hook `useUserPermissions.ts` (ligne 36). La condition de chargement est trop stricte :

```typescript
const isLoading = !role || isPending || isFetching || !isSuccess;
```

- `isFetching` reste `true` pendant les refetches en arriere-plan, ce qui bloque l'affichage
- Quand `role` est `null` (avant la resolution de l'auth), `enabled: !!role` desactive la query, donc `isPending` reste `true` indefiniment
- La combinaison fait que `PermissionRoute` affiche "Verification de l'acces..." en boucle au lieu du contenu

L'ecran montre effectivement "Verification de l'acces..." de maniere permanente.

## Correction

### Fichier : `src/hooks/useUserPermissions.ts`

Simplifier la condition `isLoading` pour ne plus inclure `isFetching` (qui est vrai pendant les refetches) et utiliser une logique plus robuste :

```typescript
// AVANT (bugge)
const isLoading = !role || isPending || isFetching || !isSuccess;

// APRES (corrige)
const isLoading = !role || (isPending && !isSuccess);
```

Cette correction :
- Attend que `role` soit defini (depuis AuthContext)
- Attend le premier chargement reussi des permissions
- Ne bloque plus l'UI pendant les refetches en arriere-plan
- Resout le probleme d'affichage permanent de "Verification de l'acces..."

### Impact

- Toutes les pages protegees par `PermissionRoute` beneficieront de la correction
- Les onglets SPDI, Revue Stabilite et Benchmark s'afficheront correctement
- Aucun impact sur la securite : la verification des permissions reste identique, seul l'etat de chargement change

### Un seul fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useUserPermissions.ts` | Corriger la condition `isLoading` (1 ligne) |
