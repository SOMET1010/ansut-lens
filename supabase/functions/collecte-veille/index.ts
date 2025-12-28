import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MotCleVeille {
  id: string;
  mot_cle: string;
  variantes: string[] | null;
  quadrant: string | null;
  score_criticite: number | null;
  alerte_auto: boolean | null;
  categorie_id?: string | null;
  categories_veille?: {
    nom: string;
    code: string;
  } | { nom: string; code: string; }[] | null;
}

// Helper to get category name from joined data
const getCategoryName = (cat: MotCleVeille['categories_veille']): string | undefined => {
  if (!cat) return undefined;
  if (Array.isArray(cat)) return cat[0]?.nom;
  return cat.nom;
};

interface PerplexityResult {
  titre: string;
  resume: string;
  source: string;
  url: string;
  date_publication: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!PERPLEXITY_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables');
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { type = 'critique', recency = 72 } = await req.json().catch(() => ({}));
    
    console.log(`[collecte-veille] Démarrage collecte type=${type}, recency=${recency}h`);

    // 1. Récupérer les mots-clés actifs selon le type
    let query = supabase
      .from('mots_cles_veille')
      .select(`
        id, mot_cle, variantes, quadrant, score_criticite, alerte_auto, categorie_id,
        categories_veille (nom, code)
      `)
      .eq('actif', true);

    if (type === 'critique') {
      query = query.gte('score_criticite', 70);
    } else if (type === 'quotidienne') {
      query = query.gte('score_criticite', 50).lt('score_criticite', 70);
    }

    const { data: motsCles, error: motsClesError } = await query
      .order('score_criticite', { ascending: false })
      .limit(20);

    if (motsClesError) {
      console.error('[collecte-veille] Erreur récupération mots-clés:', motsClesError);
      throw motsClesError;
    }

    if (!motsCles || motsCles.length === 0) {
      console.log('[collecte-veille] Aucun mot-clé trouvé pour ce type');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Aucun mot-clé à traiter',
        nb_resultats: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[collecte-veille] ${motsCles.length} mots-clés à traiter`);

    // 2. Construire la requête Perplexity
    const topKeywords = motsCles.slice(0, 10).map((m) => m.mot_cle);
    const keywordsString = topKeywords.join(', ');

    const perplexityPrompt = `Recherche les actualités récentes sur les télécommunications, le numérique et les technologies en Côte d'Ivoire.

Thèmes prioritaires: ${keywordsString}

Mais inclut aussi toute actualité récente sur:
- Orange CI, MTN, Moov Africa (opérateurs télécom)
- ARTCI (régulateur télécoms)
- ANSUT (agence nationale du service universel des télécommunications)
- Ministère de la Transition Numérique
- Projets de fibre optique, 4G/5G, couverture réseau
- Startups tech ivoiriennes, fintech, mobile money
- Cybersécurité en Afrique de l'Ouest
- Événements tech (SITEC, AfricaTech, etc.)

Retourne les 5 à 10 actualités les plus récentes (derniers 7 jours) avec leurs vraies URLs.`;

    console.log('[collecte-veille] Appel Perplexity API...');

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un assistant spécialisé dans la veille stratégique sur les télécommunications en Côte d\'Ivoire. Tu dois TOUJOURS répondre avec un objet JSON valide contenant un tableau "actualites".' 
          },
          { role: 'user', content: perplexityPrompt }
        ],
        search_recency_filter: 'week',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'actualites_response',
            schema: {
              type: 'object',
              properties: {
                actualites: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      titre: { type: 'string', description: 'Titre de l\'article' },
                      resume: { type: 'string', description: 'Résumé en 2-3 phrases' },
                      source: { type: 'string', description: 'Nom du média source' },
                      url: { type: 'string', description: 'URL de l\'article' },
                      date_publication: { type: 'string', description: 'Date au format YYYY-MM-DD' }
                    },
                    required: ['titre', 'resume', 'source', 'url', 'date_publication']
                  }
                }
              },
              required: ['actualites']
            }
          }
        }
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('[collecte-veille] Erreur Perplexity:', perplexityResponse.status, errorText);
      throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`);
    }

    const perplexityData = await perplexityResponse.json();
    const content = perplexityData.choices?.[0]?.message?.content || '{}';
    const citations = perplexityData.citations || [];

    console.log('[collecte-veille] Réponse Perplexity reçue, parsing...');
    console.log('[collecte-veille] Contenu brut (500 premiers chars):', content.substring(0, 500));

    // 3. Parser les résultats avec plusieurs stratégies de fallback
    let actualites: PerplexityResult[] = [];
    try {
      // Stratégie 1: Parser directement comme objet JSON structuré
      const parsed = JSON.parse(content);
      if (parsed.actualites && Array.isArray(parsed.actualites)) {
        actualites = parsed.actualites;
        console.log('[collecte-veille] Parsing réussi via structured output');
      } else if (Array.isArray(parsed)) {
        // Stratégie 2: C'est directement un tableau
        actualites = parsed;
        console.log('[collecte-veille] Parsing réussi via tableau direct');
      }
    } catch (parseError) {
      console.error('[collecte-veille] Erreur parsing JSON initial:', parseError);
      
      // Stratégie 3: Chercher un tableau JSON dans le contenu (fallback markdown)
      try {
        const jsonArrayMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonArrayMatch) {
          actualites = JSON.parse(jsonArrayMatch[0]);
          console.log('[collecte-veille] Parsing réussi via extraction tableau');
        }
      } catch (fallbackError) {
        console.error('[collecte-veille] Échec parsing fallback tableau:', fallbackError);
      }
      
      // Stratégie 4: Chercher un objet JSON avec actualites
      if (actualites.length === 0) {
        try {
          const jsonObjectMatch = content.match(/\{[\s\S]*"actualites"[\s\S]*\}/);
          if (jsonObjectMatch) {
            const parsed = JSON.parse(jsonObjectMatch[0]);
            actualites = parsed.actualites || [];
            console.log('[collecte-veille] Parsing réussi via extraction objet');
          }
        } catch (objFallbackError) {
          console.error('[collecte-veille] Échec parsing fallback objet:', objFallbackError);
        }
      }
    }
    
    // Validation des résultats
    actualites = actualites.filter(a => a && a.titre && typeof a.titre === 'string');
    console.log(`[collecte-veille] ${actualites.length} actualités validées après parsing`);

    console.log(`[collecte-veille] ${actualites.length} actualités parsées`);

    // 4. Insérer les actualités dans la base
    let insertedCount = 0;
    const alertes: string[] = [];

    for (const actu of actualites) {
      if (!actu.titre) continue;

      // Vérifier si l'actualité existe déjà (éviter les doublons)
      const { data: existing } = await supabase
        .from('actualites')
        .select('id')
        .eq('titre', actu.titre)
        .maybeSingle();

      if (existing) {
        console.log(`[collecte-veille] Doublon ignoré: ${actu.titre.substring(0, 50)}...`);
        continue;
      }

      // Analyser le contenu pour enrichissement
      const fullContent = `${actu.titre} ${actu.resume}`.toLowerCase();
      const matchedKeywords: string[] = [];
      let totalScore = 0;
      const quadrantScores: Record<string, number> = { tech: 0, regulation: 0, market: 0, reputation: 0 };
      let dominantCategory = '';
      let hasAlertKeyword = false;

      for (const motCle of motsCles) {
        const allTerms = [motCle.mot_cle, ...(motCle.variantes || [])];
        for (const term of allTerms) {
          if (fullContent.includes(term.toLowerCase())) {
            matchedKeywords.push(motCle.mot_cle);
            totalScore += motCle.score_criticite || 50;
            if (motCle.quadrant) {
              quadrantScores[motCle.quadrant] = (quadrantScores[motCle.quadrant] || 0) + (motCle.score_criticite || 50);
            }
            const catName = getCategoryName(motCle.categories_veille as MotCleVeille['categories_veille']);
            if (!dominantCategory && catName) {
              dominantCategory = catName;
            }
            if (motCle.alerte_auto) {
              hasAlertKeyword = true;
              alertes.push(motCle.mot_cle);
            }
            break;
          }
        }
      }

      // Calculer l'importance (plafonné à 100)
      const importance = Math.min(100, Math.round(totalScore * 0.3));

      // Déterminer le quadrant dominant
      const dominantQuadrant = Object.entries(quadrantScores)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'market';

      // Insérer l'actualité
      const { error: insertError } = await supabase
        .from('actualites')
        .insert({
          titre: actu.titre,
          resume: actu.resume,
          contenu: actu.resume,
          source_nom: actu.source,
          source_url: actu.url,
          date_publication: actu.date_publication || new Date().toISOString(),
          tags: matchedKeywords,
          categorie: dominantCategory || 'Actualités sectorielles',
          importance,
          analyse_ia: JSON.stringify({
            mots_cles_detectes: matchedKeywords,
            quadrant_dominant: dominantQuadrant,
            quadrant_scores: quadrantScores,
            collecte_type: type,
            collecte_date: new Date().toISOString()
          })
        });

      if (insertError) {
        console.error('[collecte-veille] Erreur insertion:', insertError);
      } else {
        insertedCount++;
        console.log(`[collecte-veille] Inséré: ${actu.titre.substring(0, 50)}...`);
      }

      // Créer une alerte si mot-clé critique détecté
      if (hasAlertKeyword) {
        await supabase
          .from('alertes')
          .insert({
            type: 'veille',
            niveau: 'warning',
            titre: `Mot-clé critique détecté: ${alertes[0]}`,
            message: `L'actualité "${actu.titre}" contient des mots-clés critiques: ${matchedKeywords.join(', ')}`,
            reference_type: 'actualite',
          });
      }
    }

    // 5. Logger la collecte
    const duration = Date.now() - startTime;
    await supabase
      .from('collectes_log')
      .insert({
        type,
        statut: 'success',
        nb_resultats: insertedCount,
        mots_cles_utilises: topKeywords,
        duree_ms: duration,
      });

    console.log(`[collecte-veille] Terminé: ${insertedCount} actualités insérées en ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      nb_resultats: insertedCount,
      mots_cles_utilises: topKeywords,
      alertes_declenchees: alertes,
      duree_ms: duration,
      citations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[collecte-veille] Erreur:', error);

    // Logger l'erreur
    await supabase
      .from('collectes_log')
      .insert({
        type: 'critique',
        statut: 'error',
        nb_resultats: 0,
        duree_ms: duration,
        erreur: error instanceof Error ? error.message : 'Erreur inconnue',
      });

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
