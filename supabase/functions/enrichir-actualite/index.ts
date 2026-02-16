import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MotCleVeille {
  id: string;
  mot_cle: string;
  variantes: string[] | null;
  quadrant: string | null;
  score_criticite: number | null;
  alerte_auto: boolean | null;
  categories_veille?: {
    nom: string;
    code: string;
  } | { nom: string; code: string; }[] | null;
}

const getCategoryName = (cat: MotCleVeille['categories_veille']): string | undefined => {
  if (!cat) return undefined;
  if (Array.isArray(cat)) return cat[0]?.nom;
  return cat.nom;
};

interface EnrichmentResult {
  tags: string[];
  categorie: string;
  importance: number;
  quadrant_dominant: string;
  quadrant_distribution: Record<string, number>;
  alertes_declenchees: string[];
  analyse_summary: string;
}

const normalize = (str: string): string =>
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ---------- Batch Sentiment Analysis ----------

interface ArticleForSentiment {
  id: string;
  titre: string;
  resume: string | null;
}

async function analyzeSentimentBatch(
  articles: ArticleForSentiment[],
  apiKey: string
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  // Process in chunks of 20 to fit in context
  const chunkSize = 20;
  for (let i = 0; i < articles.length; i += chunkSize) {
    const chunk = articles.slice(i, i + chunkSize);

    const articleList = chunk.map((a, idx) =>
      `[${idx}] "${a.titre}"${a.resume ? ` — ${a.resume.slice(0, 150)}` : ''}`
    ).join('\n');

    const prompt = `Analyse le sentiment de chaque article ci-dessous. Attribue un score entre -1.0 (très négatif) et +1.0 (très positif). 0.0 = neutre.

Réponds UNIQUEMENT avec un JSON array de nombres, un par article, dans l'ordre. Exemple: [-0.3, 0.5, 0.0]

Articles:
${articleList}`;

    try {
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      });

      if (!resp.ok) {
        console.error(`[enrichir-actualite] AI API error: ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content ?? '';

      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) {
        const scores: number[] = JSON.parse(match[0]);
        for (let j = 0; j < Math.min(scores.length, chunk.length); j++) {
          const score = Math.max(-1, Math.min(1, Number(scores[j]) || 0));
          results.set(chunk[j].id, Math.round(score * 100) / 100);
        }
      }
    } catch (err) {
      console.error('[enrichir-actualite] Sentiment chunk error:', err);
    }
  }

  return results;
}

async function handleBatchSentiment(supabase: ReturnType<typeof createClient>, apiKey: string, limit: number) {
  // Fetch articles missing sentiment
  const { data: articles, error } = await supabase
    .from('actualites')
    .select('id, titre, resume')
    .is('sentiment', null)
    .order('date_publication', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!articles?.length) {
    return { success: true, message: 'Aucun article sans sentiment', processed: 0 };
  }

  console.log(`[enrichir-actualite] Batch sentiment: ${articles.length} articles to process`);

  const scores = await analyzeSentimentBatch(articles as ArticleForSentiment[], apiKey);

  // Update in DB
  let updated = 0;
  for (const [id, score] of scores) {
    const { error: upErr } = await supabase
      .from('actualites')
      .update({ sentiment: score })
      .eq('id', id);

    if (upErr) {
      console.error(`[enrichir-actualite] Update error for ${id}:`, upErr);
    } else {
      updated++;
    }
  }

  console.log(`[enrichir-actualite] Batch sentiment done: ${updated}/${articles.length} updated`);
  return { success: true, processed: articles.length, updated, scores: Object.fromEntries(scores) };
}

// ---------- Main Handler ----------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();

    // --- Batch sentiment mode ---
    if (body.batch_sentiment) {
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY non configurée' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const limit = Math.min(body.limit || 100, 500);
      const result = await handleBatchSentiment(supabase, LOVABLE_API_KEY, limit);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Original single-article enrichment mode ---
    const { actualite_id, content, titre, resume } = body;

    console.log('[enrichir-actualite] Démarrage enrichissement', { actualite_id, hasContent: !!content });

    // 1. Récupérer tous les mots-clés actifs
    const { data: motsCles, error: motsClesError } = await supabase
      .from('mots_cles_veille')
      .select(`
        id, mot_cle, variantes, quadrant, score_criticite, alerte_auto,
        categories_veille (nom, code)
      `)
      .eq('actif', true)
      .order('score_criticite', { ascending: false });

    if (motsClesError) {
      console.error('[enrichir-actualite] Erreur récupération mots-clés:', motsClesError);
      throw motsClesError;
    }

    // 2. Récupérer l'actualité si on a un ID
    let textToAnalyze = content || '';
    let actualiteData = null;

    if (actualite_id) {
      const { data: actu, error: actuError } = await supabase
        .from('actualites')
        .select('*')
        .eq('id', actualite_id)
        .single();

      if (actuError) {
        console.error('[enrichir-actualite] Erreur récupération actualité:', actuError);
        throw actuError;
      }

      actualiteData = actu;
      textToAnalyze = `${actu.titre || ''} ${actu.resume || ''} ${actu.contenu || ''}`;
    } else if (titre || resume) {
      textToAnalyze = `${titre || ''} ${resume || ''}`;
    }

    if (!textToAnalyze.trim()) {
      return new Response(JSON.stringify({ error: 'Aucun contenu à analyser' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Analyser le contenu
    const normalizedContent = normalize(textToAnalyze);
    const matchedKeywords: string[] = [];
    const alertKeywords: string[] = [];
    let totalScore = 0;
    const quadrantScores: Record<string, number> = { tech: 0, regulation: 0, market: 0, reputation: 0 };
    const categoryScores: Record<string, number> = {};

    for (const motCle of motsCles) {
      const mc = motCle as MotCleVeille;
      const allTerms = [mc.mot_cle, ...(mc.variantes || [])];
      let matched = false;

      for (const term of allTerms) {
        if (normalizedContent.includes(normalize(term))) {
          matched = true;
          break;
        }
      }

      if (matched) {
        matchedKeywords.push(mc.mot_cle);
        const score = mc.score_criticite || 50;
        totalScore += score;

        if (mc.quadrant) {
          quadrantScores[mc.quadrant] = (quadrantScores[mc.quadrant] || 0) + score;
        }

        const catName = getCategoryName(mc.categories_veille);
        if (catName) {
          categoryScores[catName] = (categoryScores[catName] || 0) + score;
        }

        if (mc.alerte_auto) {
          alertKeywords.push(mc.mot_cle);
        }
      }
    }

    // 4. Calculer les résultats
    const importance = Math.min(100, Math.round(totalScore * 0.3));

    const sortedQuadrants = Object.entries(quadrantScores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);
    const dominantQuadrant = sortedQuadrants[0]?.[0] || 'market';

    const maxQuadrantScore = Math.max(...Object.values(quadrantScores), 1);
    const quadrantDistribution: Record<string, number> = {};
    for (const [quadrant, score] of Object.entries(quadrantScores)) {
      quadrantDistribution[quadrant] = Math.round((score / maxQuadrantScore) * 100);
    }

    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1]);
    const dominantCategory = sortedCategories[0]?.[0] || 'Actualités sectorielles';

    const enrichment: EnrichmentResult = {
      tags: matchedKeywords,
      categorie: dominantCategory,
      importance,
      quadrant_dominant: dominantQuadrant,
      quadrant_distribution: quadrantDistribution,
      alertes_declenchees: alertKeywords,
      analyse_summary: `${matchedKeywords.length} mots-clés détectés${alertKeywords.length > 0 ? ` dont ${alertKeywords.length} critiques` : ''}`
    };

    console.log('[enrichir-actualite] Enrichissement calculé:', enrichment);

    // 5. Mettre à jour l'actualité si on a un ID
    if (actualite_id) {
      // Also compute sentiment via AI if available and sentiment is null
      let sentimentScore: number | null = null;
      if (LOVABLE_API_KEY && actualiteData && actualiteData.sentiment == null) {
        try {
          const sentimentMap = await analyzeSentimentBatch(
            [{ id: actualite_id, titre: actualiteData.titre, resume: actualiteData.resume }],
            LOVABLE_API_KEY
          );
          sentimentScore = sentimentMap.get(actualite_id) ?? null;
        } catch (e) {
          console.error('[enrichir-actualite] Sentiment AI error:', e);
        }
      }

      const updatePayload: Record<string, unknown> = {
        tags: matchedKeywords,
        categorie: dominantCategory,
        importance,
        analyse_ia: JSON.stringify({
          ...enrichment,
          enrichi_le: new Date().toISOString()
        })
      };

      if (sentimentScore != null) {
        updatePayload.sentiment = sentimentScore;
      }

      const { error: updateError } = await supabase
        .from('actualites')
        .update(updatePayload)
        .eq('id', actualite_id);

      if (updateError) {
        console.error('[enrichir-actualite] Erreur mise à jour:', updateError);
        throw updateError;
      }

      // 6. Créer des alertes si nécessaire
      if (alertKeywords.length > 0) {
        await supabase
          .from('alertes')
          .insert({
            type: 'veille',
            niveau: alertKeywords.length >= 3 ? 'critical' : 'warning',
            titre: `Mots-clés critiques détectés`,
            message: `L'actualité contient ${alertKeywords.length} mot(s)-clé(s) critique(s): ${alertKeywords.join(', ')}`,
            reference_type: 'actualite',
            reference_id: actualite_id,
          });
      }

      console.log(`[enrichir-actualite] Actualité ${actualite_id} enrichie avec succès`);
    }

    return new Response(JSON.stringify({
      success: true,
      actualite_id,
      enrichment
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[enrichir-actualite] Erreur:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
