# Référence API

## Base URL

```
https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1
```

## Authentification

Toutes les requêtes nécessitent un header Authorization :

```
Authorization: Bearer <jwt_token>
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
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 409 | Conflit (doublon) |
| 500 | Erreur serveur |

---

## Endpoints (23 fonctions)

### Intelligence & Veille

#### POST /assistant-ia
Assistant IA conversationnel avec streaming SSE.
```json
{"message": "Résume les actualités du jour", "context": "veille"}
```

#### POST /collecte-veille
Collecte d'actualités (CRON/service).
```json
{"mode": "full", "categories": ["regulation"], "limit": 50}
```

#### POST /enrichir-actualite
Enrichit une actualité avec l'IA.
```json
{"actualiteId": "uuid"}
```

#### POST /generer-briefing
Génère le briefing quotidien IA.
```json
{"date": "2026-02-16"}
```

#### POST /generer-requete-flux
Génère une requête de flux via IA.
```json
{"description": "Suivre la 5G en Afrique"}
```

---

### SPDI & Social

#### POST /calculer-spdi
Calcule le score SPDI d'un acteur.
```json
{"personnalite_id": "uuid"}
```
**Réponse:** `{"score_final": 72.5, "axes": {"visibilite": 80, "qualite": 65, "autorite": 70, "presence": 75}}`

#### POST /analyser-spdi
Analyse IA et recommandations stratégiques.
```json
{"personnalite_id": "uuid"}
```

#### POST /collecte-social
Collecte données sociales (scraping).

#### POST /collecte-social-api
Collecte via APIs officielles.

---

### Newsletter & Diffusion

#### POST /generer-newsletter
Génère contenu newsletter par IA.
```json
{"date_debut": "2026-02-01", "date_fin": "2026-02-15", "ton": "formel", "cible": "direction"}
```

#### POST /envoyer-newsletter
Envoie une newsletter aux destinataires.
```json
{"newsletter_id": "uuid", "destinataires": ["email@example.com"]}
```

#### POST /scheduler-newsletter
Programmation automatique des newsletters.

#### POST /diffuser-resume
Diffusion résumé quotidien par canal.
```json
{"canal": "email", "contenu_type": "briefing"}
```

#### POST /envoyer-sms
Envoi d'alertes SMS.
```json
{"message": "Alerte critique", "destinataires": ["+225XXXXXXXXXX"]}
```

#### POST /send-flux-digest
Envoi digest email flux de veille (service).
```json
{"frequence": "daily", "forceAll": false}
```

---

### Administration Utilisateurs

#### POST /invite-user
Invite un nouvel utilisateur (admin).
```json
{"email": "nouveau@example.com", "fullName": "Jean Dupont", "role": "user"}
```

#### POST /manage-user
Gère les comptes (admin).
```json
{"userId": "uuid", "action": "disable"}
```
**Actions:** `enable`, `disable`, `delete`

#### POST /update-user-role
Modifie le rôle (admin).
```json
{"userId": "uuid", "newRole": "council_user"}
```

#### POST /manage-cron-jobs
Gère les tâches CRON (admin).
```json
{"action": "list"}
```

#### POST /generer-acteurs
Génère des acteurs pour une catégorie (admin).
```json
{"categorie": "operateurs", "pays": "Côte d'Ivoire", "limit": 20}
```

#### POST /list-users-status
Liste le statut des utilisateurs.

#### POST /generate-password-link
Génère un lien de réinitialisation.
```json
{"userId": "uuid"}
```

#### POST /reset-user-password
Réinitialise le mot de passe (admin).
```json
{"userId": "uuid", "newPassword": "..."}
```

---

## Gestion des Erreurs

### Format Standard
```json
{"error": "Message d'erreur", "code": "ERROR_CODE"}
```

### Codes d'Erreur Courants

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Token manquant ou invalide |
| `FORBIDDEN` | Permissions insuffisantes |
| `VALIDATION_ERROR` | Payload invalide |
| `NOT_FOUND` | Ressource introuvable |
| `CONFLICT` | Doublon détecté |
| `INTERNAL_ERROR` | Erreur serveur |

---

Voir aussi : [Edge Functions](./EDGE-FUNCTIONS.md) | [Authentication](./AUTHENTICATION.md)
