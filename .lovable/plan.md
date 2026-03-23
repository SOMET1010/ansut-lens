

## Plan : Veille Réseaux Sociaux Précise et Temps Réel

### Vue d'ensemble
Transformer la veille sociale en un système de suivi précis des comptes ANSUT avec alertes temps réel et tableau de bord dédié.

---

### 1. Gestion précise des comptes ANSUT à suivre

**Table `vip_comptes`** existe déjà avec les champs nécessaires (nom, plateforme, identifiant, url_profil, actif). Les comptes officiels ANSUT et des directeurs y sont configurés.

**Amélioration** : Ajouter dans `collecte-social-api/index.ts` un mode de collecte **par compte individuel** (pas seulement en bulk). Chaque post collecté sera rattaché à son `vip_compte_id` pour un suivi granulaire.

- Modifier `collectTwitter()` pour stocker le `vip_compte_id` quand un tweet vient d'un compte VIP connu
- Modifier `collectLinkedIn()` pour mapper chaque org_id à son vip_compte_id
- Modifier `collectFacebook()` — déjà lié aux VIP comptes

---

### 2. Alertes temps réel

**Fichier** : `supabase/functions/collecte-social-api/index.ts`

Après chaque insertion de post, évaluer des seuils d'alerte :
- **Engagement élevé** : tweet > 50 likes ou > 20 RT → alerte "important"
- **Mention ANSUT par un externe** : alerte "info"  
- **Post VIP directeur** : alerte systématique "info" pour traçabilité
- **Sentiment négatif détecté** : alerte "critique"

Les alertes sont insérées dans la table `alertes` (déjà utilisée par `RealtimeAlertFeed` sur le Radar). Le realtime Supabase est déjà actif sur cette table.

**Fichier** : `supabase/functions/collecte-social-api/index.ts` — renforcer la logique d'alerte existante (actuellement seul "engagement > 100" déclenche une alerte Twitter).

---

### 3. Tableau de bord Réseaux Sociaux dédié

**Nouveau fichier** : `src/pages/ReseauxSociauxPage.tsx`

Contenu du dashboard :
- **KPI Cards** : Total posts 24h, Engagement moyen, Posts critiques, Comptes actifs
- **Timeline par compte** : Derniers posts de chaque compte VIP avec métriques (likes, shares, comments)
- **Graphique engagement** : Évolution sur 7 jours par plateforme (recharts)
- **Top Posts** : Les 10 posts les plus engageants de la semaine
- **Statut des comptes** : Vert (actif aujourd'hui), Orange (>24h sans post), Rouge (>72h)
- **Bouton collecte manuelle** : Déclencher `collecte-social-api` à la demande

**Nouveau hook** : `src/hooks/useReseauxSociaux.ts` — requêtes spécialisées sur `social_insights` groupées par compte VIP.

**Route** : Ajouter `/reseaux-sociaux` dans `App.tsx` et dans le sidebar sous "Espace Communication".

---

### 4. Fréquence de collecte améliorée

Le cron `collecte-social-api-frequent` tourne déjà toutes les 15 minutes. Pour améliorer :

- **Twitter** : Passer de 20 à 50 tweets par collecte (`max_results: 50`)
- **Ajouter un cron dédié VIP** toutes les 5 minutes qui ne collecte **que** les comptes VIP (moins de requêtes API, plus réactif)
- **Quota intelligent** : Ne pas compter les collectes VIP dans le quota général

**Migration SQL** : Créer un nouveau cron job `collecte-vip-rapide` toutes les 5 min ciblant uniquement les comptes VIP actifs.

---

### Résumé des fichiers

| Fichier | Action |
|---------|--------|
| `supabase/functions/collecte-social-api/index.ts` | Rattacher posts aux VIP, alertes enrichies, mode VIP-only |
| `src/pages/ReseauxSociauxPage.tsx` | Nouveau dashboard réseaux sociaux |
| `src/hooks/useReseauxSociaux.ts` | Hook données sociales par compte |
| `src/App.tsx` | Ajouter route `/reseaux-sociaux` |
| `src/components/layout/AppSidebar.tsx` | Ajouter lien dans le menu |
| Migration SQL | Cron job collecte VIP rapide (5 min) |

