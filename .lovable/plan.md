

## Plan : Renommer l'action de log pour cohérence

### Problème identifié
La fonction Edge `generate-password-link` utilise actuellement l'action `password_link_generated`, mais la page Journal d'audit est configurée pour afficher `password_reset_requested`.

### Modification requise

#### Fichier : `supabase/functions/generate-password-link/index.ts`

Modifier la ligne 195 pour changer le nom de l'action :

**Avant :**
```typescript
await adminClient.from('admin_audit_logs').insert({
  admin_id: caller.id,
  action: 'password_link_generated',  // Ligne 195
  target_user_id: userId,
  details: {
    target_email: email,
    target_name: userName,
    email_sent: emailSent,
  },
});
```

**Après :**
```typescript
await adminClient.from('admin_audit_logs').insert({
  admin_id: caller.id,
  action: 'password_reset_requested',  // Renommé pour cohérence
  target_user_id: userId,
  details: {
    target_email: email,
    target_name: userName,
    email_sent: emailSent,
  },
});
```

### Résultat attendu

| Événement | Action | Affiché dans Journal d'audit |
|-----------|--------|------------------------------|
| Admin génère un lien de reset | `password_reset_requested` | 🔑 Lien MDP envoyé - "Email envoyé à user@example.com" |
| Utilisateur réinitialise son MDP | `password_reset_completed` | 🔑 MDP réinitialisé - "Via lien de récupération" |

### Fichier à modifier

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/generate-password-link/index.ts` | Changer `password_link_generated` → `password_reset_requested` (ligne 195) |

