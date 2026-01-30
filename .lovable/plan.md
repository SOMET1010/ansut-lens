

# Transformation de la Page Admin en Cockpit Administrateur

## Objectif

Transformer la page d'accueil de l'administration d'une grille de boutons "plate" en un **Tableau de Bord Technique** avec indicateurs de santé système en temps réel.

## Analyse de l'existant

### Données disponibles pour le widget santé
- **Table `collectes_log`** : durée des collectes (duree_ms), statut, erreurs, nombre de résultats
- **Table `admin_audit_logs`** : actions des dernières 24h
- **Hook `useAdminStats`** : statistiques agrégées déjà en place
- **`derniereCollecte`** : timestamp de la dernière collecte

### Organisation actuelle
- 2 sections : "Gestion opérationnelle" et "Supervision technique"
- Cartes centrées avec icônes et badges de comptage
- Pas de vue d'ensemble de l'état du système

## Modifications planifiées

### 1. Nouveau composant `SystemHealthWidget`

Widget noir en haut de page affichant l'état du système :

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ●  Système Opérationnel                 │ Scrapers   │ DB Response │ API   │
│    Dernier check: Il y a 30s v2.1.0     │ 12%        │ 840ms       │ 200 OK│
│                                          ─────────────────────────────────────
└─────────────────────────────────────────────────────────────────────────────┘
```

Données à afficher :
- **Statut global** : Basé sur la dernière collecte (success/warning/error)
- **Durée collecte** : `duree_ms` de la dernière collecte (indicateur de performance)
- **Timestamp** : "Il y a X minutes"
- **Version** : Statique "v2.1.0"
- **Lien vers logs** : Navigation vers `/admin/cron-jobs`

### 2. Nouveau composant `AdminNavCard`

Carte de navigation horizontale remplaçant les cartes centrées :

```text
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                     │
│ │   👥     │  Utilisateurs                         [3 actifs]   │
│ └──────────┘  Invitez des collaborateurs et gérez les accès     │
└─────────────────────────────────────────────────────────────────┘
```

Props :
- icon : Lucide icon
- title : Nom de la fonctionnalité
- subtitle : Description courte
- badge : Compteur ou label
- color : theme de couleur (blue, purple, orange, emerald)
- to : URL de navigation

### 3. Réorganisation des sections

Nouvelle structure en 3 sections logiques :

| Section | Icône | Contenu |
|---------|-------|---------|
| **Organisation** | Users | Utilisateurs, Rôles, Audit Logs |
| **Moteur de Veille** | Database | Mots-clés, Sources, Alertes, Templates |
| **Supervision** | Activity | Tâches CRON (déjà existant) |

### 4. Footer technique

Bandeau discret en bas de page :
- Version de l'application
- Lien vers la documentation technique

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/admin/SystemHealthWidget.tsx` | Widget de santé système avec métriques temps réel |
| `src/components/admin/AdminNavCard.tsx` | Carte de navigation horizontale |

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/AdminPage.tsx` | Refonte complète avec nouveau layout |
| `src/hooks/useAdminStats.ts` | Ajouter données de collecte (durée, statut) |
| `src/components/admin/index.ts` | Exporter nouveaux composants |

## Détails des composants

### SystemHealthWidget.tsx

```text
Structure :
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐                                                               │
│  │ ●        │  Système Opérationnel                                         │
│  │ Activity │  Dernière collecte: Il y a 5 min • v2.1.0                     │
│  └──────────┘                                                               │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │ SCRAPERS    │  │ COLLECTE    │  │ ARTICLES    │  │                   │  │
│  │ ✓ Actifs    │  │ 1.2s        │  │ 24 (24h)    │  │  [Voir les logs]  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Props utilisant useAdminStats enrichi :
- statusGlobal : 'operational' | 'degraded' | 'error'
- lastCollecteTime : formatDistanceToNow
- lastCollecteDuration : en ms → secondes
- articlesCount24h : nombre d'actualités des 24h

### AdminNavCard.tsx

```typescript
interface AdminNavCardProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'success' | 'warning';
  color: 'blue' | 'purple' | 'orange' | 'emerald';
  to: string;
}
```

Couleurs sémantiques :
- **Blue** : Utilisateurs, Audit
- **Purple** : Rôles/Sécurité
- **Orange** : Mots-clés, Alertes, Templates
- **Emerald** : Sources, Données

### Enrichissement useAdminStats.ts

Ajouter à l'interface `AdminStats` :
```typescript
lastCollecteStatus: 'success' | 'error' | null;
lastCollecteDuration: number | null; // en ms
articlesLast24h: number;
```

Nouvelles queries :
```typescript
// Dernière collecte avec détails
const collecteResult = await supabase
  .from('collectes_log')
  .select('created_at, duree_ms, statut')
  .order('created_at', { ascending: false })
  .limit(1);

// Actualités des dernières 24h
const articlesResult = await supabase
  .from('actualites')
  .select('id', { count: 'exact', head: true })
  .gte('created_at', yesterday);
```

## Layout final de la page

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Administration                                                              │
│  Configuration globale, sécurité et maintenance de la plateforme            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────── SANTÉ SYSTÈME ───────────────────────────┐│
│  │ ● Opérationnel  •  Il y a 5 min  •  v2.1.0    │ Collecte │ Articles     ││
│  │                                               │  1.2s    │  24/24h      ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ── 👥 ORGANISATION ─────────────────────────────────────────────────────── │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐    │
│  │ 👥 Utilisateurs     │ │ 🛡️ Rôles           │ │ 📋 Audit Logs       │    │
│  │ 3 actifs            │ │ RBAC               │ │ 12 actions/24h      │    │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘    │
│                                                                              │
│  ── 🗄️ MOTEUR DE VEILLE ─────────────────────────────────────────────────── │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐│
│  │ 🏷️ Mots-clés   │ │ 📡 Sources     │ │ 🔔 Alertes     │ │ 📁 Import      ││
│  │ 112 actifs     │ │ 8 actives      │ │ 2 non lues     │ │ Acteurs IA     ││
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘│
│                                                                              │
│  ── 📧 COMMUNICATION ────────────────────────────────────────────────────── │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                   │
│  │ 📧 Newsletters │ │ 🎓 Formation   │ │ 📊 Présentation││                   │
│  │ 1 en attente   │ │ 2 guides       │ │ 11 slides      ││                   │
│  └────────────────┘ └────────────────┘ └────────────────┘                   │
│                                                                              │
│  ── ⚙️ SUPERVISION TECHNIQUE ────────────────────────────────────────────── │
│  ┌─────────────────────┐                                                     │
│  │ ⏰ Tâches CRON       │                                                     │
│  │ Dernière: Il y a 5m │                                                     │
│  └─────────────────────┘                                                     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ANSUT RADAR v2.1.0 • Documentation Technique                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Sections réorganisées

| Section | Éléments | Couleur dominante |
|---------|----------|-------------------|
| **Organisation** | Utilisateurs, Rôles, Audit | Bleu/Violet |
| **Moteur de Veille** | Mots-clés, Sources, Alertes, Import Acteurs | Orange/Emerald |
| **Communication** | Newsletters, Formation, Présentation | Bleu/Emerald |
| **Supervision** | Tâches CRON | Gris/Muted |

## Avantages de la nouvelle approche

| Aspect | Avant | Après |
|--------|-------|-------|
| **Vue d'ensemble** | Aucune | Widget santé système en temps réel |
| **Organisation** | 2 sections floues | 4 sections logiques métier |
| **Navigation** | Cartes centrées | Cartes horizontales avec description |
| **Métriques** | Badges isolés | Indicateurs contextuels |
| **Cohérence** | Variable | Couleurs sémantiques par domaine |

## Résultat attendu

1. **Vision immédiate** de l'état du système en haut de page
2. **Organisation logique** séparant humain (Organisation) de machine (Veille)
3. **Navigation claire** avec descriptions et badges informatifs
4. **Cohérence visuelle** avec les pages utilisateurs et rôles redesignées
5. **Footer technique** discret avec version et documentation

