# Guide de Contribution

## Workflow Git

### Branches

| Branche | Usage |
|---------|-------|
| `main` | Production stable |
| `develop` | Développement intégration |
| `feature/*` | Nouvelles fonctionnalités |
| `fix/*` | Corrections de bugs |
| `hotfix/*` | Corrections urgentes production |

### Commits Conventionnels

Format : `type(scope): description`

```bash
# Types autorisés
feat(radar): ajouter filtre par période
fix(auth): corriger redirection après login
docs(api): documenter endpoint invite-user
style(ui): améliorer espacement cards
refactor(hooks): extraire logique commune
perf(query): optimiser requête personnalités
test(auth): ajouter tests unitaires
chore(deps): mettre à jour dépendances
```

### Exemple de Workflow

```bash
# Créer une branche feature
git checkout -b feature/nouvelle-fonctionnalite

# Développer et commiter
git add .
git commit -m "feat(module): description courte"

# Pousser et créer une PR
git push origin feature/nouvelle-fonctionnalite
```

## Conventions de Code

### TypeScript

```typescript
// ✅ Bon - Types explicites
interface PersonnaliteProps {
  id: string;
  nom: string;
  prenom?: string;
}

// ❌ Mauvais - any
const data: any = fetchData();

// ✅ Bon - Utiliser les types générés
import type { Tables } from '@/integrations/supabase/types';
type Personnalite = Tables<'personnalites'>;
```

### Composants React

```tsx
// ✅ Bon - Composant fonctionnel avec types
interface ActeurCardProps {
  acteur: Personnalite;
  onSelect?: (id: string) => void;
}

export function ActeurCard({ acteur, onSelect }: ActeurCardProps) {
  return (
    <Card onClick={() => onSelect?.(acteur.id)}>
      <CardHeader>
        <CardTitle>{acteur.nom}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// ❌ Mauvais - Props non typées
export function ActeurCard(props) {
  return <div>{props.nom}</div>;
}
```

### Hooks

```typescript
// ✅ Bon - Hook avec types de retour explicites
export function usePersonnalites() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['personnalites'],
    queryFn: async (): Promise<Personnalite[]> => {
      const { data, error } = await supabase
        .from('personnalites')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  return { personnalites: data ?? [], isLoading, error };
}
```

### Styling avec Tailwind

```tsx
// ✅ Bon - Utiliser les tokens sémantiques
<div className="bg-background text-foreground border-border">
  <Button variant="default">Action</Button>
</div>

// ❌ Mauvais - Couleurs hardcodées
<div className="bg-white text-black border-gray-200">
  <button className="bg-blue-500">Action</button>
</div>

// ✅ Bon - Classes organisées
<div className={cn(
  "flex items-center gap-4",
  "p-4 rounded-lg",
  "bg-card border shadow-sm",
  isActive && "ring-2 ring-primary"
)}>
```

## Structure des Fichiers

### Nouveau Composant

```
src/components/module/
├── NouveauComposant.tsx      # Composant principal
├── NouveauComposant.test.tsx # Tests (optionnel)
└── index.ts                   # Export barrel
```

```typescript
// index.ts
export { NouveauComposant } from './NouveauComposant';
```

### Nouvelle Page

```typescript
// src/pages/NouvellePage.tsx
import { AppLayout } from '@/components/layout/AppLayout';

export default function NouvellePage() {
  return (
    <AppLayout>
      <div className="container py-6">
        <h1 className="text-2xl font-bold">Titre</h1>
        {/* Contenu */}
      </div>
    </AppLayout>
  );
}
```

```typescript
// Ajouter la route dans App.tsx
<Route path="/nouvelle-page" element={
  <ProtectedRoute>
    <NouvellePage />
  </ProtectedRoute>
} />
```

### Nouveau Hook

```typescript
// src/hooks/useNouveauHook.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNouveauHook() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['nouveau-hook'],
    queryFn: async () => {
      // Logique de fetch
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: PayloadType) => {
      // Logique de mutation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nouveau-hook'] });
    },
  });

  return {
    data,
    isLoading,
    mutate: mutation.mutate,
  };
}
```

## Edge Functions

### Structure

```typescript
// supabase/functions/nom-fonction/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  // Types du payload
}

serve(async (req) => {
  // Gérer CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Logique métier
    const body: RequestBody = await req.json();
    
    // Retourner la réponse
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

## Checklist PR

- [ ] Code TypeScript sans erreurs (`npm run build`)
- [ ] ESLint sans warnings (`npm run lint`)
- [ ] Tests passent (si applicable)
- [ ] Documentation mise à jour
- [ ] Commits conventionnels
- [ ] Pas de `console.log` en production
- [ ] Types explicites (pas de `any`)
- [ ] RLS policies si nouvelles tables
- [ ] Gestion des erreurs appropriée

## Ressources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)

---

Voir aussi : [Architecture](./ARCHITECTURE.md) | [API](./API.md)
