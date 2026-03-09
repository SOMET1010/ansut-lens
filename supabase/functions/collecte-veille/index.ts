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
  categorie_id?: string | null;
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

interface CollectedActualite {
  titre: string;
  resume: string;
  source: string;
  url: string;
  date_publication: string;
  source_type: 'perplexity' | 'grok_twitter';
  url_verified: boolean;
}

interface InsertedArticle {
  id: string;
  titre: string;
  resume: string | null;
}

// ============= URL VALIDATION =============
function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_e) {
    return false;
  }
}

// Quick HEAD check to verify URL exists (with timeout)
async function verifyUrlExists(urlStr: string): Promise<boolean> {
  if (!isValidUrl(urlStr)) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(urlStr, { 
      method: 'HEAD', 
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return resp.ok || resp.status === 403;
  } catch (_e) {
    return false;
  }
}

// ============= INLINE SENTIMENT ANALYSIS =============
async function analyzeSentimentInline(
  articles: InsertedArticle[],
  apiKey: string
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
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
        console.error(`[collecte-veille] Sentiment AI error: ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content ?? '';

      const match = text.match(/\[[\s\S]*?\]/);
      if (match) {
        const scores: number[] = JSON.parse(match[0]);
        for (let j = 0; j < Math.min(scores.length, chunk.length); j++) {
          const score = Math.max(-1, Math.min(1, Number(scores[j]) || 0));
          results.set(chunk[j].id, Math.round(score * 100) / 100);
        }
      }
    } catch (err) {
      console.error('[collecte-veille] Sentiment chunk error:', err);
    }
  }

  return results;
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

IMPORTANT: Pour chaque actualité, indique le NUMÉRO de la citation source (ex: [1], [2], etc.) correspondant aux sources que tu as consultées. Ne fabrique JAMAIS d'URL.

Retourne les 5 à 10 actualités les plus récentes (derniers 7 jours).`;

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
          content: 'Tu es un assistant de veille stratégique sur les télécommunications en Côte d\'Ivoire. Tu dois TOUJOURS répondre avec un objet JSON valide contenant un tableau "actualites". Pour les URLs, utilise UNIQUEMENT le numéro de citation (ex: "citation_index": 1) correspondant à tes sources. Ne génère JAMAIS d\'URL toi-même.' 
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
                    citation_index: { type: 'number', description: 'Numéro de la citation source (1-indexed)' },
                    date_publication: { type: 'string', description: 'Date au format YYYY-MM-DD' }
                  },
                  required: ['titre', 'resume', 'source', 'date_publication']
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
  const citations: string[] = perplexityData.citations || [];

  console.log(`[collecte-veille] Perplexity: ${citations.length} citations reçues`);

  // Parser les résultats
  let rawActualites: any[] = [];
  try {
    const parsed = JSON.parse(content);
    if (parsed.actualites && Array.isArray(parsed.actualites)) {
      rawActualites = parsed.actualites;
    } else if (Array.isArray(parsed)) {
      rawActualites = parsed;
    }
  } catch {
    try {
      const jsonArrayMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonArrayMatch) {
        rawActualites = JSON.parse(jsonArrayMatch[0]);
      }
    } catch {
      console.error('[collecte-veille] Échec parsing Perplexity');
    }
  }

  // Map citation indices to real URLs
  const validActualites: CollectedActualite[] = rawActualites
    .filter(a => a && a.titre && typeof a.titre === 'string')
    .map(a => {
      // Try to get the real URL from citations array
      let realUrl = '';
      let urlVerified = false;

      // Method 1: Use citation_index if provided
      const citIdx = a.citation_index;
      if (typeof citIdx === 'number' && citIdx >= 1 && citIdx <= citations.length) {
        realUrl = citations[citIdx - 1];
        urlVerified = true;
      }

      // Method 2: If AI provided a url field, check if it matches a citation
      if (!urlVerified && a.url && typeof a.url === 'string') {
        // Check if the AI-provided URL is actually in the citations list
        const matchedCitation = citations.find(c => c === a.url);
        if (matchedCitation) {
          realUrl = matchedCitation;
          urlVerified = true;
        } else {
          // URL is likely hallucinated - still store it but mark as unverified
          realUrl = a.url;
          urlVerified = false;
          console.warn(`[collecte-veille] URL potentiellement fabriquée: ${a.url}`);
        }
      }

      // Method 3: Try to find citation by matching source name
      if (!realUrl && a.source && citations.length > 0) {
        const sourceLower = (a.source || '').toLowerCase();
        const matchedCitation = citations.find(c => {
          try {
            const hostname = new URL(c).hostname.toLowerCase();
            return hostname.includes(sourceLower) || sourceLower.includes(hostname.replace('www.', ''));
          } catch { return false; }
        });
        if (matchedCitation) {
          realUrl = matchedCitation;
          urlVerified = true;
        }
      }

      return {
        titre: a.titre,
        resume: a.resume || '',
        source: a.source || 'Perplexity',
        url: realUrl,
        date_publication: a.date_publication || new Date().toISOString().split('T')[0],
        source_type: 'perplexity' as const,
        url_verified: urlVerified,
      };
    });

  console.log(`[collecte-veille] Perplexity: ${validActualites.length} actualités (${validActualites.filter(a => a.url_verified).length} URLs vérifiées)`);
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

IMPORTANT: Ne retourne QUE des tweets/posts que tu peux vérifier comme existants. Pour chaque tweet, fournis l'URL EXACTE au format https://x.com/username/status/TWEET_ID. Si tu n'es pas certain de l'URL exacte, ne l'inclus PAS et mets "url": null.

Retourne les 5 à 8 tweets/posts les plus pertinents et récents.`;

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
          content: `Tu es un assistant de veille Twitter/X sur les télécommunications en Afrique.
RÈGLE CRITIQUE: Ne retourne QUE des informations que tu peux vérifier. Ne FABRIQUE JAMAIS de tweets, de comptes ou d'URLs. Si tu ne trouves pas de tweets récents pertinents, retourne un tableau vide.
Réponds TOUJOURS avec un JSON valide:
{
  "actualites": [
    {
      "titre": "Résumé du tweet",
      "resume": "Contenu détaillé",
      "auteur_twitter": "@handle",
      "url": "https://x.com/user/status/ID ou null si incertain",
      "date_publication": "YYYY-MM-DD"
    }
  ]
}` 
        },
        { role: 'user', content: grokPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.1, // Lower temperature for more factual output
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

  let rawActualites: any[] = [];
  try {
    const parsed = JSON.parse(content);
    if (parsed.actualites && Array.isArray(parsed.actualites)) {
      rawActualites = parsed.actualites;
    } else if (Array.isArray(parsed)) {
      rawActualites = parsed;
    }
  } catch {
    try {
      const jsonMatch = content.match(/\{[\s\S]*"actualites"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        rawActualites = parsed.actualites || [];
      }
    } catch {
      console.error('[collecte-veille] Échec parsing Grok');
    }
  }

  // Validate and transform - verify Twitter URLs have proper format
  const validActualites: CollectedActualite[] = [];
  
  for (const a of rawActualites) {
    if (!a || !a.titre || typeof a.titre !== 'string') continue;
    
    let url = a.url || '';
    let urlVerified = false;
    
    // Validate Twitter URL format: must match https://x.com/user/status/NUMBER
    if (url && typeof url === 'string') {
      const twitterPattern = /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+$/;
      if (twitterPattern.test(url)) {
        // Verify the URL actually exists
        urlVerified = await verifyUrlExists(url);
        if (!urlVerified) {
          console.warn(`[collecte-veille] URL Twitter invalide (404): ${url}`);
          url = ''; // Don't store invalid URLs
        }
      } else {
        console.warn(`[collecte-veille] Format URL Twitter invalide: ${url}`);
        url = '';
      }
    }

    validActualites.push({
      titre: a.titre,
      resume: a.resume || '',
      source: a.auteur_twitter || 'Twitter/X',
      url,
      date_publication: a.date_publication || new Date().toISOString().split('T')[0],
      source_type: 'grok_twitter' as const,
      url_verified: urlVerified,
    });
  }

  console.log(`[collecte-veille] Grok: ${validActualites.length} tweets (${validActualites.filter(a => a.url_verified).length} URLs vérifiées)`);
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
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables');
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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

    const results = await Promise.all(collectePromises);

    const allActualites: CollectedActualite[] = results.flatMap(r => r.actualites);
    const allCitations: string[] = results.flatMap(r => r.citations);

    console.log(`[collecte-veille] Total: ${allActualites.length} actualités collectées`);

    // 4. Insérer les actualités dans la base
    let insertedCount = 0;
    const alertes: string[] = [];
    const insertedArticles: InsertedArticle[] = [];

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

      const importance = Math.min(100, Math.round(totalScore * 0.3));
      const dominantQuadrant = Object.entries(quadrantScores)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'market';

      // Only store URL if it's valid
      const sourceUrl = (actu.url && isValidUrl(actu.url)) ? actu.url : null;

      const { data: inserted, error: insertError } = await supabase
        .from('actualites')
        .insert({
          titre: actu.titre,
          resume: actu.resume,
          contenu: actu.resume,
          source_nom: actu.source,
          source_url: sourceUrl,
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
            url_verified: actu.url_verified,
            collecte_date: new Date().toISOString()
          })
        })
        .select('id');

      if (insertError) {
        console.error('[collecte-veille] Erreur insertion:', insertError);
      } else {
        insertedCount++;
        const newId = inserted?.[0]?.id;
        if (newId) {
          insertedArticles.push({ id: newId, titre: actu.titre, resume: actu.resume });
        }
        console.log(`[collecte-veille] [${actu.source_type}] Inséré: ${actu.titre.substring(0, 50)}... (URL ${actu.url_verified ? '✓' : '✗'})`);
      }

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

    // 4b. Analyse sentiment IA automatique
    let nbSentimentsEnrichis = 0;
    if (LOVABLE_API_KEY && insertedArticles.length > 0) {
      try {
        console.log(`[collecte-veille] Analyse sentiment IA pour ${insertedArticles.length} articles...`);
        const sentimentScores = await analyzeSentimentInline(insertedArticles, LOVABLE_API_KEY);

        for (const [id, score] of sentimentScores) {
          const { error: upErr } = await supabase
            .from('actualites')
            .update({ sentiment: score })
            .eq('id', id);

          if (!upErr) nbSentimentsEnrichis++;
        }
        console.log(`[collecte-veille] Sentiment enrichi: ${nbSentimentsEnrichis}/${insertedArticles.length}`);
      } catch (sentErr) {
        console.error('[collecte-veille] Erreur sentiment (non-bloquante):', sentErr);
      }
    } else if (!LOVABLE_API_KEY) {
      console.log('[collecte-veille] LOVABLE_API_KEY absente, sentiment skippé');
    }

    // 5. Matcher les actualités avec les flux utilisateurs
    console.log('[collecte-veille] Matching flux utilisateurs...');
    const { data: fluxActifs } = await supabase
      .from('flux_veille')
      .select('id, user_id, nom, mots_cles, categories_ids, quadrants, importance_min, alerte_push')
      .eq('actif', true);

    if (fluxActifs && fluxActifs.length > 0) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: recentActus } = await supabase
        .from('actualites')
        .select('id, titre, resume, importance, categorie, tags, analyse_ia')
        .gte('created_at', twoHoursAgo);

      if (recentActus && recentActus.length > 0) {
        for (const flux of fluxActifs) {
          for (const actu of recentActus) {
            let scoreMatch = 0;
            const fullContent = `${actu.titre} ${actu.resume || ''}`.toLowerCase();

            const fluxMotsCles = (flux.mots_cles as string[]) || [];
            for (const kw of fluxMotsCles) {
              if (fullContent.includes(kw.toLowerCase())) {
                scoreMatch += 30;
              }
            }

            const actuTags = (actu.tags as string[]) || [];
            for (const tag of actuTags) {
              if (fluxMotsCles.some(kw => kw.toLowerCase() === tag.toLowerCase())) {
                scoreMatch += 20;
              }
            }

            const fluxQuadrants = (flux.quadrants as string[]) || [];
            if (fluxQuadrants.length > 0 && actu.analyse_ia) {
              try {
                const analyse = JSON.parse(actu.analyse_ia as string);
                if (analyse.quadrant_dominant && fluxQuadrants.includes(analyse.quadrant_dominant)) {
                  scoreMatch += 15;
                }
              } catch {}
            }

            const importanceMin = flux.importance_min || 0;
            const actuImportance = actu.importance || 0;
            if (actuImportance >= importanceMin) {
              scoreMatch += 10;
            } else if (importanceMin > 0) {
              continue;
            }

            if (scoreMatch >= 20) {
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
      nb_sentiments_enrichis: nbSentimentsEnrichis,
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
