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

interface GrokResult {
  titre: string;
  resume: string;
  auteur_twitter?: string;
  url: string;
  date_publication: string;
}

interface CollectedActualite {
  titre: string;
  resume: string;
  source: string;
  url: string;
  date_publication: string;
  source_type: 'perplexity' | 'grok_twitter';
}

// ============= PERPLEXITY COLLECTION =============
async function collectePerplexity(
  keywordsString: string,
  PERPLEXITY_API_KEY: string
): Promise<{ actualites: CollectedActualite[], citations: string[] }> {
  console.log('[collecte-veille] Appel Perplexity API...');

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
    throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
  }

  const perplexityData = await perplexityResponse.json();
  const content = perplexityData.choices?.[0]?.message?.content || '{}';
  const citations = perplexityData.citations || [];

  console.log('[collecte-veille] Réponse Perplexity reçue, parsing...');

  // Parser les résultats avec plusieurs stratégies de fallback
  let actualites: PerplexityResult[] = [];
  try {
    const parsed = JSON.parse(content);
    if (parsed.actualites && Array.isArray(parsed.actualites)) {
      actualites = parsed.actualites;
    } else if (Array.isArray(parsed)) {
      actualites = parsed;
    }
  } catch {
    try {
      const jsonArrayMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonArrayMatch) {
        actualites = JSON.parse(jsonArrayMatch[0]);
      }
    } catch {
      console.error('[collecte-veille] Échec parsing Perplexity');
    }
  }

  // Validation et transformation
  const validActualites = actualites
    .filter(a => a && a.titre && typeof a.titre === 'string')
    .map(a => ({
      ...a,
      source_type: 'perplexity' as const
    }));

  console.log(`[collecte-veille] Perplexity: ${validActualites.length} actualités`);
  return { actualites: validActualites, citations };
}

// ============= GROK (xAI) COLLECTION - Twitter/X =============
async function collecteGrok(
  keywordsString: string,
  XAI_API_KEY: string
): Promise<{ actualites: CollectedActualite[], citations: string[] }> {
  console.log('[collecte-veille] Appel Grok API pour Twitter/X...');

  const grokPrompt = `Recherche les tweets et posts Twitter/X récents sur les télécommunications et le numérique en Côte d'Ivoire.

Thèmes prioritaires: ${keywordsString}

Cibles spécifiques sur Twitter/X:
- Comptes officiels: @OrangeCIV, @MTNCotedIvoire, @MoovAfrica_CI, @ARTCI_CI, @ANSUT_CI
- Ministères et institutions ivoiriennes liées au numérique
- Journalistes tech et influenceurs télécom africains
- Acteurs du secteur: CEO, directeurs, responsables télécoms
- Hashtags: #TelecomCI #NumériqueCI #CotedIvoire #TechAfrique

Retourne les 5 à 8 tweets/posts les plus pertinents et récents avec leurs URLs Twitter.
Format de réponse JSON obligatoire.`;

  const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-3-latest',
      messages: [
        { 
          role: 'system', 
          content: `Tu es un assistant spécialisé dans la veille Twitter/X sur les télécommunications en Afrique.
Tu dois TOUJOURS répondre avec un objet JSON valide au format suivant:
{
  "actualites": [
    {
      "titre": "Résumé du tweet en une phrase",
      "resume": "Contenu détaillé du tweet ou thread",
      "auteur_twitter": "@handle de l'auteur",
      "url": "URL du tweet (format https://x.com/user/status/id)",
      "date_publication": "YYYY-MM-DD"
    }
  ]
}` 
        },
        { role: 'user', content: grokPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!grokResponse.ok) {
    const errorText = await grokResponse.text();
    console.error('[collecte-veille] Erreur Grok:', grokResponse.status, errorText);
    throw new Error(`Grok API error: ${grokResponse.status}`);
  }

  const grokData = await grokResponse.json();
  const content = grokData.choices?.[0]?.message?.content || '{}';

  console.log('[collecte-veille] Réponse Grok reçue, parsing...');

  // Parser les résultats
  let actualites: GrokResult[] = [];
  try {
    const parsed = JSON.parse(content);
    if (parsed.actualites && Array.isArray(parsed.actualites)) {
      actualites = parsed.actualites;
    } else if (Array.isArray(parsed)) {
      actualites = parsed;
    }
  } catch {
    // Fallback: extraire JSON du texte
    try {
      const jsonMatch = content.match(/\{[\s\S]*"actualites"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        actualites = parsed.actualites || [];
      }
    } catch {
      console.error('[collecte-veille] Échec parsing Grok');
    }
  }

  // Validation et transformation
  const validActualites = actualites
    .filter(a => a && a.titre && typeof a.titre === 'string')
    .map(a => ({
      titre: a.titre,
      resume: a.resume,
      source: a.auteur_twitter || 'Twitter/X',
      url: a.url,
      date_publication: a.date_publication,
      source_type: 'grok_twitter' as const
    }));

  console.log(`[collecte-veille] Grok: ${validActualites.length} tweets/posts`);
  return { actualites: validActualites, citations: [] };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables');
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Au moins une API doit être configurée
  if (!PERPLEXITY_API_KEY && !XAI_API_KEY) {
    console.error('Aucune API de collecte configurée (Perplexity ou Grok)');
    return new Response(JSON.stringify({ error: 'Aucune API de collecte configurée' }), {
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

    // 2. Construire la requête
    const topKeywords = motsCles.slice(0, 10).map((m) => m.mot_cle);
    const keywordsString = topKeywords.join(', ');

    // 3. Appels parallèles aux APIs disponibles
    const sourcesUtilisees: string[] = [];
    const collectePromises: Promise<{ actualites: CollectedActualite[], citations: string[] }>[] = [];

    if (PERPLEXITY_API_KEY) {
      sourcesUtilisees.push('perplexity');
      collectePromises.push(
        collectePerplexity(keywordsString, PERPLEXITY_API_KEY)
          .catch(err => {
            console.error('[collecte-veille] Erreur Perplexity (continue):', err.message);
            return { actualites: [], citations: [] };
          })
      );
    }

    if (XAI_API_KEY) {
      sourcesUtilisees.push('grok_twitter');
      collectePromises.push(
        collecteGrok(keywordsString, XAI_API_KEY)
          .catch(err => {
            console.error('[collecte-veille] Erreur Grok (continue):', err.message);
            return { actualites: [], citations: [] };
          })
      );
    }

    console.log(`[collecte-veille] Sources utilisées: ${sourcesUtilisees.join(', ')}`);

    // Attendre toutes les réponses en parallèle
    const results = await Promise.all(collectePromises);

    // Fusionner les résultats
    const allActualites: CollectedActualite[] = results.flatMap(r => r.actualites);
    const allCitations: string[] = results.flatMap(r => r.citations);

    console.log(`[collecte-veille] Total: ${allActualites.length} actualités collectées`);

    // 4. Insérer les actualités dans la base
    let insertedCount = 0;
    const alertes: string[] = [];

    for (const actu of allActualites) {
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
          source_type: actu.source_type,
          date_publication: actu.date_publication || new Date().toISOString(),
          tags: matchedKeywords,
          categorie: dominantCategory || 'Actualités sectorielles',
          importance,
          analyse_ia: JSON.stringify({
            mots_cles_detectes: matchedKeywords,
            quadrant_dominant: dominantQuadrant,
            quadrant_scores: quadrantScores,
            collecte_type: type,
            source_collecte: actu.source_type,
            collecte_date: new Date().toISOString()
          })
        });

      if (insertError) {
        console.error('[collecte-veille] Erreur insertion:', insertError);
      } else {
        insertedCount++;
        console.log(`[collecte-veille] [${actu.source_type}] Inséré: ${actu.titre.substring(0, 50)}...`);
      }

      // Créer une alerte si mot-clé critique détecté
      if (hasAlertKeyword) {
        await supabase
          .from('alertes')
          .insert({
            type: 'veille',
            niveau: 'warning',
            titre: `Mot-clé critique détecté: ${alertes[0]}`,
            message: `L'actualité "${actu.titre}" (source: ${actu.source_type}) contient des mots-clés critiques: ${matchedKeywords.join(', ')}`,
            reference_type: 'actualite',
          });
      }
    }

    // 5. Matcher les actualités avec les flux utilisateurs
    console.log('[collecte-veille] Matching flux utilisateurs...');
    const { data: fluxActifs } = await supabase
      .from('flux_veille')
      .select('id, user_id, nom, mots_cles, categories_ids, quadrants, importance_min, alerte_push')
      .eq('actif', true);

    if (fluxActifs && fluxActifs.length > 0) {
      // Récupérer les actualités récemment insérées (dernières 2 heures pour être sûr)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: recentActus } = await supabase
        .from('actualites')
        .select('id, titre, resume, importance, categorie, tags, analyse_ia')
        .gte('created_at', twoHoursAgo);

      if (recentActus && recentActus.length > 0) {
        for (const flux of fluxActifs) {
          for (const actu of recentActus) {
            // Calculer le score de match
            let scoreMatch = 0;
            const fullContent = `${actu.titre} ${actu.resume || ''}`.toLowerCase();

            // Match par mots-clés personnalisés
            const fluxMotsCles = (flux.mots_cles as string[]) || [];
            for (const kw of fluxMotsCles) {
              if (fullContent.includes(kw.toLowerCase())) {
                scoreMatch += 30;
              }
            }

            // Match par tags de l'actualité
            const actuTags = (actu.tags as string[]) || [];
            for (const tag of actuTags) {
              if (fluxMotsCles.some(kw => kw.toLowerCase() === tag.toLowerCase())) {
                scoreMatch += 20;
              }
            }

            // Match par quadrant
            const fluxQuadrants = (flux.quadrants as string[]) || [];
            if (fluxQuadrants.length > 0 && actu.analyse_ia) {
              try {
                const analyse = JSON.parse(actu.analyse_ia as string);
                if (analyse.quadrant_dominant && fluxQuadrants.includes(analyse.quadrant_dominant)) {
                  scoreMatch += 15;
                }
              } catch {}
            }

            // Vérifier l'importance minimum
            const importanceMin = flux.importance_min || 0;
            const actuImportance = actu.importance || 0;
            if (actuImportance >= importanceMin) {
              scoreMatch += 10;
            } else if (importanceMin > 0) {
              // Ne pas matcher si en dessous du seuil
              continue;
            }

            // Si score suffisant, créer l'association
            if (scoreMatch >= 20) {
              // Vérifier si pas déjà associé
              const { data: existing } = await supabase
                .from('flux_actualites')
                .select('id')
                .eq('flux_id', flux.id)
                .eq('actualite_id', actu.id)
                .maybeSingle();

              if (!existing) {
                await supabase
                  .from('flux_actualites')
                  .insert({
                    flux_id: flux.id,
                    actualite_id: actu.id,
                    score_match: scoreMatch,
                    notifie: false,
                  });

                // Créer une alerte si push activé
                if (flux.alerte_push) {
                  await supabase
                    .from('alertes')
                    .insert({
                      type: 'flux',
                      niveau: 'info',
                      titre: `Nouveau dans "${flux.nom}"`,
                      message: actu.titre,
                      reference_type: 'actualite',
                      reference_id: actu.id,
                      user_id: flux.user_id,
                    });
                }

                console.log(`[collecte-veille] Flux "${flux.nom}": matched actu "${actu.titre.substring(0, 40)}..." (score: ${scoreMatch})`);
              }
            }
          }
        }
      }
    }

    // 6. Logger la collecte
    const duration = Date.now() - startTime;
    await supabase
      .from('collectes_log')
      .insert({
        type,
        statut: 'success',
        nb_resultats: insertedCount,
        mots_cles_utilises: topKeywords,
        sources_utilisees: sourcesUtilisees,
        duree_ms: duration,
      });

    console.log(`[collecte-veille] Terminé: ${insertedCount} actualités insérées en ${duration}ms (sources: ${sourcesUtilisees.join(', ')})`);

    return new Response(JSON.stringify({
      success: true,
      nb_resultats: insertedCount,
      mots_cles_utilises: topKeywords,
      sources_utilisees: sourcesUtilisees,
      alertes_declenchees: alertes,
      duree_ms: duration,
      citations: allCitations
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
