# Edge Functions

## Vue d'ensemble

Le projet contient **9 Edge Functions** déployées automatiquement sur Lovable Cloud.

| Fonction | Description | Auth |
|----------|-------------|------|
| `assistant-ia` | Assistant IA conversationnel (SSE) | ✅ |
| `collecte-veille` | Collecte d'actualités (CRON) | 🔒 Service |
| `enrichir-actualite` | Enrichissement IA d'articles | ✅ |
| `generer-acteurs` | Génération d'acteurs par catégorie | ✅ Admin |
| `invite-user` | Invitation utilisateur par email | ✅ Admin |
| `manage-user` | Activation/désactivation comptes | ✅ Admin |
| `update-user-role` | Modification des rôles | ✅ Admin |
| `manage-cron-jobs` | Gestion des tâches CRON | ✅ Admin |
| `send-flux-digest` | Envoi digest email | 🔒 Service |

## Secrets Requis

| Secret | Utilisé par | Description |
|--------|-------------|-------------|
| `PERPLEXITY_API_KEY` | collecte-veille, assistant-ia | Recherche web IA |
| `XAI_API_KEY` | assistant-ia, enrichir-actualite, generer-acteurs | Grok (xAI) |
| `RESEND_API_KEY` | invite-user, send-flux-digest | Envoi emails |
| `SUPABASE_SERVICE_ROLE_KEY` | Toutes | Accès admin DB |

---

## 1. assistant-ia

Assistant IA conversationnel avec streaming SSE.

### Endpoint
```
POST /functions/v1/assistant-ia
```

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Payload
```json
{
  "message": "Quelles sont les dernières actualités sur Orange CI ?",
  "context": "veille",
  "conversationId": "uuid-optionnel"
}
```

### Contextes disponibles
- `general` - Conversation générale
- `veille` - Veille stratégique télécom
- `personnalites` - Acteurs du secteur
- `actualites` - Articles et news

### Réponse (SSE)
```
data: {"type":"text","content":"Voici les dernières..."}
data: {"type":"text","content":" actualités concernant..."}
data: {"type":"done","conversationId":"uuid"}
```

### Exemple curl
```bash
curl -N -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/assistant-ia' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Résume les actualités du jour","context":"veille"}'
```

---

## 2. collecte-veille

Collecte automatique d'actualités via Perplexity et Grok.

### Endpoint
```
POST /functions/v1/collecte-veille
```

### Headers
```
Authorization: Bearer <service_role_key>
Content-Type: application/json
```

### Payload
```json
{
  "mode": "full",
  "categories": ["regulation", "operateurs"],
  "limit": 50
}
```

### Modes
- `full` - Collecte complète toutes catégories
- `incremental` - Nouveautés uniquement
- `category` - Catégorie spécifique

### Réponse
```json
{
  "success": true,
  "stats": {
    "total": 45,
    "inserted": 38,
    "duplicates": 7,
    "duration_ms": 12500
  }
}
```

### CRON Schedule
```
0 6 * * * (tous les jours à 6h UTC)
```

---

## 3. enrichir-actualite

Enrichit une actualité avec analyse IA, tags et importance.

### Endpoint
```
POST /functions/v1/enrichir-actualite
```

### Payload
```json
{
  "actualiteId": "uuid-de-l-actualite"
}
```

### Réponse
```json
{
  "success": true,
  "enrichment": {
    "importance": 8,
    "sentiment": 15,
    "tags": ["5G", "régulation", "ARTCI"],
    "categorie": "regulation",
    "resume": "L'ARTCI annonce de nouvelles...",
    "pourquoi_important": "Cette décision impacte...",
    "analyse_ia": "Analyse complète..."
  }
}
```

---

## 4. generer-acteurs

Génère une liste d'acteurs pour une catégorie donnée.

### Endpoint
```
POST /functions/v1/generer-acteurs
```

### Headers
```
Authorization: Bearer <admin_token>
```

### Payload
```json
{
  "categorie": "operateurs",
  "pays": "Côte d'Ivoire",
  "limit": 20
}
```

### Catégories
- `operateurs` - Opérateurs télécoms
- `regulateurs` - Autorités de régulation
- `gouvernement` - Ministères et agences
- `experts` - Consultants et analystes
- `medias` - Journalistes tech

### Réponse
```json
{
  "success": true,
  "acteurs": [
    {
      "nom": "Kouassi",
      "prenom": "Jean",
      "fonction": "Directeur Général",
      "organisation": "Orange CI",
      "cercle": 1
    }
  ],
  "count": 15
}
```

---

## 5. invite-user

Invite un nouvel utilisateur par email.

### Endpoint
```
POST /functions/v1/invite-user
```

### Headers
```
Authorization: Bearer <admin_token>
```

### Payload
```json
{
  "email": "nouveau@example.com",
  "fullName": "Jean Dupont",
  "role": "user",
  "redirectUrl": "https://ansut-lens.lovable.app/auth/reset-password"
}
```

### Rôles disponibles
- `admin`
- `user`
- `council_user`
- `guest`

### Réponse
```json
{
  "success": true,
  "message": "Invitation envoyée à nouveau@example.com",
  "userId": "uuid-nouvel-utilisateur"
}
```

### Erreurs
| Code | Message |
|------|---------|
| 400 | Email, nom ou rôle manquant |
| 401 | Non authentifié |
| 403 | Droits admin requis |
| 409 | Utilisateur déjà existant |

---

## 6. manage-user

Active ou désactive un compte utilisateur.

### Endpoint
```
POST /functions/v1/manage-user
```

### Payload
```json
{
  "userId": "uuid-utilisateur",
  "action": "disable"
}
```

### Actions
- `enable` - Activer le compte
- `disable` - Désactiver le compte
- `delete` - Supprimer le compte

### Réponse
```json
{
  "success": true,
  "message": "Utilisateur désactivé"
}
```

---

## 7. update-user-role

Modifie le rôle d'un utilisateur.

### Endpoint
```
POST /functions/v1/update-user-role
```

### Payload
```json
{
  "userId": "uuid-utilisateur",
  "newRole": "council_user"
}
```

### Réponse
```json
{
  "success": true,
  "previousRole": "user",
  "newRole": "council_user"
}
```

---

## 8. manage-cron-jobs

Gestion des tâches CRON planifiées.

### Endpoint
```
POST /functions/v1/manage-cron-jobs
```

### Payload - Lister
```json
{
  "action": "list"
}
```

### Payload - Toggle
```json
{
  "action": "toggle",
  "jobId": 123
}
```

### Payload - Modifier schedule
```json
{
  "action": "update_schedule",
  "jobId": 123,
  "schedule": "0 8 * * *"
}
```

### Payload - Exécuter maintenant
```json
{
  "action": "run_now",
  "jobName": "collecte-veille"
}
```

### Réponse
```json
{
  "success": true,
  "jobs": [
    {
      "jobid": 1,
      "jobname": "collecte-veille-quotidienne",
      "schedule": "0 6 * * *",
      "active": true
    }
  ]
}
```

---

## 9. send-flux-digest

Envoie les digests email pour les flux de veille.

### Endpoint
```
POST /functions/v1/send-flux-digest
```

### Headers
```
Authorization: Bearer <service_role_key>
```

### Payload
```json
{
  "frequence": "daily",
  "forceAll": false
}
```

### Fréquences
- `hourly` - Toutes les heures
- `daily` - Quotidien
- `weekly` - Hebdomadaire

### Réponse
```json
{
  "success": true,
  "stats": {
    "flux_processed": 15,
    "emails_sent": 12,
    "errors": 0
  }
}
```

---

## Debugging

### Voir les logs

Les logs sont accessibles via l'interface Lovable Cloud ou via l'outil de logs Edge Functions.

### Tester localement

```bash
# Impossible de tester localement (Deno Deploy)
# Utiliser l'environnement de preview Lovable
```

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| 401 Unauthorized | Token manquant/invalide | Vérifier le header Authorization |
| 403 Forbidden | Rôle insuffisant | Vérifier les permissions admin |
| 500 Internal Error | Erreur côté serveur | Consulter les logs |
| CORS Error | Headers manquants | Vérifier corsHeaders |

---

Voir aussi : [API Reference](./API.md) | [Authentication](./AUTHENTICATION.md)
