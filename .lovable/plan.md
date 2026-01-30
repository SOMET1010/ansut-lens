

# Ajout d'un Indicateur Visuel de Section Active

## Objectif

Ajouter un indicateur visuel dynamique dans la table des matières qui met en évidence la section actuellement visible lors du scroll dans la prévisualisation du document.

## Analyse de l'existant

### Structure actuelle
- **Container de scroll** : `div` avec `className="max-h-[70vh] overflow-y-auto"` (ligne 114)
- **TOC** : Grille de boutons avec hover effects mais sans état actif
- **Sections** : Titres avec IDs générés par `GuideViewer` (ex: `1-presentation-generale`)

### Défi technique
Le scroll se fait dans un conteneur interne (`overflow-y-auto`), pas sur `window`. Il faut donc :
1. Obtenir une référence au conteneur scrollable
2. Écouter les événements de scroll sur ce conteneur
3. Calculer quelle section est visible en fonction du scroll

## Solution

### 1. Utiliser IntersectionObserver

L'API `IntersectionObserver` est idéale pour détecter quelle section est visible :

```typescript
useEffect(() => {
  const scrollContainer = scrollContainerRef.current;
  if (!scrollContainer) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    },
    {
      root: scrollContainer,
      rootMargin: '-20% 0px -70% 0px', // Zone de détection centrée en haut
      threshold: 0
    }
  );

  TOC_ITEMS.forEach((item) => {
    const element = document.getElementById(item.id);
    if (element) observer.observe(element);
  });

  return () => observer.disconnect();
}, []);
```

### 2. État actif dans le composant

```typescript
const [activeSection, setActiveSection] = useState<string>(TOC_ITEMS[0].id);
const scrollContainerRef = useRef<HTMLDivElement>(null);
```

### 3. Styling conditionnel du TOC

```typescript
<button
  className={cn(
    "flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer text-left group",
    activeSection === item.id
      ? "bg-primary/20 ring-2 ring-primary/50"
      : "hover:bg-primary/10"
  )}
>
  <span className={cn(
    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
    activeSection === item.id
      ? "bg-primary text-primary-foreground"
      : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
  )}>
    {item.num}
  </span>
  <span className={cn(
    "transition-colors",
    activeSection === item.id ? "text-primary font-medium" : "group-hover:text-primary"
  )}>
    {item.label}
  </span>
</button>
```

## Fichier à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/admin/TechDocPage.tsx` | Ajouter IntersectionObserver et styles actifs |

## Détails de l'implémentation

### Nouveaux imports

```typescript
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
```

### Nouveau state et ref

```typescript
const [activeSection, setActiveSection] = useState<string>(TOC_ITEMS[0].id);
const scrollContainerRef = useRef<HTMLDivElement>(null);
```

### Hook useEffect pour l'observer

```typescript
useEffect(() => {
  const scrollContainer = scrollContainerRef.current;
  if (!scrollContainer) return;

  const observer = new IntersectionObserver(
    (entries) => {
      // Trouver la section la plus visible
      const visibleEntries = entries.filter(e => e.isIntersecting);
      if (visibleEntries.length > 0) {
        // Prendre celle avec le ratio le plus élevé
        const mostVisible = visibleEntries.reduce((prev, curr) => 
          curr.intersectionRatio > prev.intersectionRatio ? curr : prev
        );
        setActiveSection(mostVisible.target.id);
      }
    },
    {
      root: scrollContainer,
      rootMargin: '-10% 0px -80% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1]
    }
  );

  TOC_ITEMS.forEach((item) => {
    const element = document.getElementById(item.id);
    if (element) observer.observe(element);
  });

  return () => observer.disconnect();
}, []);
```

### Container scrollable avec ref

```typescript
<div 
  ref={scrollContainerRef}
  className="max-h-[70vh] overflow-y-auto bg-gray-200 dark:bg-gray-900 p-4"
>
```

## Rendu visuel

```text
État normal :
┌─────────────────────────────────────────────────────────────────────┐
│  TABLE DES MATIÈRES                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  (1) Présentation   (2) Architecture   (3) Base de données         │
│  (4) Edge Functions (5) Permissions    (6) Sécurité                │
└─────────────────────────────────────────────────────────────────────┘

État avec section 3 active :
┌─────────────────────────────────────────────────────────────────────┐
│  TABLE DES MATIÈRES                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  (1) Présentation   (2) Architecture  ┌[3] Base de données┐        │
│  (4) Edge Functions (5) Permissions   │   Fond coloré     │        │
│                                       │   Ring visible    │        │
│                                       └───────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### Indicateurs visuels pour la section active

| Élément | État normal | État actif |
|---------|-------------|------------|
| **Fond** | Transparent | `bg-primary/20` |
| **Bordure** | Aucune | `ring-2 ring-primary/50` |
| **Numéro** | `bg-primary/10` | `bg-primary text-white` |
| **Label** | Couleur normale | `text-primary font-medium` |

## Résultat attendu

1. **Détection automatique** : La section visible est détectée lors du scroll
2. **Feedback visuel clair** : L'élément actif dans le TOC est mis en évidence
3. **Transition fluide** : Les changements d'état sont animés
4. **Performance** : IntersectionObserver est optimisé pour le scroll
5. **Synchronisation** : Clic sur TOC → scroll → mise à jour de l'indicateur

