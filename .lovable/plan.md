
# Génération d'un PDF de Documentation Technique ANSUT RADAR

## Objectif

Créer une nouvelle page accessible depuis l'administration permettant de générer et télécharger un **PDF de documentation technique complet** résumant l'ensemble des fonctionnalités de la plateforme.

## Approche

Réutiliser l'infrastructure existante :
- Composant `GuidePDFLayout` pour le branding ANSUT
- Librairie `react-to-pdf` déjà installée
- Composant `GuideViewer` pour le rendu Markdown stylisé

## Structure du Document PDF

Le PDF sera organisé en **6 sections** couvrant l'intégralité de la plateforme :

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    ANSUT RADAR - Documentation Technique             │
│                              Version 2.1.0                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. PRÉSENTATION GÉNÉRALE                                            │
│     - Contexte et objectifs                                          │
│     - Les 7 modules métier                                           │
│     - Profils utilisateurs (4 rôles)                                 │
│                                                                      │
│  2. ARCHITECTURE TECHNIQUE                                           │
│     - Stack Frontend (React, TypeScript, Tailwind)                   │
│     - Stack Backend (Lovable Cloud / PostgreSQL)                     │
│     - Intégrations externes (Perplexity, Grok, Resend)               │
│                                                                      │
│  3. BASE DE DONNÉES                                                  │
│     - Schéma des 17 tables principales                               │
│     - Système de rôles (app_role enum)                               │
│     - Row Level Security (RLS)                                       │
│                                                                      │
│  4. EDGE FUNCTIONS                                                   │
│     - Liste des 17 fonctions serverless                              │
│     - Endpoints et paramètres                                        │
│     - Secrets requis                                                 │
│                                                                      │
│  5. SYSTÈME DE PERMISSIONS                                           │
│     - 17 permissions granulaires                                     │
│     - Matrice rôle/permission                                        │
│     - Architecture RBAC                                              │
│                                                                      │
│  6. SÉCURITÉ & CONFORMITÉ                                            │
│     - Authentification JWT                                           │
│     - Politiques RLS                                                 │
│     - Audit et traçabilité                                           │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  © 2026 ANSUT • Document confidentiel • Usage interne uniquement     │
└──────────────────────────────────────────────────────────────────────┘
```

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/pages/admin/TechDocPage.tsx` | Page de génération du PDF technique |
| `src/components/documentation/TechDocContent.tsx` | Contenu Markdown structuré du document |
| `src/components/documentation/TechDocPDFLayout.tsx` | Layout multi-pages optimisé pour impression |

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/App.tsx` | Ajouter la route `/admin/documentation` |
| `src/pages/AdminPage.tsx` | Ajouter le lien dans la section Communication |

## Détails des composants

### 1. TechDocPage.tsx

Page principale avec :
- Prévisualisation du document
- Bouton de téléchargement PDF
- Table des matières interactive

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ← Retour    Documentation Technique                                │
│              Générez le manuel technique de la plateforme           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [📥 Télécharger le PDF]                                            │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │   ANSUT RADAR                                                 │ │
│  │   Documentation Technique                                     │ │
│  │                                                               │ │
│  │   Table des matières                                          │ │
│  │   1. Présentation Générale ..................... 2            │ │
│  │   2. Architecture Technique .................... 4            │ │
│  │   3. Base de Données ........................... 6            │ │
│  │   4. Edge Functions ............................ 8            │ │
│  │   5. Système de Permissions .................... 10           │ │
│  │   6. Sécurité & Conformité ..................... 12           │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. TechDocContent.tsx

Contenu Markdown complet basé sur la documentation existante :

```typescript
export const TECH_DOC_CONTENT = `
# Documentation Technique ANSUT RADAR

## 1. Présentation Générale

### Contexte
ANSUT RADAR est une plateforme de veille stratégique...

### Les 7 Modules
| Module | Description |
|--------|-------------|
| Tableau de bord | Vue d'ensemble et KPIs |
| Actualités | Fil enrichi par IA |
| ...

## 2. Architecture Technique

### Stack Frontend
- React 18.3 + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (cache)
- React Router (routing)

### Stack Backend (Lovable Cloud)
- PostgreSQL (17 tables)
- Edge Functions (17 fonctions)
- Auth (4 rôles)
- Storage (avatars)

...
`;
```

### 3. TechDocPDFLayout.tsx

Layout optimisé pour l'impression A4 :

```typescript
export const TechDocPDFLayout = forwardRef<HTMLDivElement, Props>(
  ({ children }, ref) => {
    return (
      <div 
        ref={ref}
        className="bg-white text-black"
        style={{ 
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 20mm',
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        {/* Header avec logo ANSUT */}
        <header>...</header>
        
        {/* Contenu paginé */}
        <main>{children}</main>
        
        {/* Footer avec numéro de page */}
        <footer>...</footer>
      </div>
    );
  }
);
```

## Contenu détaillé du PDF

### Section 1 : Présentation Générale
- Contexte ANSUT et enjeux
- Objectifs de la plateforme (5 objectifs)
- Les 7 modules métier avec description
- Les 4 profils utilisateurs (admin, user, council_user, guest)

### Section 2 : Architecture Technique
- Diagramme d'architecture (ASCII art)
- Stack Frontend détaillé
- Stack Backend (Lovable Cloud)
- APIs externes (Perplexity, Grok, Resend)
- Patterns de développement

### Section 3 : Base de Données
- Liste des 17 tables avec colonnes principales
- Enum `app_role` et ses valeurs
- Fonctions utilitaires (`has_role`, `get_user_role`)
- Politiques RLS standards

### Section 4 : Edge Functions
- Tableau des 17 fonctions avec endpoints
- Paramètres et réponses types
- Secrets requis
- Planification CRON

### Section 5 : Système de Permissions
- 17 permissions granulaires (codes et descriptions)
- Matrice rôle/permission par défaut
- Fonctionnement RBAC
- Gestion via interface admin

### Section 6 : Sécurité & Conformité
- Authentification JWT
- Politiques RLS actives
- Audit logs et traçabilité
- Protection des routes

## Navigation vers la page

Depuis la page Admin :
- Section "Communication" → nouvelle carte "Documentation Technique"
- Route : `/admin/documentation`
- Icône : `FileCode` (Lucide)
- Badge : "PDF"

## Résultat attendu

1. **Document PDF professionnel** avec branding ANSUT complet
2. **Contenu exhaustif** couvrant toute la plateforme
3. **Format imprimable** A4 optimisé
4. **Prévisualisation interactive** avant téléchargement
5. **Génération instantanée** via react-to-pdf
6. **Accessible aux admins** depuis le cockpit d'administration
