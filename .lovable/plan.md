
# Correction du faux positif "Derniere activite"

## Probleme

Le champ `last_sign_in_at` de Supabase Auth est mis a jour lors de TOUTE connexion, y compris les connexions implicites declenchees par un clic sur un lien de recuperation ou d'invitation. Resultat : des utilisateurs comme Sarrah Coulibaly apparaissent avec "Il y a 9 min" comme derniere activite alors qu'ils ne se sont jamais reellement connectes a l'application.

## Solution

Ajouter un champ `last_active_at` dans la table `profiles` et le mettre a jour uniquement lors des connexions reelles (par mot de passe ou token refresh). Ce champ remplacera `last_sign_in_at` pour l'affichage de "Derniere activite".

## Modifications prevues

### 1. Migration de base de donnees
Ajouter la colonne `last_active_at` (timestamp nullable) a la table `profiles`.

### 2. Mise a jour de AuthContext.tsx
Lors d'un evenement `SIGNED_IN` ou `TOKEN_REFRESHED` (et PAS `PASSWORD_RECOVERY`), mettre a jour le champ `last_active_at` du profil de l'utilisateur connecte avec l'horodatage actuel.

### 3. Mise a jour de list-users-status Edge Function
Enrichir les donnees retournees avec le champ `last_active_at` recupere depuis la table `profiles`, en complement du `last_sign_in_at` d'auth.

### 4. Mise a jour de UserCard.tsx et UsersPage.tsx
Utiliser `last_active_at` (depuis profiles) au lieu de `last_sign_in_at` (depuis auth) pour :
- L'affichage de "Derniere activite"
- Le calcul du statut "En ligne"
- Le compteur d'utilisateurs en ligne

Si `last_active_at` est `null`, afficher "Jamais connecte" meme si `last_sign_in_at` existe.

---

## Section technique

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Ajouter colonne `last_active_at` a `profiles` |
| `src/contexts/AuthContext.tsx` | Mettre a jour `last_active_at` sur SIGNED_IN / TOKEN_REFRESHED |
| `supabase/functions/list-users-status/index.ts` | Inclure `last_active_at` des profiles dans la reponse |
| `src/components/admin/UserCard.tsx` | Utiliser `last_active_at` au lieu de `last_sign_in_at` |
| `src/pages/admin/UsersPage.tsx` | Adapter le type `UserStatus` et les fonctions de calcul |

### Detail des changements

**Migration SQL :**
```text
ALTER TABLE profiles ADD COLUMN last_active_at timestamptz DEFAULT NULL;
```

**AuthContext.tsx** -- dans le listener `onAuthStateChange`, ajouter apres le traitement normal de `SIGNED_IN` :
```text
if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  supabase.from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', session.user.id)
    .then(() => {});
}
```

**list-users-status/index.ts** -- recuperer `last_active_at` depuis profiles et l'ajouter dans chaque `UserStatus` :
```text
// Fetch profiles with last_active_at
const { data: profiles } = await adminClient
  .from('profiles')
  .select('id, last_active_at');

// Merge into usersStatus
for (const u of users) {
  const profile = profiles?.find(p => p.id === u.id);
  usersStatus[u.id] = {
    ...existingFields,
    last_active_at: profile?.last_active_at || null,
  };
}
```

**UserCard.tsx / UsersPage.tsx** -- remplacer toutes les references a `status?.last_sign_in_at` par `status?.last_active_at` pour les calculs d'activite et d'affichage.

### Ordre d'execution
```text
1. Creer la migration (ajouter last_active_at)
2. Modifier AuthContext.tsx (tracking des vraies connexions)
3. Modifier list-users-status (inclure last_active_at)
4. Modifier UserCard.tsx et UsersPage.tsx (utiliser last_active_at)
```
