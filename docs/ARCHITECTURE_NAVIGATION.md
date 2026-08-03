# Architecture de navigation — trois espaces, trois publics

> **Règle d'architecture permanente.** RADAR mélangeait trois univers qui n'ont
> pas les mêmes utilisateurs : le **métier** (ce que fait la DIRCOM), l'**admin**
> (configurer le moteur) et l'**exploitation** (faire tourner la plateforme). On
> les sépare explicitement. **Le Directeur de la Communication ne doit jamais
> voir les écrans techniques.**

## Les trois espaces

```
1. RADAR — produit éditorial      → la DIRCOM, tous les jours
2. Administration — configuration → quelques administrateurs
3. Console technique — exploitation → Super Admin uniquement (caché du produit)
```

Toute fonctionnalité à **valeur métier** vit dans le **produit** (menus
principaux), jamais dans l'administration. La console technique ne doit **jamais**
encombrer l'expérience quotidienne de la Direction de la Communication.

---

## 1. RADAR — le produit éditorial (menus principaux)

Uniquement ce que la DIRCOM **consulte et utilise au quotidien** :

| Menu | Question |
|---|---|
| **Ce matin** | Que dois-je savoir maintenant ? |
| **Veille** | Que dit la presse aujourd'hui ? |
| **Recherche** | Tout ce qui existe sur un sujet |
| **Notre communication** | Comment l'ANSUT est-elle visible ? |
| **📊 Insights** | Comment avons-nous communiqué ? |
| **Acteurs** | Qui parle, qui compte ? |
| **Publier** | Que dois-je produire et envoyer ? |
| **Assistant** | Aide-moi à analyser et rédiger |

**Insights devient un menu de premier niveau à part entière** (plus « sous » quoi
que ce soit) : c'est là que la DIRCOM va chercher évolution des thèmes, volumes
par réseau, fréquence, campagnes, partenaires, formats, part de voix, comparaison
écosystème, recommandations IA. C'est devenu un produit à part entière.

> *Note ouverte* : **Surveillance** (flux de veille personnels) reste à trancher —
> métier (vue) ou configuration (mise en place d'un flux). Défaut proposé :
> le garder dans le produit s'il sert à consulter, le déplacer en Administration
> s'il ne sert qu'à paramétrer.

### Valeur éditoriale à REMONTER de Réglages vers le produit

| Aujourd'hui dans Réglages | Doit vivre dans | Condition |
|---|---|---|
| **Résonance de nos publications** (part de voix) | **📊 Insights** | seulement si crédible (test du DG) |
| **Veille des dirigeants** (shadow tracker) | **Acteurs** (ou Notre communication) | — |
| **Coffre à contenus** (contenus validés) | **Publier** | — |
| **Newsletters** / **Matinale** | **Publier** | — |
| **Événements stratégiques** | **Ce matin** (calendrier éditorial) | — |
| **Alertes** | Notifications / Ce matin | — |

> Réserve Charte : Résonance / part de voix et SPDI avaient été signalés dans
> l'audit P0 comme *pas encore crédibles*. On ne les remonte au produit **que**
> s'ils passent le test du DG ; sinon ils restent en coulisses jusqu'à correction.

---

## 2. Administration — la configuration (accès administrateurs)

On **supprime le mot « Réglages »** (il mélange tout). On le remplace par
**Administration**, qui ne contient QUE de la configuration :

| Entrée | Rôle |
|---|---|
| **Sources et médias** | quelles sources la plateforme surveille |
| **Comptes surveillés** | comptes sociaux suivis (ajout par URL) |
| **Connecteurs sociaux** / **Connecteurs API** | autorisations LinkedIn/Facebook/X… |
| **Mots-clés et thèmes** | vocabulaire de qualification |
| **Crédibilité des sources** | fiabilité des sources |
| **Règles de notation** | paramètres de scoring |
| **Connaissance institutionnelle** | base de connaissance ANSUT |
| **Veille sémantique** | configuration du filtrage |
| **Titrologie** | configuration de la collecte presse |
| **Utilisateurs** | comptes utilisateurs |
| **Rôles et permissions** | droits d'accès |
| **Sécurité** | politiques d'accès, revue de sécurité |

*(Formation, Présentation et Documentation ne sont ni produit, ni config, ni ops :
regroupées sous « Aide & ressources ».)*

---

## 3. Console technique — l'exploitation (Super Admin uniquement)

Complètement **hors du produit éditorial**. Réservée à un rôle **Super Admin** ;
la DIRCOM ne la voit jamais.

| Entrée | Rôle |
|---|---|
| **Pipeline / Moteur éditorial** | collecter, qualifier, backfill |
| **Import manuel** | saisie/CSV/endpoint de secours |
| **Collectes** | exécutions et diagnostics de collecte |
| **Tâches programmées (CRON)** | planification |
| **Diagnostic** | requêtes de contrôle (dates, couverture) |
| **Backfill / Requalification** | recalcul de la qualification |
| **État du calcul des scores** (SPDI batch) | supervision des jobs |
| **Fraîcheur des données** | diagnostic de fraîcheur |
| **Journal des actions** (audit) | traçabilité |
| **Santé / Logs / Jobs** | supervision technique |

> **Rôle Super Admin** : la console est masquée derrière un rôle dédié. Cible :
> ajouter `super_admin` au RBAC (les 4 rôles actuels sont `admin`, `user`,
> `council_user`, `guest`). En transition, on peut la gater derrière `admin` + une
> permission `access_ops_console`, le temps d'introduire le rôle.

---

## Cible visuelle

```
┌─ RADAR (produit) ──────────────────────────────────────────────┐
│ Ce matin · Veille · Recherche · Notre communication ·          │
│ 📊 Insights · Acteurs · Publier · Assistant                    │
└────────────────────────────────────────────────────────────────┘
        (barre latérale principale — la DIRCOM ne voit que ça)

┌─ Administration (admins) ─┐     ┌─ Console technique (super admin) ─┐
│ Configuration · Sécurité  │     │ Pipeline · Collectes · Logs ·      │
│ Sources · Comptes ·       │     │ Jobs · CRON · Diagnostic ·         │
│ Connecteurs · Utilisateurs│     │ Backfill · Santé · Maintenance     │
└───────────────────────────┘     └────────────────────────────────────┘
```

## Chemin de migration (incrémental)

1. **Ce document** — la cible fait foi.
2. **Scinder le registre `reglages.ts`** en deux espaces : **Administration**
   (config) et **Console technique** (ops) ; renommer « Réglages » → « Administration ».
3. **Gater la Console technique** derrière une permission dédiée (puis un rôle
   `super_admin`).
4. **Remonter la valeur éditoriale** vers le produit, un écran à la fois :
   Coffre → Publier · Événements → Ce matin · Shadow tracker → Acteurs ·
   Newsletters → Publier · Résonance → Insights (si crédible).
5. **Insights** : confirmer comme menu principal de plein droit (déjà présent).

À l'arrivée : trois espaces nets, trois publics, une DIRCOM qui n'ouvre que le
produit — et une plateforme d'administration/exploitation qui ne l'encombre plus.
