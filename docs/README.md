# Documentation Développeur - ANSUT RADAR

Bienvenue dans la documentation technique du projet ANSUT RADAR, plateforme de veille stratégique pour l'Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire.

## 📚 Index de la Documentation

### Documentation Technique

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | Architecture technique, stack, patterns |
| [Base de données](./DATABASE.md) | Schéma, 17 tables, RLS policies |
| [Edge Functions](./EDGE-FUNCTIONS.md) | 9 fonctions backend documentées |
| [Authentification](./AUTHENTICATION.md) | Flux auth, 4 rôles, permissions |
| [Référence API](./API.md) | Endpoints, payloads, exemples curl |
| [Contribution](./CONTRIBUTING.md) | Guide Git, conventions de code |
| [Déploiement](./DEPLOYMENT.md) | Lovable Cloud, variables, CRON |
| [Dépannage](./TROUBLESHOOTING.md) | FAQ, erreurs courantes, debug |

### Guides Utilisateurs

| Document | Description |
|----------|-------------|
| [Présentation de la solution](./OVERVIEW.md) | Vue d'ensemble ANSUT RADAR |
| [Index des formations](./formation/README.md) | Guides par profil utilisateur |
| [Formation Administrateur](./formation/ADMIN.md) | Gestion de la plateforme |
| [Formation Utilisateur](./formation/USER.md) | Analyse et veille quotidienne |
| [Formation Conseil](./formation/COUNCIL-USER.md) | Consultation avancée |
| [Formation Invité](./formation/GUEST.md) | Accès lecture seule |

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+
- npm ou bun
- Compte Lovable avec accès au projet

### Installation

```bash
# Cloner le dépôt
git clone <repository-url>
cd ansut-radar

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

### Variables d'environnement

Le fichier `.env` est géré automatiquement par Lovable Cloud :

```env
VITE_SUPABASE_URL=<auto>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto>
VITE_SUPABASE_PROJECT_ID=<auto>
```

## 🏗️ Structure du Projet

```
ansut-radar/
├── docs/                    # 📖 Cette documentation
├── public/                  # Assets statiques
├── src/
│   ├── assets/             # Images et médias
│   ├── components/         # Composants React (50+)
│   ├── contexts/           # Contextes React (Auth, ViewMode)
│   ├── hooks/              # Hooks personnalisés (13+)
│   ├── integrations/       # Client Supabase (auto-généré)
│   ├── lib/                # Utilitaires
│   ├── pages/              # Pages de l'application
│   ├── types/              # Types TypeScript
│   └── utils/              # Fonctions utilitaires
├── supabase/
│   ├── config.toml         # Configuration (auto-géré)
│   └── functions/          # 9 Edge Functions
├── README.md               # Documentation principale
└── CHANGELOG.md            # Historique des versions
```

## 📖 Liens Utiles

- [README principal](../README.md) - Vue d'ensemble complète
- [CHANGELOG](../CHANGELOG.md) - Historique des modifications
- [Lovable Docs](https://docs.lovable.dev) - Documentation Lovable

## 🔐 Accès Backend

L'accès au backend (base de données, logs, storage) se fait via l'interface Lovable Cloud intégrée à l'éditeur.

---

**Dernière mise à jour :** Janvier 2026
