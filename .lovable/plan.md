

# Ajout d'une Table des Matières Cliquable avec Ancres

## Objectif

Transformer la table des matières statique en navigation interactive avec scroll fluide vers les sections correspondantes dans la prévisualisation du document technique.

## Analyse de l'existant

### Structure actuelle
- **TechDocPage.tsx** : Table des matières visuelle dans une Card (lignes 69-100)
- **GuideViewer.tsx** : Rendu Markdown sans ancres sur les titres
- **TechDocContent.tsx** : Contenu avec 6 sections principales

### Problème
Les titres `h1` et `h2` n'ont pas d'attribut `id`, empêchant toute navigation par ancre.

## Solution

### 1. Modifier GuideViewer pour générer des IDs automatiques

Ajouter une fonction de slugification et des IDs aux titres :

```typescript
// Fonction de slugification
const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
    .replace(/[^a-z0-9]+/g, '-')     // Remplacer espaces/spéciaux par -
    .replace(/^-+|-+$/g, '');        // Supprimer - en début/fin
};

// Composants h1/h2 avec IDs
h1: ({ children }) => {
  const id = slugify(String(children));
  return (
    <h1 id={id} className="...">
      {children}
    </h1>
  );
}
```

### 2. Modifier TechDocPage pour la navigation

Remplacer les `div` statiques par des boutons cliquables avec scroll smooth :

```typescript
const TOC_ITEMS = [
  { id: '1-presentation-generale', label: 'Présentation', num: 1 },
  { id: '2-architecture-technique', label: 'Architecture', num: 2 },
  { id: '3-base-de-donnees', label: 'Base de données', num: 3 },
  { id: '4-edge-functions', label: 'Edge Functions', num: 4 },
  { id: '5-systeme-de-permissions', label: 'Permissions', num: 5 },
  { id: '6-securite-conformite', label: 'Sécurité', num: 6 },
];

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
```

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/formation/GuideViewer.tsx` | Ajouter IDs automatiques aux h1/h2/h3 |
| `src/pages/admin/TechDocPage.tsx` | Rendre la table des matières cliquable |

## Détails des modifications

### GuideViewer.tsx

Ajouter la fonction `slugify` et modifier les composants de titre :

```text
Avant:
h1: ({ children }) => (
  <h1 className="text-2xl font-bold...">
    {children}
  </h1>
)

Après:
h1: ({ children }) => {
  const id = slugify(String(children));
  return (
    <h1 id={id} className="text-2xl font-bold... scroll-mt-4">
      {children}
    </h1>
  );
}
```

Le `scroll-mt-4` ajoute une marge de scroll pour éviter que le titre soit masqué sous le header.

### TechDocPage.tsx

Transformer la Card de table des matières :

```text
Structure visuelle finale :
┌─────────────────────────────────────────────────────────────────────┐
│  TABLE DES MATIÈRES                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  [1] Présentation   [2] Architecture   [3] Base de données         │
│  [4] Edge Functions [5] Permissions    [6] Sécurité                │
│                                                                     │
│  Chaque élément est cliquable avec hover effect                    │
└─────────────────────────────────────────────────────────────────────┘
```

Comportement :
- Clic sur un élément → scroll fluide vers la section
- Hover → effet visuel (fond légèrement coloré)
- Cursor pointer pour indiquer l'interactivité

## Détails techniques

### Génération des IDs

Le contenu Markdown utilise des titres comme :
- `# 1. Présentation Générale` → `id="1-presentation-generale"`
- `# 2. Architecture Technique` → `id="2-architecture-technique"`

### Mapping TOC

```typescript
const TOC_ITEMS = [
  { id: '1-presentation-generale', label: 'Présentation', num: 1 },
  { id: '2-architecture-technique', label: 'Architecture', num: 2 },
  { id: '3-base-de-donnees', label: 'Base de données', num: 3 },
  { id: '4-edge-functions', label: 'Edge Functions', num: 4 },
  { id: '5-systeme-de-permissions', label: 'Permissions', num: 5 },
  { id: '6-securite-conformite', label: 'Sécurité', num: 6 },
];
```

### Fonction de scroll

```typescript
const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }
};
```

## Résultat attendu

1. **Titres avec ancres** : Tous les h1/h2/h3 ont un ID unique basé sur leur contenu
2. **Navigation fluide** : Clic sur un élément TOC scroll vers la section correspondante
3. **Feedback visuel** : Hover effect sur les éléments cliquables
4. **Compatibilité** : Fonctionne aussi pour les autres usages de GuideViewer (Formation)
5. **Accessibilité** : Éléments focusables au clavier

