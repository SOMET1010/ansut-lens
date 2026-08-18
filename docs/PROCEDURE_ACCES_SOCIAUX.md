# Procédure d'obtention des accès sociaux — pas à pas

> Objectif : permettre à RADAR de lire les **réactions du public** (posts et
> commentaires) sur Facebook, X et LinkedIn. Ce document ne décrit pas des
> principes : il décrit **les clics à faire, par qui, dans quel ordre**, et
> **pourquoi chaque étape change concrètement ce que RADAR peut détecter**.
>
> Règle absolue : **aucun mot de passe n'est transmis à qui que ce soit.**
> Tout se fait par **délégation de rôle** sur un compte existant, ou par
> **génération d'un jeton** que l'on colle ensuite dans RADAR.

---

## 0. La question du « compte admin » — réponse claire

### Pourquoi on veut ça
Sans accès officiel aux API des réseaux sociaux, RADAR ne peut voir que les
**articles** (presse). Or les bad buzz et les attaques réputationnelles naissent
souvent dans les **commentaires** et les **fil de discussion** sociaux, bien
avant de devenir un article. Le 17/08, le commentaire critique sous le post
SIKA Finance est passé inaperçu faute de ces accès.

### Conséquence sur RADAR dès qu'on a les accès
- Nouvelle table `mentions` alimentée en temps réel (posts, réponses,
  commentaires).
- Alerte automatique dès qu'un fil dépasse un seuil de tonalité négative ou
  d'engagement.
- Le « Sujet chaud » de la Matinale peut désormais inclure des signaux sociaux,
  pas seulement des titres de presse.

> **Action 0 — DIRCOM** : établir la liste nominative
> « Plateforme → personne → rôle actuel », et vérifier que ces personnes sont
> toujours en poste. Si l'admin d'origine est parti, voir §4 (récupération).

| Plateforme | De quel « admin » on parle | Qui l'a aujourd'hui à l'ANSUT (à confirmer) | Ce que ce compte permet |
|---|---|---|---|
| **Facebook / Instagram** | Un **profil Facebook personnel** ayant le rôle **Administrateur** sur la **Page ANSUT** dans le **Meta Business Manager** | La personne qui a créé la Page ANSUT (souvent un ancien prestataire ou un agent de la DIRCOM) | Créer une app Meta, générer un **Page Access Token** |
| **X (Twitter)** | Le **compte X @ansut_ci lui-même** (login + mot de passe du compte officiel) | La cellule COM qui publie sur X | Ouvrir le **Developer Portal**, souscrire au plan Basic, générer le **Bearer Token** |
| **LinkedIn** | Un **profil LinkedIn personnel** ayant le rôle **Super administrateur** de la **Page entreprise ANSUT** | L'agent qui gère la page LinkedIn | Créer/réactiver l'app, demander la Community Management API |

---

## 1. Facebook / Instagram — 6 étapes, ~45 min + délai de validation

### Pourquoi on veut ça
Facebook reste le réseau de référence en Côte d'Ivoire pour les réactions du
grand public. Le cas SIKA Finance a eu lieu sur Facebook. Avec un jeton de Page,
RADAR peut lire les commentaires publiés sur les posts de la Page ANSUT, mesurer
la tonalité, et alerter en cas de dérive.

### Conséquence sur RADAR
- Collecte des commentaires de la Page ANSUT toutes les 15 min.
- Alerte « bad buzz » dès qu'un post accumule 3+ commentaires négatifs en 24h
  ou un engagement anormal.
- Affichage dans la Carte Sujet et la Matinale d'un nouveau type de preuve :
  « réaction citoyenne ».

### Prérequis
La Page ANSUT doit être rattachée à un **Meta Business Manager**. Si ce n'est
pas le cas, il faut d'abord en créer un (`business.facebook.com` → Créer un
compte) et y **revendiquer la Page**.

### Étapes

1. **Vérifier son rôle.**
   `business.facebook.com` → **Paramètres de l'entreprise** → **Comptes** →
   **Pages** → sélectionner « ANSUT » → onglet **Personnes**.
   La personne doit apparaître avec **Accès complet / Administrateur**.
   *Si elle apparaît en « Éditeur », elle ne pourra pas générer de jeton.*

2. **Créer l'application Meta.**
   `developers.facebook.com/apps` → **Créer une app** →
   Type : **Entreprise (Business)** → Nom : `ANSUT RADAR` →
   Rattacher au **Business Manager de l'ANSUT** (champ obligatoire).

3. **Ajouter le produit.**
   Dans l'app → **Ajouter un produit** → **Connexion Facebook** (Facebook Login)
   → *Paramètres* → laisser par défaut.

4. **Demander les permissions.**
   Menu **Vérification de l'app** → **Autorisations et fonctionnalités** →
   demander :
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `pages_show_list`
   - (+ `instagram_basic`, `instagram_manage_comments` si Instagram)

   Meta demande une **justification écrite** et souvent une **vidéo de
   démonstration**. Texte à fournir (à copier tel quel) :

   > « L'Agence Nationale du Service Universel des Télécommunications (ANSUT)
   > utilise cette application pour lire les commentaires et réactions publiés
   > sur sa propre Page Facebook institutionnelle, afin d'assurer le suivi de
   > sa réputation en ligne et de répondre aux sollicitations citoyennes.
   > Aucune donnée personnelle n'est revendue ni transmise à des tiers. »

   *Délai de validation Meta : 3 à 10 jours ouvrés.*

5. **Générer le jeton de Page.**
   `developers.facebook.com/tools/explorer` → sélectionner l'app `ANSUT RADAR`
   → **Get Token** → **Get Page Access Token** → choisir la Page ANSUT.
   Puis **prolonger le jeton** (60 jours) via
   `developers.facebook.com/tools/debug/accesstoken` → **Extend Access Token**.

   *Recommandé* : plutôt qu'un jeton 60 j à renouveler, créer un
   **System User** (Business Manager → Utilisateurs → Utilisateurs système →
   Ajouter → rôle Admin → Générer un jeton). Ce jeton **n'expire pas**.

6. **Transmettre à RADAR.**
   Coller les valeurs dans les secrets suivants (jamais par email ni WhatsApp —
   uniquement via l'écran sécurisé Administration → Connecteurs) :
   `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ID`, `META_PAGE_TOKEN`.

### ⚠️ Limite à accepter dès maintenant
Ce jeton donne accès aux commentaires **de la Page ANSUT uniquement**. Les
commentaires sous un post d'un **média tiers** (cas SIKA Finance du 17/08) ne
sont **pas** couverts — voir §5.

---

## 2. X (Twitter) — 4 étapes, ~30 min, effet immédiat

### Pourquoi on veut ça
X est le réseau où circulent les réactions des journalistes, influenceurs et
institutions. C'est aussi le seul réseau où l'on peut, avec un accès payant,
faire de la recherche de mentions (écouter ce qui se dit sur l'ANSUT sans avoir
besoin d'être tagué).

### Conséquence sur RADAR
- Veille mentions sur les mots-clés « ANSUT », « Service Universel »,
  « télécommunications Côte d'Ivoire » toutes les 15 min.
- Collecte des réponses aux tweets de l'ANSUT : détection d'attaques ou de
  questions qui émergent dans les fils.
- Enrichissement du widget « Média impact » et des alertes temps réel avec les
  posts viraux.

### Étapes

1. **Se connecter avec le compte officiel** `@ansut_ci` (pas un compte perso) sur
   `developer.x.com`.
2. **Souscrire au plan Basic** (`developer.x.com/en/portal/products`).
   Le plan **Free ne permet pas** la recherche de mentions — c'est la cause du
   401 actuel. Coût indicatif : **100 USD/mois**. *Décision budgétaire DIRCOM.*
3. **Projet & App** : Portal → **Projects & Apps** → créer/ouvrir l'app
   `ANSUT RADAR` → onglet **Keys and tokens** → **Bearer Token** →
   **Regenerate**. Copier immédiatement (il n'est affiché **qu'une fois**).
4. **Transmettre** : secret `TWITTER_BEARER_TOKEN` dans RADAR.

Effet : réactivation de la veille mentions + remontée des **réponses** aux
tweets (fils de discussion) — donc détection des bad buzz sur X dès le
lendemain.

---

## 3. LinkedIn — 3 étapes, mais délai long

### Pourquoi on veut ça
LinkedIn est le réseau de l'institutionnel et de la diaspora professionnelle. Les
crises réputationnelles y sont plus rares mais plus lourdes ( décideurs,
partenaires, bailleurs). Le suivi des commentaires sur les posts de la Page
ANSUT permet d'anticiper les crispations professionnelles.

### Conséquence sur RADAR
- Collecte des commentaires sur les posts LinkedIn de la Page ANSUT.
- Alerte « réputation institutionnelle » avec un seuil plus bas (LinkedIn = plus
  petit volume, plus forte valeur).
- Intégration dans le score de présence digitale institutionnelle (SPDI) :
  engagement et tonalité des commentaires.

### Étapes

1. **Vérifier son rôle** : `linkedin.com/company/ansut/admin/` → **Paramètres**
   → **Gérer les administrateurs**. Il faut **Super administrateur**.
2. **Réactiver l'app** : `linkedin.com/developers/apps` → ouvrir l'app liée à
   `LINKEDIN_CLIENT_ID` (elle renvoie `disabled_client`).
   - Onglet **Settings** → **Verify** : LinkedIn génère une **URL de
     vérification** à envoyer à un admin de la Page ANSUT, qui doit cliquer.
   - Si l'app est irrécupérable : en créer une nouvelle, associée à la Page ANSUT.
3. **Demander le produit** : onglet **Products** → **Community Management API**
   → Request access. *Délai réel : 2 à 4 semaines, validation manuelle LinkedIn.*

Tant que ce produit n'est pas accordé, LinkedIn reste en lecture limitée. Ne pas
bloquer les autres chantiers dessus.

---

## 4. Si l'admin d'origine est parti (cas fréquent)

### Pourquoi il faut agir vite
Un compte social lié à une seule personne physique est un risque opérationnel.
Si cette personne part sans transmettre le rôle, l'ANSUT perd la capacité à
publier **et** à surveiller sa réputation. Il faut donc d'abord sécuriser les
accès, puis alimenter RADAR.

### Conséquence sur RADAR
Tant que l'accès n'est pas récupéré, la plateforme concernée reste **muette** dans
RADAR : pas de collecte, pas d'alerte, pas d'affichage dans la Matinale. La
récupération de l'accès est donc une condition de couverture.

| Situation | Procédure de récupération |
|---|---|
| Page Facebook sans admin joignable | Meta → « Signaler une Page non réclamée » : `facebook.com/help/contact/164405897002583`. Exige des **pièces justificatives officielles** (RCCM, arrêté de création, papier à en-tête signé du DG). Délai : 2 à 6 semaines. |
| Compte X inaccessible | Réinitialisation via l'email institutionnel rattaché. Si l'email est perdu : formulaire d'assistance X + justificatif d'identité de l'organisation. |
| Page LinkedIn sans admin | `linkedin.com/help/linkedin/ask/PSAA` — « Demander l'accès administrateur à une Page ». Exige une adresse email au **domaine ansut.ci** vérifiée. |

> **Action recommandée maintenant, sans attendre** : créer des adresses
> institutionnelles dédiées (`social@ansut.ci`, `radar@ansut.ci`) et les
> rattacher comme **admin secondaire** partout. Cela évite que le départ d'un
> agent ne fasse perdre un accès.

---

## 5. Les posts de tiers (le vrai angle mort)

### Pourquoi c'est le problème principal
Aucune API officielle (Meta, X, LinkedIn) ne permet de lire les commentaires
sous un post d'une **Page que l'ANSUT ne possède pas**. C'est précisément le cas
du post SIKA Finance du 17/08. Même avec tous les accès du §1, §2 et §3, ce
type de buzz ne serait pas détecté automatiquement.

### Conséquence sur RADAR selon l'option choisie

| Option | Ce que ça donne dans RADAR | Coût | Délai |
|---|---|---|---|
| **A. Signalement manuel assisté** | Un agent COM colle l'URL du post dans RADAR ; RADAR crée un « fil à suivre » et alerte sur la tonalité des commentaires saisis manuellement. | **0 F** | implémentable **immédiatement**, sans aucun accès externe |
| **B. Prestataire de social listening** (Brand24, Talkwalker, Meltwater, Mention) | Couverture réelle des commentaires publics, y compris chez les tiers, intégrable via API dans RADAR. | 150–800 USD/mois | 1–2 semaines |
| **C. Surveillance des pages médias** (RSS + volume de partages) | Signal faible : on sait qu'un article circule, mais pas ce qui se dit en commentaire. | 0 F | 1 itération |

**Recommandation** : lancer **A** tout de suite (ça valide toute la chaîne
d'alerte sur du réel), arbitrer **B** en parallèle si la couverture des tiers est
jugée indispensable.

---

## 6. Récapitulatif — qui fait quoi, dans quel ordre, et pourquoi

| # | Action | Responsable | Durée | Pourquoi | Conséquence sur RADAR |
|---|---|---|---|---|---|
| 0 | Lister nominativement les 3 admins (FB / X / LinkedIn) | DIRCOM | 1 jour | Sans identité des détenteurs de rôles, aucune API ne peut être ouverte. | Tout le reste est bloqué tant que cette liste n'est pas claire. |
| 1 | Créer `social@ansut.ci` + l'ajouter comme admin secondaire partout | DSI + DIRCOM | 1 jour | Éviter que le départ d'un agent ne fasse perdre un accès. | Pérennité de la collecte ; réduction du risque de trou noir. |
| 2 | Souscrire plan X Basic + régénérer le Bearer Token | COM + achat | 1 jour | Le plan Free ne permet pas la recherche de mentions. | Veille X et réponses aux tweets réactivées ; alertes bad buzz possibles. |
| 3 | Créer l'app Meta + demander les permissions | admin Page FB | 1 j + 3–10 j Meta | Lire les commentaires de la Page ANSUT. | Commentaires Page ANSUT collectés et analysés. |
| 4 | Réactiver l'app LinkedIn + demander la Community API | admin Page LI | 1 j + 2–4 sem. | Lire les commentaires LinkedIn de la Page ANSUT. | Commentaires LinkedIn intégrés au SPDI et aux alertes. |
| 5 | Arbitrer l'option posts tiers (A / B / C) | Direction | décision | Seule option pour couvrir les posts de médias comme SIKA Finance. | Couverture de l'angle mort social ; pas de buzz non détecté. |
| 6 | ✅ **Fait** — signalement manuel + règle d'alerte | RADAR | livré | Valider la chaîne d'alerte sans attendre les API. | Écran **Réactions** (`/reactions`) : la COM colle l'URL d'un post (y compris tiers), saisit les commentaires observés, RADAR note la tonalité et émet une alerte citant les commentaires déclencheurs. |

### Ce qui est déjà opérationnel côté RADAR (aucun accès externe requis)

Écran **Réactions** dans « La rédaction » :
- signalement d'un fil (URL du post, plateforme, auteur, contexte) ;
- saisie des commentaires observés, avec marquage « compte influent » ;
- notation automatique de la tonalité de chaque commentaire (-1 → +1) ;
- **règle d'alerte explicable** : 3 commentaires négatifs en moins de 24 h **ou**
  1 commentaire négatif d'un compte influent → alerte dans le centre de
  notifications, citant les commentaires réels qui l'ont déclenchée.

---

*Détail technique de ce qui est déjà mesuré côté RADAR (401, 403, absence de
collecte des commentaires) : voir [PREREQUIS_DETECTION_SOCIALE.md](PREREQUIS_DETECTION_SOCIALE.md).*
