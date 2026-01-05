# Référence API

## Base URL

```
https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1
```

## Authentification

Toutes les requêtes (sauf CORS preflight) nécessitent un header Authorization :

```
Authorization: Bearer <jwt_token>
```

Pour obtenir le token :
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Headers Standards

```
Content-Type: application/json
Authorization: Bearer <token>
apikey: <anon_key>
```

## Codes de Réponse

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 201 | Créé avec succès |
| 400 | Requête invalide (payload manquant/incorrect) |
| 401 | Non authentifié |
| 403 | Non autorisé (rôle insuffisant) |
| 404 | Ressource non trouvée |
| 409 | Conflit (doublon) |
| 500 | Erreur serveur |

---

## Endpoints

### POST /assistant-ia

Assistant IA conversationnel avec streaming.

**Request:**
```bash
curl -N -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/assistant-ia' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Résume les actualités du jour",
    "context": "veille",
    "conversationId": null
  }'
```

**Response (SSE Stream):**
```
data: {"type":"text","content":"Voici un résumé"}
data: {"type":"text","content":" des actualités..."}
data: {"type":"done","conversationId":"abc123"}
```

**Contextes:** `general`, `veille`, `personnalites`, `actualites`

---

### POST /collecte-veille

Collecte d'actualités (réservé CRON/service).

**Request:**
```bash
curl -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/collecte-veille' \
  -H 'Authorization: Bearer <service_role_key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "mode": "full",
    "categories": ["regulation", "operateurs"],
    "limit": 50
  }'
```

**Response:**
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

---

### POST /enrichir-actualite

Enrichit une actualité avec l'IA.

**Request:**
```bash
curl -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/enrichir-actualite' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "actualiteId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**
```json
{
  "success": true,
  "enrichment": {
    "importance": 8,
    "sentiment": 15,
    "tags": ["5G", "régulation"],
    "categorie": "regulation",
    "resume": "Résumé généré...",
    "analyse_ia": "Analyse complète..."
  }
}
```

---

### POST /generer-acteurs

Génère des acteurs pour une catégorie (admin).

**Request:**
```bash
curl -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/generer-acteurs' \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "categorie": "operateurs",
    "pays": "Côte d'\''Ivoire",
    "limit": 20
  }'
```

**Response:**
```json
{
  "success": true,
  "acteurs": [
    {
      "nom": "Kouassi",
      "prenom": "Jean",
      "fonction": "DG",
      "organisation": "Orange CI",
      "cercle": 1
    }
  ],
  "count": 15
}
```

---

### POST /invite-user

Invite un nouvel utilisateur (admin).

**Request:**
```bash
curl -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/invite-user' \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "nouveau@example.com",
    "fullName": "Jean Dupont",
    "role": "user",
    "redirectUrl": "https://ansut-lens.lovable.app/auth/reset-password"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation envoyée à nouveau@example.com",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Erreurs:**
- `400` - Champs manquants
- `403` - Non admin
- `409` - Email déjà utilisé

---

### POST /manage-user

Gère les comptes utilisateurs (admin).

**Désactiver:**
```bash
curl -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/manage-user' \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "action": "disable"
  }'
```

**Actions:** `enable`, `disable`, `delete`

---

### POST /update-user-role

Modifie le rôle d'un utilisateur (admin).

**Request:**
```bash
curl -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/update-user-role' \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "newRole": "council_user"
  }'
```

**Response:**
```json
{
  "success": true,
  "previousRole": "user",
  "newRole": "council_user"
}
```

---

### POST /manage-cron-jobs

Gère les tâches CRON (admin).

**Lister:**
```bash
curl -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/manage-cron-jobs' \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'Content-Type: application/json' \
  -d '{"action": "list"}'
```

**Toggle:**
```json
{"action": "toggle", "jobId": 123}
```

**Modifier schedule:**
```json
{"action": "update_schedule", "jobId": 123, "schedule": "0 8 * * *"}
```

**Exécuter maintenant:**
```json
{"action": "run_now", "jobName": "collecte-veille"}
```

---

### POST /send-flux-digest

Envoie les digests email (service).

**Request:**
```bash
curl -X POST \
  'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/send-flux-digest' \
  -H 'Authorization: Bearer <service_role_key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "frequence": "daily",
    "forceAll": false
  }'
```

**Response:**
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

## Gestion des Erreurs

### Format Standard

```json
{
  "error": "Message d'erreur",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Codes d'Erreur Courants

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Token manquant ou invalide |
| `FORBIDDEN` | Permissions insuffisantes |
| `VALIDATION_ERROR` | Payload invalide |
| `NOT_FOUND` | Ressource introuvable |
| `CONFLICT` | Doublon détecté |
| `RATE_LIMITED` | Trop de requêtes |
| `INTERNAL_ERROR` | Erreur serveur |

### Exemple de Gestion

```typescript
try {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { email, fullName, role }
  });
  
  if (error) throw error;
  
  toast.success('Invitation envoyée');
} catch (err) {
  if (err.message.includes('409')) {
    toast.error('Cet email est déjà utilisé');
  } else if (err.message.includes('403')) {
    toast.error('Droits insuffisants');
  } else {
    toast.error('Une erreur est survenue');
  }
}
```

---

Voir aussi : [Edge Functions](./EDGE-FUNCTIONS.md) | [Authentication](./AUTHENTICATION.md)
