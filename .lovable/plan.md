
# Saisie manuelle de posts sociaux

## Objectif

Permettre aux utilisateurs de coller manuellement des posts ou articles intéressants (trouvés sur LinkedIn, Twitter, sites web, etc.) directement dans le système de veille, sans dépendre uniquement de la collecte automatique.

## Changements prevus

### 1. Migration base de donnees

Ajouter une politique RLS permettant aux utilisateurs authentifiés d'insérer des insights manuels (actuellement seul le service_role peut insérer).

Ajouter une colonne `is_manual_entry` pour distinguer les entrées manuelles des entrées automatiques.

### 2. Nouveau hook `useCreateSocialInsight`

Étendre le fichier `src/hooks/useSocialInsights.ts` avec une mutation permettant de créer un insight manuellement.

### 3. Nouveau composant `SocialInsightFormDialog`

Créer un formulaire modal avec les champs suivants :
- Plateforme (obligatoire) : sélection parmi LinkedIn, Twitter, Facebook, Blog, Forum, News
- Contenu (obligatoire) : textarea pour coller le texte du post
- URL source (optionnel) : lien vers le post original
- Auteur (optionnel) : nom de l'auteur du post
- Marquer comme critique (checkbox) : pour signaler un contenu prioritaire
- Hashtags (optionnel) : tags séparés par des espaces

### 4. Mise a jour du widget SocialPulseWidget

Ajouter un bouton "Ajouter" à côté du bouton "Actualiser" dans l'en-tête du widget Veille Web.

### 5. Indicateur visuel pour les entrées manuelles

Distinguer visuellement les insights saisis manuellement des insights collectés automatiquement avec un badge "Manuel".

---

## Section technique

### Migration SQL

```sql
-- Permettre aux utilisateurs authentifiés d'insérer des insights manuels
CREATE POLICY "Authenticated users can insert manual insights"
  ON social_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ajouter une colonne pour identifier les entrées manuelles
ALTER TABLE social_insights
  ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT false;
```

### Schema de validation Zod

```typescript
const socialInsightSchema = z.object({
  plateforme: z.enum(['linkedin', 'twitter', 'facebook', 'blog', 'forum', 'news']),
  contenu: z.string()
    .min(10, "Le contenu doit faire au moins 10 caractères")
    .max(2000, "Maximum 2000 caractères"),
  url_original: z.string().url("URL invalide").optional().or(z.literal('')),
  auteur: z.string().max(100, "Maximum 100 caractères").optional().or(z.literal('')),
  est_critique: z.boolean().default(false),
  hashtags: z.string().optional(),
});
```

### Hook de creation

```typescript
export function useCreateSocialInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      plateforme: WebPlateforme;
      contenu: string;
      url_original?: string;
      auteur?: string;
      est_critique?: boolean;
      hashtags?: string[];
    }) => {
      const { error } = await supabase
        .from('social_insights')
        .insert({
          ...data,
          type_contenu: 'post',
          engagement_score: 0,
          is_manual_entry: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-insights'] });
      queryClient.invalidateQueries({ queryKey: ['social-stats'] });
      toast.success('Post ajouté', {
        description: 'L\'insight a été enregistré dans la veille',
      });
    },
  });
}
```

### Structure du composant SocialInsightFormDialog

```text
+----------------------------------------------+
|  Ajouter un insight social                   |
+----------------------------------------------+
|  Plateforme *         [Dropdown]             |
|                                              |
|  Contenu du post *                           |
|  [                                    ]      |
|  [          Textarea                  ]      |
|  [                                    ]      |
|                                              |
|  URL source           [_______________]      |
|  Auteur               [_______________]      |
|  Hashtags             [_______________]      |
|                                              |
|  [ ] Marquer comme critique                  |
|                                              |
|            [Annuler]  [Ajouter]              |
+----------------------------------------------+
```

### Fichiers a creer ou modifier

| Fichier | Action |
|---------|--------|
| `src/hooks/useSocialInsights.ts` | Ajouter `useCreateSocialInsight` |
| `src/components/radar/SocialInsightFormDialog.tsx` | Nouveau composant |
| `src/components/radar/SocialPulseWidget.tsx` | Ajouter bouton et intégrer le dialog |
| `src/components/radar/index.ts` | Exporter le nouveau composant |

### Modification du widget (extrait)

```typescript
// Dans SocialPulseWidget.tsx
import { SocialInsightFormDialog } from './SocialInsightFormDialog';

// État pour le dialog
const [formOpen, setFormOpen] = useState(false);

// Dans le header, à côté du bouton Actualiser
<Button
  variant="outline"
  size="sm"
  onClick={() => setFormOpen(true)}
  className="gap-2"
>
  <Plus className="h-4 w-4" />
  Ajouter
</Button>

// En fin de composant
<SocialInsightFormDialog 
  open={formOpen} 
  onOpenChange={setFormOpen} 
/>
```

### Badge pour les entrées manuelles

```typescript
// Dans InsightCard
{insight.is_manual_entry && (
  <Badge variant="secondary" className="text-xs px-1.5 py-0">
    <PenLine className="h-3 w-3 mr-1" />
    Manuel
  </Badge>
)}
```

## Livrables

1. Migration SQL pour la politique RLS et la nouvelle colonne
2. Hook `useCreateSocialInsight` dans useSocialInsights.ts
3. Composant `SocialInsightFormDialog` avec validation Zod
4. Widget mis à jour avec bouton d'ajout et badge "Manuel"
5. Export du nouveau composant dans l'index
