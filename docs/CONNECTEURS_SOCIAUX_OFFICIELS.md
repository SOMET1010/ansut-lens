# Connecteurs sociaux officiels (API) — architecture

> **Décision** : Facebook et LinkedIn sont **l'essentiel de la communication de
> l'ANSUT**. Ils sont traités comme des **connecteurs officiels** (API), pas comme
> du scraping. Objectif : dates réelles, identifiants stables, texte + formats,
> réactions/commentaires/partages/vues, historique fiable, **zéro doublon**,
> provenance vérifiable. Le scraping (Firecrawl) reste réservé aux sites publics
> sans API exploitable.
>
> **Règle de sécurité absolue** : aucun secret ni jeton dans le front Lovable.
> Tous les appels et jetons vivent dans les **Edge Functions** et les **secrets
> Supabase**. La table des jetons n'est **jamais** lisible depuis le navigateur.

## 1. Principe — tous les connecteurs alimentent le même pipeline

```
Facebook Graph API ─┐
LinkedIn Posts API ─┼──> Connecteurs officiels ──> publications_institutionnelles
X API ──────────────┤        (Edge Functions)            │  (étage 1)
YouTube API ────────┘                                     ▼
Firecrawl (sites publics) ────────────────────────>  Qualification (étage 2)
Import manuel (filet provisoire) ─────────────────>       │
                                                          ▼
                                              Insights / Ce matin / Notre com (étage 3)
```

Chaque connecteur écrit des **champs normalisés** dans `publications_institutionnelles` :

| Champ | Source API |
|---|---|
| `plateforme` | connecteur (`linkedin`, `facebook`…) |
| `url_original` | permalien du post (identifiant stable) |
| `contenu` | texte du post |
| `type_contenu` | post / article / vidéo / image |
| `date_publication` | **date réelle** fournie par l'API |
| `publication_date_source` | `platform_metadata` |
| `publication_date_verified` | `true` (l'API donne la vraie date) |
| `media_urls` | médias |
| `likes_count` / `comments_count` / `shares_count` / `vues_count` | métriques réelles **si l'API les fournit** |
| `hashtags` | extraits du texte |
| `vip_compte_id` | compte surveillé correspondant |

> La qualification (étage 2) et les vues (étage 3) ne changent pas : elles
> consomment ces contenus comme les autres. La différence, c'est la **fiabilité de
> la source**.

## 2. Stockage des jetons — `social_connections` (server-only)

Table dédiée aux connexions OAuth (jetons). **RLS : aucune policy pour le front**
→ seule une Edge Function (service_role) y accède. Le statut de connexion (sans
jeton) sera exposé au front par une petite Edge Function de lecture, jamais par un
`select` direct.

Colonnes : `plateforme`, `org_identifier` (URN LinkedIn / Page ID Facebook),
`display_name`, `access_token`, `refresh_token`, `token_expires_at`, `scope`,
`statut` (`connected|expired|error|revoked`), `connected_by`, `connected_at`,
`last_sync_at`, `last_error`, `meta`. Migration :
`supabase/migrations/20260803140000_social_connections.sql`.

## 3. LinkedIn (à démarrer en premier — identifiants déjà présents)

Secrets déjà en place : `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.

### Flux OAuth (autorisation d'un administrateur de la Page ANSUT)

1. **`linkedin-oauth-start`** (Edge) → redirige l'admin vers
   `https://www.linkedin.com/oauth/v2/authorization` avec `client_id`,
   `redirect_uri`, `state`, `scope`.
2. L'admin ANSUT autorise.
3. **`linkedin-oauth-callback`** (Edge) → reçoit `code`, l'échange contre un
   `access_token` (+ `refresh_token`) via
   `https://www.linkedin.com/oauth/v2/accessToken`, résout l'URN de
   l'organisation, et stocke le tout dans `social_connections`.
4. Renouvellement : rafraîchir avant `token_expires_at`.

### Lecture des publications de l'organisation

- Endpoint : `GET https://api.linkedin.com/rest/posts?q=author&author={organizationURN}&...`
- En-têtes **obligatoires** :
  - `Authorization: Bearer {access_token}`
  - `LinkedIn-Version: AAAAMM` (version datée, ex. `202401`)
  - `X-Restli-Protocol-Version: 2.0.0`
- Permission : **`r_organization_social`** (lecture des contenus organiques de
  l'organisation). Réservée aux membres ayant un **rôle admin / responsable de
  contenu** sur la Page.

### ⚙️ À configurer côté LinkedIn (par l'admin ANSUT) — **prérequis externes**

- Dans le portail LinkedIn Developers, sur l'app correspondant à
  `LINKEDIN_CLIENT_ID` :
  - **Redirect URL autorisée** :
    `https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/linkedin-oauth-callback`
  - **Produits** : demander l'accès à **« Community Management API »** (lecture
    des posts d'organisation). Cet accès nécessite une **validation LinkedIn**
    (peut prendre plusieurs jours).
  - Vérifier que le compte qui autorise a bien un **rôle admin** sur la Page ANSUT.

## 4. Facebook (ensuite — Graph API avec jeton de Page)

- Connexion **Meta admin** de la Page ANSUT → obtention d'un **jeton de Page**
  (Page Access Token, idéalement longue durée).
- Permissions : lecture des posts + insights de la Page.
- Endpoints Graph : `/{page-id}/posts` (posts) et `/{post-id}/insights` +
  `reactions.summary(true)`, `comments.summary(true)`, `shares` pour les métriques.
- Secrets à ajouter (côté Supabase) : `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`,
  et le jeton de Page stocké dans `social_connections`.
- Redirect URL callback :
  `https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/facebook-oauth-callback`.

## 5. Filet provisoire — import manuel (CSV / URLs)

Pour ne pas laisser Insights vide pendant la validation des accès : un import
**CSV** (ou collage d'URLs de posts) que la com peut produire depuis les exports
natifs. Champs minimaux : plateforme, url, date de publication réelle, texte,
type, et si dispo likes/commentaires/partages/vues. Provenance = **`manuel`**
(honnête : marqué comme saisi, pas comme collecté automatiquement).

## 6. Déploiement par étapes

1. **Doc + table `social_connections`** *(ce lot)* — à appliquer (migration).
2. **LinkedIn** : OAuth (start + callback) → `collecte-linkedin` (Posts API).
3. **Facebook** : OAuth Meta + jeton de Page → `collecte-facebook`.
4. **Import manuel** (en parallèle, dès que possible) pour initialiser les données.
5. Firecrawl **uniquement** pour les sites publics sans API (le site ansut.ci
   quand il expose du HTML exploitable).

## 7. Ce que ça débloque pour Insights Communication

Vraies dates · identifiants stables · texte + formats · **likes / commentaires /
partages / vues réels** · historique fiable · **aucun doublon de scraping** ·
provenance vérifiable. C'est la seule voie assez solide pour produire des
statistiques crédibles et des recommandations utiles à la DIRCOM.
