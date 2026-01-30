
# Animation de Transition Fluide pour la Table des Matières

## Objectif

Améliorer les animations de transition lors du changement de section active dans la table des matières pour un rendu plus fluide et professionnel.

## Analyse de l'existant

### Classes actuelles
- `transition-all` sur le bouton (ligne 131)
- `transition-colors` sur le numéro et le label (lignes 138, 146)
- Pas de durée explicite (utilise le défaut Tailwind de 150ms)
- Pas d'easing personnalisé

### Limitations
- Transitions trop rapides (150ms par défaut)
- Pas d'animation de scale pour le numéro actif
- Pas d'effet de "glow" animé sur le ring

## Solution

### 1. Durées et easing personnalisés

Remplacer les transitions génériques par des durées explicites :

| Propriété | Avant | Après |
|-----------|-------|-------|
| Durée | 150ms (défaut) | 300ms |
| Easing | ease (défaut) | ease-out / cubic-bezier |
| Propriétés | all/colors | Ciblées (bg, ring, transform) |

### 2. Animation de scale sur le numéro actif

Ajouter un effet de scale subtil quand le numéro devient actif :

```typescript
// État actif
"bg-primary text-primary-foreground scale-110"

// État normal
"bg-primary/10 text-primary scale-100"
```

### 3. Animation du ring avec glow

Ajouter un effet de glow animé sur l'élément actif :

```typescript
activeSection === item.id
  ? "bg-primary/20 ring-2 ring-primary/50 shadow-glow"
  : "hover:bg-primary/10"
```

### 4. Classes de transition améliorées

```typescript
// Bouton principal
"transition-all duration-300 ease-out"

// Numéro
"transition-all duration-300 ease-out"

// Label
"transition-all duration-200 ease-out"
```

## Fichier à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/admin/TechDocPage.tsx` | Améliorer les classes de transition |

## Détails des modifications

### Bouton TOC (lignes 127-152)

```typescript
<button
  key={item.id}
  onClick={() => scrollToSection(item.id)}
  className={cn(
    "flex items-center gap-2 p-2 rounded-lg cursor-pointer text-left group",
    "transition-all duration-300 ease-out",
    activeSection === item.id
      ? "bg-primary/20 ring-2 ring-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
      : "hover:bg-primary/10 ring-0 ring-transparent shadow-none"
  )}
>
```

### Numéro avec scale (lignes 137-144)

```typescript
<span className={cn(
  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
  "transition-all duration-300 ease-out",
  activeSection === item.id
    ? "bg-primary text-primary-foreground scale-110 shadow-md"
    : "bg-primary/10 text-primary scale-100 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105"
)}>
```

### Label avec effet (lignes 145-150)

```typescript
<span className={cn(
  "transition-all duration-200 ease-out",
  activeSection === item.id 
    ? "text-primary font-semibold translate-x-0.5" 
    : "text-foreground group-hover:text-primary"
)}>
```

## Rendu visuel des transitions

```text
Transition d'activation (300ms ease-out) :
┌────────────────────────────────────────────────────────────────┐
│  t=0ms        t=100ms       t=200ms       t=300ms             │
│  ┌─────┐      ┌─────┐       ┌─────┐       ┌─────┐             │
│  │ (3) │  →   │ (3) │   →   │ [3] │   →   │ [3] │  ← Actif   │
│  │     │      │░░░░░│       │▓▓▓▓▓│       │█████│             │
│  └─────┘      └─────┘       └─────┘       └─────┘             │
│                                                                │
│  Effets progressifs :                                          │
│  - Background : transparent → primary/20                       │
│  - Ring : 0 → 2px primary/50                                   │
│  - Numéro : scale(1) → scale(1.1)                              │
│  - Shadow : none → glow effect                                 │
│  - Label : normal → semibold + translate                       │
└────────────────────────────────────────────────────────────────┘
```

## Timeline des animations

| Élément | Durée | Easing | Propriétés animées |
|---------|-------|--------|-------------------|
| Bouton | 300ms | ease-out | background, ring, shadow |
| Numéro | 300ms | ease-out | background, color, scale, shadow |
| Label | 200ms | ease-out | color, font-weight, transform |

## Résultat attendu

1. **Transitions fluides** : Durée de 300ms pour un effet visuel agréable
2. **Effet de scale** : Le numéro grossit légèrement quand actif
3. **Glow effect** : Halo lumineux subtil autour de l'élément actif
4. **Micro-interaction** : Le label se décale légèrement vers la droite
5. **Cohérence** : Tous les éléments s'animent de manière synchronisée
6. **Performance** : Utilisation de `transform` et `opacity` (GPU-accelerated)
