

# Renommer le menu "Tableau de bord" → "Centre de Veille"

## Contexte

Avec la transformation de la page en flux de Competitive Intelligence, le nom "Tableau de bord" (qui évoque un dashboard BI avec des KPIs) n'est plus cohérent avec le contenu de la page.

## Modification proposée

| Élément | Avant | Après |
|---------|-------|-------|
| **Titre** | Tableau de bord | Centre de Veille |
| **Icône** | `LayoutDashboard` | `Radar` |
| **Description** | Vue exécutive | Flux d'intelligence |

## Fichier à modifier

`src/components/layout/AppSidebar.tsx`

## Changement de code

```typescript
// Ligne 36-43
{ 
  title: 'Centre de Veille',  // Avant: 'Tableau de bord'
  url: '/radar', 
  icon: Radar,               // Avant: LayoutDashboard
  description: 'Flux d\'intelligence',  // Avant: 'Vue exécutive'
  permission: 'view_radar'
},
```

## Alternatives de nommage

| Option | Avantage |
|--------|----------|
| **Centre de Veille** | Évoque la mission de surveillance stratégique |
| Radar Stratégique | Cohérent avec l'URL `/radar` |
| Fil d'Intelligence | Très explicite sur le format "flux" |
| Briefing | Court et militaire, évoque l'urgence |

Je recommande **"Centre de Veille"** car c'est le terme métier le plus approprié pour un outil de Competitive Intelligence.

