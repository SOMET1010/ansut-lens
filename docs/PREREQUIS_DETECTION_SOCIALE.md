# Prérequis techniques — Détection des bad buzz (réactions sociales)

Note de cadrage rédigée à la suite du cas SIKA Finance du 17/08/2026 : un
commentaire critique sous un post Facebook parlant de l'ANSUT n'a pas été
détecté par RADAR. Ce document liste **précisément** ce qui manque, côté accès
et côté architecture, pour que ce type de signal remonte.

---

## 1. Constat technique (mesuré, pas supposé)

| Élément | État observé | Preuve |
|---|---|---|
| Article SikaFinance du 17/08 | **absent** de `actualites` | dernier SikaFinance indexé : 13/08/2026 |
| Mentions sociales | **aucune depuis le 05/08/2026** | `select max(created_at) from mentions` |
| Twitter / X | **401 Unauthorized** | logs `collecte-social-api` |
| LinkedIn | **401 `disabled_client`** (app désactivée) | logs `collecte-social-api` |
| Facebook (Firecrawl) | **403** (scraping bloqué par Meta) | logs `collecte-social-api` |
| Commentaires (tous réseaux) | **non collectés par conception** | `_shared/qualiteContenu.ts` rejette les URLs sociales |

Conclusion : même avec des tokens valides, RADAR n'aurait vu que **l'article**
(tonalité positive). Le bad buzz était dans les **commentaires**, qui ne sont
aujourd'hui ni collectés, ni stockés, ni analysés.

---

## 2. Prérequis d'accès (à obtenir hors code)

### 2.1 Facebook / Instagram — obligatoire pour les commentaires
Le scraping est définitivement bloqué (403). Seule voie viable : **Meta Graph API**.

- Application Meta en mode **Live** (pas Development), liée au Business Manager
  qui administre la Page ANSUT.
- Page Access Token **longue durée** (60 j, à renouveler) ou System User Token
  (n'expire pas) — recommandé.
- Permissions requises :
  - `pages_read_engagement` — lire les commentaires et réactions de la Page ANSUT
  - `pages_read_user_content` — lire le contenu publié par des tiers sur la Page
  - `pages_show_list`
  - `instagram_basic` + `instagram_manage_comments` si Instagram est inclus
- **Limite structurante à connaître** : Graph API ne donne accès qu'aux
  commentaires des **Pages que l'ANSUT administre**. Les commentaires sous un
  post d'un **tiers** (cas SIKA Finance) ne sont **pas** accessibles par API.
  → couverture partielle assumée, à compléter par le point 2.4.
- Secrets à créer : `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_TOKEN`, `META_PAGE_ID`.

### 2.2 X / Twitter — token à régénérer
- Plan **Basic minimum** (le plan Free ne permet pas la recherche de mentions).
- Endpoints nécessaires : `GET /2/tweets/search/recent`, `GET /2/tweets/:id` avec
  `tweet.fields=public_metrics,conversation_id` pour remonter les fils de réponses.
- Quota Basic : 10 000 tweets/mois en lecture → cadence maximale réaliste
  **1 collecte / 15 min** sur ~20 mots-clés.
- Secret à mettre à jour : `TWITTER_BEARER_TOKEN` (actuel invalide).

### 2.3 LinkedIn — application à réactiver
- L'app renvoie `disabled_client` : elle doit être réactivée ou recréée dans le
  LinkedIn Developer Portal, puis re-vérifiée par la page entreprise ANSUT.
- Produit requis : **Community Management API** (accès sur demande, délai réel
  2 à 4 semaines) pour lire les commentaires sur les posts de la page.
- Secrets : `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` (présents mais inertes).

### 2.4 Posts de tiers (le cas SIKA Finance)
Aucune API officielle ne donne les commentaires d'un post Facebook tiers.
Trois options, par ordre de robustesse :

1. **Signalement manuel assisté** — un membre de la cellule COM colle l'URL du
   post ; RADAR crée une mention à suivre. Coût nul, latence humaine.
2. **Fournisseur de social listening tiers** (Brand24, Meltwater, Talkwalker,
   Mention) qui a des accords de licence avec Meta. Budget indicatif
   150–800 USD/mois. Couverture réelle des commentaires publics.
3. **Surveillance des pages médias identifiées** (SIKA Finance, Fratmat, etc.)
   via leurs flux RSS/articles + détection du **volume de partages**, sans les
   commentaires. Signal faible mais gratuit.

---

## 3. Prérequis d'architecture (à implémenter dans RADAR)

### 3.1 Séparer « preuve citable » et « réaction »
La règle actuelle (`_shared/qualiteContenu.ts`) rejette toute URL sociale. Elle
reste **correcte pour les articles**, mais doit être contournée pour un nouveau
type d'objet.

- `actualites` → inchangé : uniquement des articles citables.
- `mentions` → devient le réceptacle des **réactions** (posts et commentaires),
  avec `source_url` sociale autorisée.
- Le filtre qualité doit exposer un mode `type: 'reaction'` qui n'applique pas
  `estUrlNonArticle`.

### 3.2 Modèle de données à compléter
Table `mentions` — colonnes à ajouter :

| Colonne | Type | Rôle |
|---|---|---|
| `plateforme` | text | facebook / x / linkedin / instagram |
| `type_mention` | text | `post` ou `commentaire` |
| `parent_url` | text | post d'origine d'un commentaire |
| `engagement` | jsonb | likes, partages, réponses |
| `detecte_le` | timestamptz | horodatage de collecte |

Contrainte d'unicité sur (`plateforme`, `source_url`) pour éviter les doublons
à chaque cycle.

### 3.3 Détection du buzz (règle explicable, conforme à la Charte Crédibilité)
Pas de score opaque. Un fil est signalé « à examiner » si, sur 24 h :
- au moins **3 commentaires** de tonalité négative (`sentiment < -0.2`) sur un
  même `parent_url`, **ou**
- **1 commentaire négatif** provenant d'un compte identifié comme influent
  (présent dans `personnalites`), **ou**
- une **accélération** : volume de commentaires > 3× la moyenne du post.

Chaque alerte affiche les commentaires réels qui la déclenchent — le chiffre
est toujours égal au nombre de preuves listées.

### 3.4 Cadence et coût
- Collecte réactions : cron **toutes les 15 min** (aligné sur le quota X Basic).
- Analyse de tonalité : Lovable AI Gateway, par lots de 20 commentaires, un seul
  appel par lot pour rester dans les 150 s de la fonction edge.
- Alerte temps réel : Supabase Realtime sur `mentions` où `est_critique = true`.

---

## 4. Ce qui est bloquant, et par qui

| Prérequis | Bloquant | Responsable | Délai réaliste |
|---|---|---|---|
| Nouveau `TWITTER_BEARER_TOKEN` (plan Basic) | Oui | ANSUT / compte X | 1 jour |
| Réactivation app LinkedIn | Oui | ANSUT / dev portal | 1 jour + validation API 2–4 sem. |
| Token Meta Graph (Page ANSUT) | Oui | ANSUT / Business Manager | 2–5 jours |
| Décision sur les posts tiers (manuel vs. fournisseur) | Oui | Direction Com | arbitrage budgétaire |
| Table `mentions` étendue + collecte réactions | Non | RADAR (implémentable) | 1 itération |
| Règle de détection + alertes | Non | RADAR (implémentable) | 1 itération |

---

## 5. Séquencement recommandé

1. **Immédiat, sans aucun accès externe** : signalement manuel d'un post + suivi
   de ses commentaires saisis à la main, avec la règle de détection en place.
   Cela valide toute la chaîne d'alerte sur des données réelles.
2. **Dès réception du token X** : réactivation de la veille X/Twitter avec
   remontée des réponses (`conversation_id`).
3. **Dès token Meta** : commentaires sur les Pages ANSUT.
4. **Arbitrage** sur un fournisseur tiers si la couverture des posts de tiers
   (cas SIKA Finance) est jugée indispensable.

---

*Toute information affichée par ce dispositif doit rester conforme à la
[Charte de Crédibilité](CHARTE_CREDIBILITE.md) : origine connue, méthode
explicable, chiffre égal aux preuves. En l'absence de donnée, on affiche
l'absence — jamais une estimation.*
