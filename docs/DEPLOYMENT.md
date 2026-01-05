# Déploiement

## Vue d'ensemble

ANSUT RADAR est déployé sur **Lovable Cloud** avec :
- Frontend : Hébergement statique CDN
- Backend : Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Déploiement : Automatique à chaque push

## URLs de l'Application

| Environnement | URL |
|---------------|-----|
| Production | `https://ansut-lens.lovable.app` |
| Preview | `https://c21058e0-14e6-4fa1-a269-ca94b01665ac.lovableproject.com` |

## Variables d'Environnement

### Frontend (.env)

Le fichier `.env` est géré automatiquement par Lovable :

```env
VITE_SUPABASE_URL=https://lpkfwxisranmetbtgxrv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_SUPABASE_PROJECT_ID=lpkfwxisranmetbtgxrv
```

> ⚠️ **Ne jamais modifier ce fichier manuellement**

### Edge Functions (Secrets)

Les secrets sont configurés dans Lovable Cloud :

| Secret | Description | Obligatoire |
|--------|-------------|:-----------:|
| `SUPABASE_URL` | URL du projet (auto) | ✅ |
| `SUPABASE_ANON_KEY` | Clé publique (auto) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin (auto) | ✅ |
| `PERPLEXITY_API_KEY` | API Perplexity | ✅ |
| `XAI_API_KEY` | API Grok (xAI) | ✅ |
| `RESEND_API_KEY` | API Resend (emails) | ✅ |

### Ajouter un Secret

1. Ouvrir l'éditeur Lovable
2. Demander à l'assistant d'ajouter le secret
3. Entrer la valeur dans le formulaire sécurisé
4. Le secret est disponible immédiatement

## Tâches CRON

### Jobs Configurés

| Job | Schedule | Description |
|-----|----------|-------------|
| `collecte-veille-critique` | `0 6 * * *` | Collecte quotidienne 6h UTC |
| `collecte-veille-normale` | `0 8 * * *` | Collecte quotidienne 8h UTC |
| `collecte-veille-hebdo` | `0 9 * * 1` | Collecte hebdomadaire lundi 9h |
| `send-digest-daily` | `0 7 * * *` | Digest quotidien 7h UTC |
| `send-digest-weekly` | `0 8 * * 1` | Digest hebdomadaire lundi 8h |

### Syntaxe CRON

```
┌───────────── minute (0-59)
│ ┌───────────── heure (0-23)
│ │ ┌───────────── jour du mois (1-31)
│ │ │ ┌───────────── mois (1-12)
│ │ │ │ ┌───────────── jour de la semaine (0-6, 0=dimanche)
│ │ │ │ │
* * * * *
```

### Gérer les CRON

Les administrateurs peuvent :
- Voir les jobs dans `/admin/cron-jobs`
- Activer/désactiver un job
- Modifier le schedule
- Exécuter manuellement
- Voir l'historique d'exécution

## Edge Functions

### Déploiement Automatique

Les Edge Functions dans `supabase/functions/` sont déployées automatiquement :

```
supabase/functions/
├── assistant-ia/
│   └── index.ts
├── collecte-veille/
│   └── index.ts
├── enrichir-actualite/
│   └── index.ts
...
```

### Structure d'une Function

```typescript
// supabase/functions/ma-fonction/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Logique
  return new Response(JSON.stringify({ ok: true }));
});
```

### Logs

Les logs sont accessibles via :
1. Interface Lovable Cloud
2. Outil de logs Edge Functions dans l'éditeur

## Storage

### Buckets Configurés

| Bucket | Public | Usage |
|--------|:------:|-------|
| `avatars` | ✅ | Photos de profil utilisateurs |

### Politique de Storage

```sql
-- Avatars publics en lecture
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Upload par le propriétaire uniquement
CREATE POLICY "Users can upload their avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Monitoring

### Métriques Disponibles

- **Requêtes** : Volume, latence, erreurs
- **Base de données** : Connexions, requêtes, stockage
- **Edge Functions** : Invocations, durée, erreurs
- **Auth** : Connexions, inscriptions, sessions

### Alertes

Les erreurs CRON génèrent des alertes temps réel pour les admins via `useRealtimeCronAlerts`.

## Sauvegardes

Les sauvegardes sont gérées automatiquement par Lovable Cloud :
- Snapshots quotidiens de la base de données
- Rétention configurable
- Restauration via support

## Checklist Déploiement

### Avant Production

- [ ] Tous les secrets sont configurés
- [ ] Auto-confirm email est activé
- [ ] RLS policies sont en place
- [ ] Edge Functions sont déployées
- [ ] CRON jobs sont configurés
- [ ] URLs de redirection sont autorisées
- [ ] Tests fonctionnels passent

### Après Déploiement

- [ ] Vérifier les logs d'erreur
- [ ] Tester l'authentification
- [ ] Vérifier les CRON jobs
- [ ] Tester les Edge Functions
- [ ] Vérifier les notifications

## Rollback

En cas de problème :

1. **Code** : Utiliser l'historique Lovable pour restaurer une version précédente
2. **Base de données** : Contacter le support pour restauration
3. **Secrets** : Les secrets précédents ne sont pas conservés

---

Voir aussi : [Architecture](./ARCHITECTURE.md) | [Edge Functions](./EDGE-FUNCTIONS.md)
