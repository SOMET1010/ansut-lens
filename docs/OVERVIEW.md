# ANSUT RADAR - Présentation de la Solution

## Introduction

**ANSUT RADAR** est une plateforme de veille stratégique développée pour l'Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire (ANSUT). Elle centralise la collecte, l'analyse et la diffusion d'informations stratégiques pour soutenir la prise de décision.

---

## Contexte

L'ANSUT, acteur clé du développement numérique en Côte d'Ivoire, fait face à un environnement en constante évolution :

- **Évolutions réglementaires** rapides du secteur télécom
- **Acteurs multiples** (opérateurs, régulateurs, organisations internationales)
- **Volume croissant** d'informations à traiter quotidiennement
- **Besoin de réactivité** face aux signaux faibles et tendances émergentes

ANSUT RADAR répond à ces défis en offrant une vision consolidée et intelligente de l'écosystème télécom.

---

## Objectifs

| # | Objectif | Description |
|---|----------|-------------|
| 1 | **Détecter** | Identifier les signaux faibles et tendances émergentes |
| 2 | **Surveiller** | Suivre les acteurs clés et leur présence digitale |
| 3 | **Analyser** | Enrichir les actualités avec l'intelligence artificielle |
| 4 | **Alerter** | Notifier en temps réel les informations critiques |
| 5 | **Décider** | Fournir des synthèses et recommandations actionnables |
| 6 | **Diffuser** | Produire et envoyer des newsletters professionnelles |

---

## Les 9 Modules

### 1. 📊 Centre de Veille (Radar)

Vue d'ensemble des indicateurs clés :
- Briefing quotidien généré par IA
- Alertes actives et signaux faibles
- Flux d'intelligence en temps réel
- KPIs de veille stratégique

### 2. 📰 Actualités & Veille

Fil d'actualités enrichi par l'IA :
- Collecte automatique multi-sources
- Analyse de sentiment et importance
- Catégorisation thématique
- Indicateur de fraîcheur et clustering

### 3. 📡 Mes Flux

Flux de veille personnalisés :
- Création par mots-clés et catégories
- Alertes email configurables
- Digest quotidien ou temps réel
- Requêtes générées par IA

### 4. 👥 Acteurs & Influence

Module unifié regroupant 4 vues par onglets :
- **Cartographie** : Fiches acteurs avec cercles stratégiques et score SPDI
- **Dashboard SPDI** : Analyse détaillée par acteur (jauge, radar axes, évolution, recommandations IA)
- **Revue Stabilité** : Vue panoramique des tendances et risques sur tous les acteurs
- **Benchmark** : Mode "Duel d'Influence" pour comparer deux acteurs

### 5. 📁 Studio Publication

Notes et newsletters professionnelles :
- Éditeur Markdown riche pour notes stratégiques
- Studio Newsletter WYSIWYG avec drag & drop de blocs
- Prévisualisation responsive (Desktop, Tablette, Mobile)
- Export HTML et envoi par email

### 6. 🤖 Assistant IA

Chatbot intelligent contextuel :
- Questions en langage naturel
- Accès aux données de veille
- Historique des conversations
- Mode analyse et mode document

### 7. 🔔 Alertes

Centre de notifications :
- Alertes critiques en temps réel
- Historique consultable avec filtres
- Marquage lu/traité
- Alertes SMS pour situations critiques

### 8. 📊 SPDI Analytics

Score de Présence Digitale Institutionnelle :
- Calcul composite 4 axes (Visibilité 30%, Qualité 25%, Autorité 25%, Présence 20%)
- Recommandations stratégiques générées par IA (Gemini)
- Comparaison temporelle multi-acteurs
- Classement par axe de performance

### 9. 📧 Diffusion

Système de diffusion automatisée :
- Programmation d'envois par canal (email, SMS)
- Gestion des destinataires avec groupes
- Logs d'envoi avec statistiques
- Rappels automatiques pour validation

---

## Utilisateurs Cibles

| Profil | Description | Accès |
|--------|-------------|-------|
| **Administrateur** | Gestionnaire de la plateforme | Complet + Configuration + Permissions |
| **Utilisateur** | Analyste / Chargé de veille | Toutes fonctionnalités |
| **Membre du Conseil** | Consultation avancée | Lecture + Flux personnels + Assistant IA |
| **Invité** | Accès limité | Tableau de bord + Actualités |

---

## Bénéfices

### ⏱️ Gain de Temps
- Collecte automatisée toutes les 6 heures
- Enrichissement IA instantané
- Alertes push ciblées
- Newsletters générées automatiquement

### 🎯 Centralisation
- Une seule interface pour toutes les sources
- Vision consolidée des acteurs et de leur influence
- Historique complet et traçabilité

### 🧠 Intelligence Artificielle
- Analyse de sentiment automatique
- Résumés et points clés
- Assistant conversationnel
- Recommandations stratégiques SPDI
- Génération de newsletters

### ⚡ Temps Réel
- Notifications instantanées
- Actualités en continu
- Score SPDI actualisé
- Alertes SMS critiques

---

## Architecture Technique

```
┌─────────────────────────────────────────────────────────────┐
│                    ANSUT RADAR                              │
├─────────────────────────────────────────────────────────────┤
│  Frontend React + TypeScript + Tailwind CSS                 │
│  └── Interface responsive et moderne (80+ composants)       │
├─────────────────────────────────────────────────────────────┤
│  Backend Lovable Cloud                                      │
│  ├── Base de données PostgreSQL (30+ tables)                │
│  ├── Edge Functions (23 fonctions serverless)               │
│  ├── Authentification sécurisée (4 rôles + permissions)     │
│  └── Stockage fichiers                                      │
├─────────────────────────────────────────────────────────────┤
│  Intégrations                                               │
│  ├── APIs de recherche (Perplexity)                         │
│  ├── Modèles IA (Google Gemini via Lovable AI)              │
│  ├── Service email (Resend)                                 │
│  └── Service SMS                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Feuille de Route

### ✅ Version Actuelle (v1.4)

- Collecte automatique multi-sources
- Enrichissement IA des actualités (Gemini)
- Score SPDI complet (4 axes, scoring 0-100)
- Recommandations stratégiques IA
- Mode Benchmark "Duel d'Influence"
- Menu unifié "Acteurs & Influence" avec onglets
- Studio Newsletter WYSIWYG avec blocs drag & drop
- Flux de veille personnalisés avec requêtes IA
- Assistant IA contextuel avec streaming
- Système d'alertes temps réel + SMS
- Système de permissions granulaires par rôle
- Guides de formation PDF par profil
- 23 Edge Functions déployées
- Programmation et diffusion automatisée

### 🔜 Évolutions Prévues

| Fonctionnalité | Description |
|----------------|-------------|
| Calcul SPDI CRON | Calcul automatique quotidien via tâche planifiée |
| Intégration LinkedIn | Suivi automatisé des publications via API |
| Dashboard personnalisable | KPIs et widgets configurables par utilisateur |
| API publique | Accès programmatique aux données |

---

## Contact

Pour toute question sur ANSUT RADAR :

- **Email** : support@ansut.ci
- **Documentation technique** : [docs/README.md](./README.md)

---

**© 2026 ANSUT - Agence Nationale du Service Universel des Télécommunications**

*Côte d'Ivoire*
