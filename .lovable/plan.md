

## Objectif

Chaque information du rapport journalier (Matinale) doit être sourcée avec un lien cliquable. Actuellement, les **Flash Info** n'ont que le nom de la source sans URL. Il faut ajouter les liens sources partout.

## Modifications

### 1. Edge Function `supabase/functions/generer-matinale/index.ts`

- Ajouter `source_url` au schéma du tool call pour chaque item de `flash_info` (URL de l'article source)
- Mettre à jour le prompt pour exiger une URL réelle pour chaque flash info
- Ajouter les URLs dans le template HTML email des Flash Info (lien "Lire →")

### 2. Hook `src/hooks/useMatinale.ts`

- Ajouter `source_url?: string` au type `MatinaleFlashItem`

### 3. Page `src/pages/CommunicationPage.tsx`

- Afficher un lien cliquable (icône ExternalLink) sur chaque carte Flash Info quand `source_url` est disponible

Résultat : chaque élément du rapport quotidien — Flash Info ET Veille Réputation — sera accompagné d'un lien vérifiable vers la source originale.

