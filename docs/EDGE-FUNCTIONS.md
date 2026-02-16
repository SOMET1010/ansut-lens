# Edge Functions

## Vue d'ensemble

Le projet contient **23 Edge Functions** déployées automatiquement sur Lovable Cloud.

### Fonctions Principales

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

### Fonctions SPDI & Social

| Fonction | Description | Auth |
|----------|-------------|------|
| `calculer-spdi` | Calcul du score SPDI composite (4 axes) | ✅ |
| `analyser-spdi` | Analyse IA et recommandations stratégiques | ✅ |
| `collecte-social` | Collecte de données sociales (scraping) | 🔒 Service |
| `collecte-social-api` | Collecte via APIs officielles (LinkedIn, X) | 🔒 Service |

### Fonctions Newsletter & Diffusion

| Fonction | Description | Auth |
|----------|-------------|------|
| `generer-newsletter` | Génération contenu newsletter par IA | ✅ |
| `envoyer-newsletter` | Envoi newsletter aux destinataires | ✅ Admin |
| `scheduler-newsletter` | Programmation automatique des envois | 🔒 Service |
| `diffuser-resume` | Diffusion résumé quotidien par canal | 🔒 Service |
| `envoyer-sms` | Envoi d'alertes SMS | 🔒 Service |

### Fonctions Administration

| Fonction | Description | Auth |
|----------|-------------|------|
| `generer-briefing` | Génération briefing quotidien IA | 🔒 Service |
| `generer-requete-flux` | Génération requête de flux via IA | ✅ |
| `generate-password-link` | Génération lien réinitialisation mot de passe | ✅ Admin |
| `reset-user-password` | Réinitialisation mot de passe utilisateur | ✅ Admin |
| `list-users-status` | Liste statut des utilisateurs (last login) | ✅ Admin |

## Secrets Requis

| Secret | Utilisé par | Description |
|--------|-------------|-------------|
| `PERPLEXITY_API_KEY` | collecte-veille, assistant-ia | Recherche web IA |
| `RESEND_API_KEY` | invite-user, send-flux-digest, envoyer-newsletter | Envoi emails |
| `SMS_API_KEY` | envoyer-sms | Envoi SMS |
| `SUPABASE_SERVICE_ROLE_KEY` | Toutes | Accès admin DB |

> **Note :** Google Gemini est utilisé via Lovable AI (pas de clé API nécessaire).

---

## 1. assistant-ia

Assistant IA conversationnel avec streaming SSE.

### Endpoint
```
POST /functions/v1/assistant-ia
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
data: {"type":"done","conversationId":"uuid"}
```

---

## 2. collecte-veille

Collecte automatique d'actualités via Perplexity et Gemini.

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

---

## 3. calculer-spdi

Calcule le Score de Présence Digitale Institutionnelle pour un acteur.

### Payload
```json
{
  "personnalite_id": "uuid-acteur"
}
```

### Réponse
```json
{
  "success": true,
  "score_final": 72.5,
  "axes": {
    "visibilite": 80,
    "qualite": 65,
    "autorite": 70,
    "presence": 75
  }
}
```

### Pondération des axes
| Axe | Poids |
|-----|-------|
| Visibilité | 30% |
| Qualité/Sentiment | 25% |
| Autorité/Influence | 25% |
| Présence/Engagement | 20% |

---

## 4. analyser-spdi

Analyse IA et génère des recommandations stratégiques pour un acteur.

### Payload
```json
{
  "personnalite_id": "uuid-acteur"
}
```

### Réponse
```json
{
  "success": true,
  "recommandations_generees": 4,
  "types": ["opportunite", "alerte", "canal", "thematique"]
}
```

---

## 5. generer-newsletter

Génère automatiquement le contenu d'une newsletter à partir des actualités récentes.

### Payload
```json
{
  "date_debut": "2026-02-01",
  "date_fin": "2026-02-15",
  "ton": "formel",
  "cible": "direction"
}
```

---

## 6. envoyer-newsletter

Envoie une newsletter validée aux destinataires configurés.

### Payload
```json
{
  "newsletter_id": "uuid-newsletter",
  "destinataires": ["email1@example.com", "email2@example.com"]
}
```

---

## 7. envoyer-sms

Envoie des alertes SMS aux destinataires configurés.

### Payload
```json
{
  "message": "Alerte critique : ...",
  "destinataires": ["+225XXXXXXXXXX"],
  "alerte_id": "uuid-alerte"
}
```

---

## 8. diffuser-resume

Diffuse un résumé quotidien par les canaux configurés (email, SMS).

### Payload
```json
{
  "canal": "email",
  "contenu_type": "briefing"
}
```

---

## 9. generer-briefing

Génère le briefing quotidien à partir des actualités et alertes récentes.

### Payload
```json
{
  "date": "2026-02-16"
}
```

---

## 10. generer-requete-flux

Utilise l'IA pour générer automatiquement une requête de mots-clés pour un flux de veille.

### Payload
```json
{
  "description": "Suivre les évolutions de la 5G en Afrique de l'Ouest"
}
```

---

## 11-14. Fonctions Administration

### invite-user
Invite un nouvel utilisateur par email avec rôle assigné.

### manage-user
Active, désactive ou supprime un compte utilisateur.

### update-user-role
Modifie le rôle d'un utilisateur avec audit.

### manage-cron-jobs
Liste, active/désactive, modifie le schedule des tâches CRON.

---

## 15-17. Fonctions Auth

### generate-password-link
Génère un lien de réinitialisation de mot de passe.

### reset-user-password
Réinitialise le mot de passe d'un utilisateur (admin).

### list-users-status
Liste le statut de connexion de tous les utilisateurs.

---

## 18-19. Fonctions Social

### collecte-social
Collecte des données depuis les réseaux sociaux par scraping.

### collecte-social-api
Collecte via les APIs officielles des plateformes sociales.

---

## 20-23. Fonctions Existantes

### enrichir-actualite
Enrichit une actualité avec analyse IA, tags et importance.

### generer-acteurs
Génère une liste d'acteurs pour une catégorie donnée.

### send-flux-digest
Envoie les digests email pour les flux de veille.

### scheduler-newsletter
Gère la programmation automatique des newsletters.

---

## Debugging

### Voir les logs

Les logs sont accessibles via l'interface Lovable Cloud.

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| 401 Unauthorized | Token manquant/invalide | Vérifier le header Authorization |
| 403 Forbidden | Rôle insuffisant | Vérifier les permissions |
| 500 Internal Error | Erreur côté serveur | Consulter les logs |
| Numeric overflow | Valeur hors limites | Vérifier les clamps (ex: sentiment_moyen) |

---

Voir aussi : [API Reference](./API.md) | [Authentication](./AUTHENTICATION.md)
