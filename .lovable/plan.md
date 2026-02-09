

# Corriger le faux positif "Connecté" pour AMONKOU YVES

## Probleme identifie

Deux problemes distincts causent la confusion dans le tableau de bord admin :

### 1. `last_active_at` pollue par les sessions recovery

Dans `AuthContext.tsx`, la fonction `trackActivity()` est appelee sur les evenements `SIGNED_IN` et `TOKEN_REFRESHED`. Or, quand un lien de reinitialisation est ouvert (meme par un scanner email), un evenement `SIGNED_IN` est emis, ce qui met a jour `last_active_at` sans que l'utilisateur ait reellement utilise l'application.

**Resultat actuel** : `last_active_at = 2026-02-09 12:34` alors que `password_set_at = null`. L'utilisateur n'a jamais reellement utilise la plateforme.

### 2. InvitationTracker affiche "Premiere connexion" comme validee

Le tracker utilise `!!status.last_active_at` pour determiner si la premiere connexion a eu lieu (ligne 227). Comme `last_active_at` a ete pollue, l'etape apparait comme completee alors qu'elle ne l'est pas.

## Corrections prevues

### Fichier 1 : `src/contexts/AuthContext.tsx`

Exclure les sessions recovery du tracking d'activite. Ne tracker `last_active_at` que pour les connexions reelles (avec mot de passe ou token refresh d'une session deja authentifiee).

```
// Avant
if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  trackActivity(newSession.user.id);
}

// Apres
if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  // Ne pas tracker les sessions recovery (scanner email, reinitialisation)
  const isRecoverySession = newSession?.user?.aal === 'aal1' 
    && newSession?.user?.app_metadata?.provider === 'email'
    && !newSession?.user?.user_metadata?.password_set;
  // Alternative plus simple : verifier le profil
  trackActivity(newSession.user.id);
}
```

Approche retenue (plus fiable) : verifier dans le profil si `password_set_at` est defini avant de tracker.

### Fichier 2 : `src/components/admin/InvitationTracker.tsx`

Conditionner l'etape "Premiere connexion" a `password_set_at` ET `last_active_at` pour eviter les faux positifs.

```
// Avant
firstLogin: !!status.last_active_at,

// Apres
firstLogin: !!status.password_set_at && !!status.last_active_at,
```

### Action donnees : Nettoyer `last_active_at` pour AMONKOU YVES

Remettre `last_active_at` a `null` via une migration SQL pour refleter la realite : cet utilisateur n'a jamais eu de session reelle.

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/contexts/AuthContext.tsx` | Ne pas appeler `trackActivity` pour les sessions de type recovery (verifier `password_set_at` dans le profil) |
| `src/components/admin/InvitationTracker.tsx` | Conditionner `firstLogin` a `password_set_at && last_active_at` |
| Migration SQL | Remettre `last_active_at = null` pour AMONKOU YVES |

