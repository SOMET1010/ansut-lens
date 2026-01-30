

# Intégration IA pour le Briefing du Jour

## Objectif

Remplacer la génération statique du briefing (concaténation de titres) par un appel à l'IA Lovable qui analysera les actualités récentes et produira un résumé stratégique en langage naturel.

---

## Architecture de la solution

```text
┌─────────────────────────────────────────────────────────────────┐
│  📍 BRIEFING DU JOUR (Généré par IA)                           │
│                                                                  │
│  "Ce matin, l'attention se porte sur la connectivité rurale    │
│   avec le lancement d'Orange SAT. Sur le plan politique,       │
│   le nouveau ministre du Numérique prône l'accessibilité.      │
│   ⚠️ Attention : une alerte cybersécurité est en cours."       │
│                                                                  │
│   [ 🔄 Régénérer ]                              Généré il y a 2h│
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 : Nouvelle Edge Function dédiée

**Fichier : `supabase/functions/generer-briefing/index.ts`**

Fonction non-streaming qui génère un briefing court (3-4 phrases max).

**Logique :**
1. Récupérer les 5 dernières actualités depuis Supabase
2. Récupérer les signaux critiques actifs
3. Construire un prompt spécifique pour le briefing
4. Appeler Lovable AI avec `stream: false`
5. Retourner le texte généré en JSON

**Prompt système optimisé :**
```text
Tu es l'assistant stratégique de l'ANSUT. Génère un briefing exécutif 
de 3-4 phrases maximum résumant la situation du jour.

Règles :
- Commence par "Ce matin" ou "Aujourd'hui"
- Identifie les 2-3 sujets prioritaires
- Mentionne les alertes critiques si présentes
- Utilise un ton professionnel et direct
- Maximum 150 mots

Format attendu : texte brut, pas de liste à puces.
```

**Structure de la réponse :**
```json
{
  "briefing": "Ce matin, l'attention se porte sur...",
  "generated_at": "2024-01-30T10:00:00Z",
  "sources_count": 5
}
```

---

## Phase 2 : Hook React pour le briefing

**Fichier : `src/hooks/useDailyBriefing.ts`**

Hook personnalisé pour gérer l'état du briefing IA.

**Fonctionnalités :**
- Appel initial au chargement de la page
- Cache local (localStorage) avec TTL de 2 heures
- Mutation pour régénérer manuellement
- Gestion des états : loading, error, data

**Logique de cache :**
```typescript
const CACHE_KEY = 'daily-briefing';
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 heures

interface CachedBriefing {
  briefing: string;
  generated_at: string;
  expires_at: number;
}
```

**API du hook :**
```typescript
interface UseDailyBriefingReturn {
  briefing: string | null;
  generatedAt: Date | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  regenerate: () => Promise<void>;
}
```

---

## Phase 3 : Modification du composant DailyBriefing

**Fichier : `src/components/radar/DailyBriefing.tsx`**

Mise à jour pour utiliser le hook et afficher le briefing IA.

**Nouveaux éléments UI :**
- Texte du briefing IA (ou fallback si erreur)
- Bouton "Régénérer" (icône RefreshCw)
- Indicateur "Généré il y a X"
- État de chargement animé (skeleton + shimmer)
- Message d'erreur discret si échec

**États visuels :**
| État | Affichage |
|------|-----------|
| Loading initial | Skeleton avec effet shimmer |
| Briefing prêt | Texte + timestamp + bouton refresh |
| Génération en cours | Texte + spinner sur le bouton |
| Erreur | Fallback statique + toast d'erreur |

---

## Phase 4 : Configuration Supabase

**Fichier : `supabase/config.toml`**

Ajouter la configuration de la nouvelle edge function.

```toml
[functions.generer-briefing]
verify_jwt = false
```

---

## Détails techniques

### Edge Function - Code simplifié

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const BRIEFING_PROMPT = `Tu es l'assistant stratégique de l'ANSUT.
Génère un briefing exécutif de 3-4 phrases résumant la situation du jour.

Règles :
- Commence par "Ce matin" ou "Aujourd'hui"
- Identifie les 2-3 sujets prioritaires
- Mentionne les alertes critiques si présentes
- Ton professionnel et direct
- Maximum 150 mots
- Texte brut, pas de liste`;

serve(async (req) => {
  // 1. Récupérer les actualités récentes
  const supabase = createClient(...);
  const { data: actualites } = await supabase
    .from('actualites')
    .select('titre, resume, importance')
    .order('date_publication', { ascending: false })
    .limit(5);

  const { data: signaux } = await supabase
    .from('signaux')
    .select('titre, niveau')
    .eq('actif', true)
    .eq('niveau', 'critical');

  // 2. Construire le contexte
  const context = `Actualités du jour:\n${actualites.map(a => 
    `- ${a.titre} (importance: ${a.importance}/100)`
  ).join('\n')}\n\nAlertes critiques: ${signaux.length}`;

  // 3. Appeler Lovable AI (non-streaming)
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: BRIEFING_PROMPT },
        { role: 'user', content: context }
      ],
      stream: false
    }),
  });

  const data = await response.json();
  const briefing = data.choices[0].message.content;

  return new Response(JSON.stringify({
    briefing,
    generated_at: new Date().toISOString(),
    sources_count: actualites.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

### Hook React - Structure

```typescript
export function useDailyBriefing(actualites: Actualite[], signaux: Signal[]) {
  const [state, setState] = useState<BriefingState>({
    briefing: null,
    generatedAt: null,
    isLoading: true,
    isGenerating: false,
    error: null
  });

  // Vérifier le cache au montage
  useEffect(() => {
    const cached = getCachedBriefing();
    if (cached && !isExpired(cached)) {
      setState({ ...state, briefing: cached.briefing, isLoading: false });
      return;
    }
    generateBriefing();
  }, []);

  const generateBriefing = async () => {
    setState(prev => ({ ...prev, isGenerating: true }));
    try {
      const { data, error } = await supabase.functions.invoke('generer-briefing');
      if (error) throw error;
      
      setCachedBriefing(data);
      setState({
        briefing: data.briefing,
        generatedAt: new Date(data.generated_at),
        isLoading: false,
        isGenerating: false,
        error: null
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isGenerating: false,
        error: 'Erreur lors de la génération'
      }));
    }
  };

  return { ...state, regenerate: generateBriefing };
}
```

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `supabase/functions/generer-briefing/index.ts` | Edge function de génération |
| `src/hooks/useDailyBriefing.ts` | Hook de gestion du briefing |

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `supabase/config.toml` | Ajouter `[functions.generer-briefing]` |
| `src/components/radar/DailyBriefing.tsx` | Intégrer le hook et les nouveaux états UI |
| `src/pages/RadarPage.tsx` | Passer les props au composant |

---

## Gestion des erreurs et fallback

| Scénario | Comportement |
|----------|--------------|
| Pas de LOVABLE_API_KEY | Retourne erreur 500, affiche fallback statique |
| Rate limit (429) | Toast d'erreur, conserve le cache existant |
| Crédits épuisés (402) | Toast d'erreur, affiche fallback statique |
| Timeout réseau | Affiche fallback statique après 10s |
| Pas d'actualités | Génère un briefing "calme" (aucun sujet majeur) |

---

## UX améliorée

### État de chargement
- Skeleton avec effet de shimmer
- 3 lignes de hauteur variable
- Animation fluide

### Briefing affiché
- Texte en prose naturelle
- Timestamp "Généré il y a X min/h"
- Bouton refresh discret (icône seule)
- Alerte critique en rouge si présente

### Régénération
- Spinner sur le bouton
- Toast de confirmation
- Mise à jour du cache

