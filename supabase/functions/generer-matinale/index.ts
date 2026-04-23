// Using native Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  consolidateActualites,
  formatConsolidatedForPrompt,
  type ActuLike,
} from "../_shared/dedup-actualites.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendViaGateway(to: string, subject: string, htmlContent: string) {
  const baseUrl = Deno.env.get('AZURE_SMS_URL')!;
  const username = Deno.env.get('AZURE_SMS_USERNAME')!;
  const password = Deno.env.get('AZURE_SMS_PASSWORD')!;
  const unifiedUrl = baseUrl.replace(/\/api\/SendSMS\/?$/i, '') + '/api/message/send';

  const response = await fetch(unifiedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, content: htmlContent, ishtml: true, username, password, channel: 'Email' }),
  });
  return response;
}

// Fetch real-time news from Perplexity to ground the briefing in verified sources
async function fetchPerplexityNews(): Promise<{ articles: Array<{ titre: string; resume: string; source: string; url: string }>; citations: string[] }> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  if (!PERPLEXITY_API_KEY) {
    console.warn('[Matinale] PERPLEXITY_API_KEY not configured, skipping real-time search');
    return { articles: [], citations: [] };
  }

  const queries = [
    "Actualités télécommunications numérique Côte d'Ivoire ANSUT ARTCI aujourd'hui",
    "Opérateurs telecoms Orange MTN Moov Côte d'Ivoire Afrique de l'Ouest actualités",
  ];

  const allArticles: Array<{ titre: string; resume: string; source: string; url: string }> = [];
  const allCitations: string[] = [];

  for (const query of queries) {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `Tu es un assistant de veille. Réponds UNIQUEMENT en JSON valide:
{
  "articles": [
    { "titre": "Titre exact de l'article", "resume": "Résumé en 1-2 phrases", "source": "Nom du média", "url": "URL exacte de l'article" }
  ]
}
RÈGLES: Ne fournis QUE des articles réels avec des URLs vérifiables. Maximum 5 articles par requête.`
            },
            { role: 'user', content: query }
          ],
          search_recency_filter: 'day',
          return_citations: true,
        }),
      });

      if (!response.ok) {
        console.error(`[Matinale/Perplexity] Error ${response.status} for query: ${query}`);
        await response.text();
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const citations = data.citations || [];
      allCitations.push(...citations);

      try {
        const jsonMatch = content.match(/\{[\s\S]*"articles"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.articles)) {
            const enriched = parsed.articles.map((a: any, i: number) => ({
              titre: a.titre || 'Sans titre',
              resume: a.resume || '',
              source: a.source || 'Web',
              url: a.url || citations[i] || '',
            }));
            allArticles.push(...enriched);
          }
        }
      } catch (e) {
        console.error('[Matinale/Perplexity] JSON parse error:', e);
      }
    } catch (e) {
      console.error(`[Matinale/Perplexity] Fetch error for query "${query}":`, e);
    }
  }

  const seen = new Set<string>();
  const unique = allArticles.filter(a => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  console.log(`[Matinale/Perplexity] Fetched ${unique.length} real-time articles with ${allCitations.length} citations`);
  return { articles: unique, citations: allCitations };
}

// Fetch Ivorian press headlines (titrologie) via Perplexity
async function fetchTitrologie(): Promise<Array<{ journal: string; titre: string; resume: string; url: string; type: string }>> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  if (!PERPLEXITY_API_KEY) {
    console.warn('[Matinale] PERPLEXITY_API_KEY not configured, skipping titrologie');
    return [];
  }

  const titrologiePrompt = `Donne-moi les gros titres du jour (titrologie) des principaux journaux et médias en Côte d'Ivoire. 

Journaux à couvrir en priorité :
- PRESSE NATIONALE : Fraternité Matin, L'Intelligent d'Abidjan, Le Patriote, Notre Voie, Soir Info, Le Nouveau Réveil, Le Jour Plus, Le Matin d'Abidjan, L'Expression
- PRESSE EN LIGNE : Abidjan.net, Koaci, Connectionivoirienne, AIP (Agence Ivoirienne de Presse), LInfodrome
- PRESSE ÉCONOMIQUE/TECH : CIO Mag Afrique, Agence Ecofin, Financial Afrik, TechCabal

Pour chaque journal trouvé, donne le ou les gros titres principaux du jour avec un résumé d'une phrase.

IMPORTANT : Ne fournis que des titres RÉELS publiés aujourd'hui. Si tu ne trouves pas de titres pour un journal, ne l'inclus pas.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant de revue de presse ivoirienne. Réponds UNIQUEMENT en JSON valide:
{
  "titres": [
    { "journal": "Nom du journal", "titre": "Gros titre exact", "resume": "Résumé en 1 phrase", "url": "URL de l'article si disponible", "type": "nationale|en_ligne|economique" }
  ]
}
RÈGLES: Ne fournis QUE des titres réels publiés aujourd'hui. Maximum 15 titres.`
          },
          { role: 'user', content: titrologiePrompt }
        ],
        search_recency_filter: 'day',
        return_citations: true,
      }),
    });

    if (!response.ok) {
      console.error(`[Matinale/Titrologie] Error ${response.status}`);
      await response.text();
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    try {
      const jsonMatch = content.match(/\{[\s\S]*"titres"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.titres)) {
          const titres = parsed.titres.map((t: any, i: number) => ({
            journal: t.journal || 'Inconnu',
            titre: t.titre || '',
            resume: t.resume || '',
            url: t.url || citations[i] || '',
            type: t.type || 'nationale',
          }));
          console.log(`[Matinale/Titrologie] ${titres.length} titres récupérés`);
          return titres;
        }
      }
    } catch (e) {
      console.error('[Matinale/Titrologie] JSON parse error:', e);
    }
  } catch (e) {
    console.error('[Matinale/Titrologie] Fetch error:', e);
  }

  return [];
}

const MATINALE_PROMPT = `Tu produis la **MATINALE CODIR – ANSUT** en mode PRODUCTION.
Tu es analyste senior de l'Agence Nationale du Service Universel des Télécommunications (Côte d'Ivoire).
Le livrable est destiné au CODIR : il doit être SOBRE, FACTUEL, DIRECTEMENT EXPLOITABLE.

CADRE D'ANALYSE OBLIGATOIRE (à appliquer en interne, sans le verbaliser inutilement) :
1. SERVICE UNIVERSEL : Accès / Usages / Impact
2. IA & COMMUNICATIONS ÉLECTRONIQUES : Optimisation réseau / Inclusion / Coûts / Souveraineté

CONTRAINTES STRICTES :
- JAMAIS inventer un titre, une URL, un chiffre, un nom ou une fonction
- Si une donnée est incertaine → l'omettre purement (ne pas écrire "non disponible" partout)
- Aucune analyse dans la revue de presse (section B)
- Aucun jargon de communication interne
- Français professionnel, ton institutionnel neutre

STRUCTURE DE SORTIE OBLIGATOIRE (JSON via tool call) :

B. revue_de_presse (8 à 15 titres MAX, sinon réduire) :
   Tableau d'objets {titre exact, source, date (AAAA-MM-JJ), url valide, rubrique}.
   Rubriques autorisées : "telecom_numerique", "economie_finance", "gouvernance_regulation", "international".
   Tri par rubrique. Aucune analyse.

C. a_retenir (max 3 phrases) :
   Tableau de 1 à 3 phrases courtes, factuelles, sans interprétation excessive.

D. retour_ansut :
   - lecture_service_universel : { acces, usages, impact } — chaque champ : 1 phrase ou null si non applicable (ne pas écrire "RAS" inutilement, mettre null).
   - implication_ansut : 2 lignes MAX. Si aucune implication réelle : null.
   - niveau_attention : "Faible" | "Moyen" | "Élevé"
   - action_suggeree : 1 phrase actionnable, ou null si rien d'utile à proposer.

E. focus_du_jour : { titre, contenu (5 lignes max) } UNIQUEMENT si un sujet domine clairement la journée. Sinon : null.

F. activite_ansut :
   - publications_count : nombre (fourni dans le contexte)
   - visibilite : "Faible" | "Moyen" | "Fort" (fourni dans le contexte, ne pas recalculer)

ANTI-HALLUCINATION NOMS : si tu mentionnes une personne, utiliser UNIQUEMENT le "RÉFÉRENTIEL PERSONNALITÉS VÉRIFIÉES". Sinon : ne pas nommer.
URLS : copier EXACTEMENT depuis le contexte. Aucune URL inventée. Si pas d'URL fiable, exclure le titre.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check (optional for cron, required for manual trigger)
    const authHeader = req.headers.get('Authorization');
    let isAuthenticated = false;

    if (authHeader?.startsWith('Bearer ')) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (!claimsError && claimsData?.claims) {
        isAuthenticated = true;
      }
    }

    // Parse request body
    let sendEmail = true;
    let previewOnly = false;
    let recipients: string[] = [];
    let freshnessHours = 24; // défaut : 24h

    try {
      const body = await req.json();
      previewOnly = body.previewOnly === true;
      if (body.recipients && Array.isArray(body.recipients)) {
        recipients = body.recipients;
      }
      if (typeof body.freshnessHours === 'number' && [24, 48, 168].includes(body.freshnessHours)) {
        freshnessHours = body.freshnessHours;
      }
    } catch {
      // No body = cron trigger, send to all configured recipients
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch real-time news + titrologie from Perplexity (runs in parallel with DB queries)
    const perplexityPromise = fetchPerplexityNews();
    const titrologiePromise = fetchTitrologie();

    // Fetch articles within freshness window
    // FRESHNESS FIX: filtrer sur date_publication (vraie date de l'article) ET created_at (date d'ingestion)
    // pour exclure les vieux articles récemment ingérés (ex: 2025 ingérés en 2026)
    const yesterday = new Date(Date.now() - freshnessHours * 60 * 60 * 1000).toISOString();
    const freshnessWindow = new Date(Date.now() - (freshnessHours + 24) * 60 * 60 * 1000).toISOString(); // tolérance +24h pour date_publication
    const { data: articlesRaw } = await supabase
      .from('actualites')
      .select('titre, resume, source_nom, source_url, importance, sentiment, impact_ansut, categorie, contenu, date_publication, created_at')
      .gte('created_at', yesterday)
      .order('importance', { ascending: false })
      .limit(50);

    // Filtrer côté code : on garde uniquement les articles dont la date_publication est récente
    // OU absente (fallback sur created_at qui est déjà filtré)
    const articles = (articlesRaw || []).filter(a => {
      if (!a.date_publication) return true; // pas de date pub → on garde (created_at déjà filtré)
      return a.date_publication >= freshnessWindow;
    }).slice(0, 20);

    console.log(`[Matinale/Freshness] window=${freshnessHours}h, ${articlesRaw?.length || 0} articles bruts → ${articles.length} après filtre date_publication`);

    // Fetch ANSUT-specific mentions from mentions table
    const { data: mentions } = await supabase
      .from('mentions')
      .select('contenu, source, source_url, auteur, sentiment, date_mention, est_critique')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(15);

    // Fetch social insights mentioning ANSUT
    const { data: socialInsights } = await supabase
      .from('social_insights')
      .select('contenu, plateforme, auteur, url_original, sentiment, engagement_score, est_critique')
      .gte('created_at', yesterday)
      .order('engagement_score', { ascending: false })
      .limit(15);

    // Fetch critical alerts
    const { data: alertes } = await supabase
      .from('alertes')
      .select('titre, niveau, message')
      .gte('created_at', yesterday)
      .in('niveau', ['critical', 'warning'])
      .limit(5);

    // Fetch verified personnalites as ground truth for names/roles
    const { data: personnalites } = await supabase
      .from('personnalites')
      .select('nom, prenom, fonction, organisation, cercle, categorie')
      .eq('actif', true)
      .order('cercle', { ascending: true })
      .limit(100);

    // Fetch VIP accounts and their recent publications
    const { data: vipComptes } = await supabase
      .from('vip_comptes')
      .select('id, nom, plateforme, identifiant, url_profil')
      .eq('actif', true);

    const { data: recentPubs } = await supabase
      .from('publications_institutionnelles')
      .select('vip_compte_id, date_publication, contenu, plateforme, likes_count, shares_count, comments_count')
      .gte('date_publication', yesterday)
      .not('vip_compte_id', 'is', null)
      .order('date_publication', { ascending: false });

    // Await Perplexity results
    const [perplexityNews, titrologie] = await Promise.all([perplexityPromise, titrologiePromise]);

    // Build accounts activity summary
    const accountsActivity = (vipComptes || []).map(compte => {
      const pubs = (recentPubs || []).filter(p => p.vip_compte_id === compte.id);
      return {
        nom: compte.nom,
        plateforme: compte.plateforme,
        identifiant: compte.identifiant,
        url_profil: compte.url_profil,
        publications_24h: pubs.length,
        total_engagement: pubs.reduce((s, p) => s + (p.likes_count || 0) + (p.shares_count || 0) + (p.comments_count || 0), 0),
        derniere_pub: pubs[0] || null,
      };
    });

    console.log('[Matinale] Accounts activity:', accountsActivity.length, 'comptes,', (recentPubs || []).length, 'pubs 24h,', titrologie.length, 'titres presse');

    // Also filter articles that specifically mention ANSUT
    const ansutKeywords = ['ansut', 'service universel', 'télécommunications'];
    const ansutArticles = (articles || []).filter(a => {
      const text = `${a.titre} ${a.resume || ''} ${a.contenu || ''} ${a.impact_ansut || ''}`.toLowerCase();
      return ansutKeywords.some(kw => text.includes(kw));
    });

    // ============= MODE FUSIONNER INTELLIGEMMENT =============
    // Unifie articles DB + Perplexity + mentions ANSUT et déduplique transversalement.
    const allItems: ActuLike[] = [
      ...(articles || []).map(a => ({
        titre: a.titre,
        resume: a.resume,
        source_nom: a.source_nom,
        source_url: a.source_url,
        importance: a.importance,
        sentiment: a.sentiment,
        impact_ansut: a.impact_ansut,
        origin: 'db' as const,
      })),
      ...perplexityNews.articles.map(a => ({
        titre: a.titre,
        resume: a.resume,
        source_nom: a.source,
        source_url: a.url,
        importance: 60,
        origin: 'perplexity' as const,
      })),
    ];
    const consolidated = consolidateActualites(allItems);
    const dupGroups = consolidated.filter(g => g.members.length > 1).length;
    const consolidatedList = consolidated.length > 0
      ? formatConsolidatedForPrompt(consolidated)
      : 'Aucune actualité disponible.';

    console.log('[Matinale] Fusion intelligente:', allItems.length, 'items →', consolidated.length, 'faits uniques (', dupGroups, 'doublons fusionnés)');

    const ansutArticlesList = ansutArticles.length > 0
      ? ansutArticles.map((a, i) =>
          `[A${i+1}] "${a.titre}" (source: ${a.source_nom || 'inconnue'}, url: ${a.source_url || 'N/A'}, sentiment: ${a.sentiment ?? 'N/A'}, résumé: ${a.resume || 'N/A'})`
        ).join('\n')
      : 'Aucun article ne mentionne directement l\'ANSUT dans les dernières 24h.';

    const mentionsList = (mentions || []).length > 0
      ? (mentions || []).map((m, i) =>
          `[M${i+1}] "${m.contenu?.substring(0, 200)}" (source: ${m.source || 'inconnue'}, url: ${m.source_url || 'N/A'}, auteur: ${m.auteur || 'N/A'}, sentiment: ${m.sentiment ?? 'N/A'}, critique: ${m.est_critique ? 'OUI' : 'non'})`
        ).join('\n')
      : 'Aucune mention directe détectée.';

    const socialList = (socialInsights || []).length > 0
      ? (socialInsights || []).map((s, i) =>
          `[S${i+1}] [${s.plateforme}] "${s.contenu?.substring(0, 200)}" (auteur: ${s.auteur || 'N/A'}, url: ${s.url_original || 'N/A'}, engagement: ${s.engagement_score}, sentiment: ${s.sentiment ?? 'N/A'}, critique: ${s.est_critique ? 'OUI' : 'non'})`
        ).join('\n')
      : 'Aucun insight social récent.';

    const alertesList = (alertes || []).length > 0
      ? `\n\nAlertes actives:\n${alertes!.map(a => `⚠️ ${a.titre}: ${a.message || ''}`).join('\n')}`
      : '';

    // Activité ANSUT (publications + engagement)
    const ansutPubsCount = (recentPubs || []).length;
    const ansutTotalEngagement = (recentPubs || []).reduce((s, p) => s + (p.likes_count || 0) + (p.shares_count || 0) + (p.comments_count || 0), 0);
    const ansutVisibilite = ansutPubsCount >= 5 ? 'Fort' : ansutPubsCount >= 2 ? 'Moyen' : 'Faible';

    // Build personnalites reference list
    const personnalitesRef = (personnalites || []).length > 0
      ? (personnalites || []).map(p => {
          const fonction = p.fonction || 'N/A';
          const isAncien = fonction.toLowerCase().startsWith('ancien');
          return `- ${p.prenom || ''} ${p.nom} : ${fonction} @ ${p.organisation || 'N/A'} (cercle ${p.cercle})${isAncien ? ' ⚠️ N\'EST PLUS EN POSTE' : ''}`;
        }).join('\n')
      : 'Aucune personnalité enregistrée.';

    const context = `=== ACTUALITÉS CONSOLIDÉES (${consolidated.length} faits uniques, ${dupGroups} doublon(s) fusionné(s) entre base + Perplexity) ===
Une seule référence [N] par fait, toutes les sources listées par groupe.
${consolidatedList}

=== MENTIONS DIRECTES ANSUT (articles citant l'ANSUT) ===
${ansutArticlesList}

=== MENTIONS MÉDIAS ANSUT (table mentions) ===
${mentionsList}

=== MENTIONS SOCIALES ANSUT (réseaux sociaux) ===
${socialList}${alertesList}

=== RÉFÉRENTIEL PERSONNALITÉS VÉRIFIÉES (source de vérité) ===
${personnalitesRef}
RÈGLES ABSOLUES SUR LES PERSONNALITÉS :
1. Si tu mentionnes une personne (nom, titre, fonction), tu DOIS utiliser UNIQUEMENT les informations de ce référentiel. Ne JAMAIS inventer ou deviner un nom ou une fonction qui ne figure pas dans cette liste.
2. Les personnes marquées "Ancien(ne)" ou "⚠️ N'EST PLUS EN POSTE" ne doivent JAMAIS être présentées comme occupant encore leur fonction. Utilise le préfixe "Ancien" systématiquement.
3. Ne JAMAIS attribuer un poste ministériel ou une fonction officielle à quelqu'un sans vérifier dans ce référentiel.`;

    console.log('[Matinale] Generating with', (articles || []).length, 'DB articles,', perplexityNews.articles.length, 'Perplexity articles,', ansutArticles.length, 'ANSUT articles,', (mentions || []).length, 'mentions,', (socialInsights || []).length, 'social insights');

    // Call AI — Using GPT-5 (OpenAI) via Lovable AI Gateway for structured generation
    // GPT-5 follows instructions much more strictly than Gemini, reducing hallucinations
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: MATINALE_PROMPT },
          { role: 'user', content: context },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_matinale',
            description: 'Generate the structured morning briefing for the Com team',
            parameters: {
              type: 'object',
              properties: {
                flash_info: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      titre: { type: 'string' },
                      resume: { type: 'string' },
                      source: { type: 'string' },
                      source_url: { type: 'string', description: "URL réelle de l'article source, depuis le contexte fourni" },
                    },
                    required: ['titre', 'resume', 'source', 'source_url'],
                  },
                },
                veille_reputation: {
                  type: 'object',
                  properties: {
                    resume: { type: 'string', description: "Analyse basée UNIQUEMENT sur les mentions directes de l'ANSUT" },
                    tonalite: { type: 'string', enum: ['positif', 'neutre', 'negatif'] },
                    mentions_cles: { type: 'array', items: { type: 'string' } },
                    preuves: {
                      type: 'array',
                      description: "Articles/mentions qui citent EXPLICITEMENT l'ANSUT avec URL EXACTE du contexte et extrait mentionnant l'ANSUT",
                      items: {
                        type: 'object',
                        properties: {
                          titre: { type: 'string', description: "Titre EXACT de l'article/mention du contexte" },
                          source: { type: 'string' },
                          url: { type: 'string', description: "URL EXACTE copiée du contexte, NE JAMAIS inventer" },
                          extrait: { type: 'string', description: "Citation EXACTE mentionnant l'ANSUT" },
                          sentiment_article: { type: 'string', enum: ['positif', 'neutre', 'negatif'] },
                        },
                        required: ['titre', 'source', 'url', 'extrait', 'sentiment_article'],
                      },
                    },
                  },
                  required: ['resume', 'tonalite', 'mentions_cles', 'preuves'],
                },
                pret_a_poster: {
                  type: 'object',
                  properties: {
                    linkedin: { type: 'string' },
                    x_post: { type: 'string', description: 'Tweet max 280 characters with hashtags' },
                    angle: { type: 'string' },
                  },
                  required: ['linkedin', 'x_post', 'angle'],
                },
              },
              required: ['flash_info', 'veille_reputation', 'pret_a_poster'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_matinale' } },
        // Note: GPT-5 does not support custom temperature parameter
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error('[Matinale] AI error:', status, errText);
      if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('[Matinale] No tool call in response:', JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: 'AI did not return structured data' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const matinale = JSON.parse(toolCall.function.arguments);
    console.log('[Matinale] Generated successfully');

    // Post-process: Build sets of valid data for verification
    const validUrls = new Set<string>();
    for (const a of (articles || [])) { if (a.source_url) validUrls.add(a.source_url); }
    for (const m of (mentions || [])) { if (m.source_url) validUrls.add(m.source_url); }
    for (const s of (socialInsights || [])) { if (s.url_original) validUrls.add(s.url_original); }
    for (const p of perplexityNews.articles) { if (p.url) validUrls.add(p.url); }
    for (const c of perplexityNews.citations) { validUrls.add(c); }

    // Post-process: filter out preuves with invalid/invented URLs
    if (matinale.veille_reputation?.preuves) {
      matinale.veille_reputation.preuves = matinale.veille_reputation.preuves.filter((p: any) => {
        if (!p.url || p.url === 'N/A' || p.url === '') return false;
        return validUrls.has(p.url);
      });
    }

    // Post-process: ANTI-HALLUCINATION — scrub names/titles not in référentiel
    const knownNames = new Set<string>();
    const knownFullEntries: Array<{ prenom: string; nom: string; fonction: string }> = [];
    for (const p of (personnalites || [])) {
      const nom = (p.nom || '').trim().toLowerCase();
      const prenom = (p.prenom || '').trim().toLowerCase();
      if (nom) knownNames.add(nom);
      if (prenom && nom) knownNames.add(`${prenom} ${nom}`);
      knownFullEntries.push({ prenom: prenom, nom: nom, fonction: p.fonction || '' });
    }

    // Check generated text for "ministre" references not in référentiel
    const sanitizeMinisterReferences = (text: string): string => {
      // Match patterns like "ministre [Name]" or "[Name], ministre de..."
      const ministerPattern = /(?:ministre\s+(?:de\s+(?:la\s+|l[''])?)?(?:\w+\s+)*?)(\b[A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/gi;
      return text.replace(ministerPattern, (match) => {
        // Extract capitalized words (potential names)
        const nameWords = match.match(/\b[A-ZÀ-Ü][a-zà-ü]{2,}\b/g) || [];
        const hasKnownName = nameWords.some(w => {
          const lower = w.toLowerCase();
          return knownNames.has(lower) || 
            knownFullEntries.some(e => e.nom === lower || e.prenom === lower);
        });
        if (!hasKnownName && nameWords.length > 0) {
          console.warn(`[Matinale/AntiHallucination] Scrubbed unknown minister reference: "${match}"`);
          return 'le ministère de tutelle';
        }
        return match;
      });
    };

    // Sanitize all text fields in the matinale output
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') return sanitizeMinisterReferences(obj);
      if (Array.isArray(obj)) return obj.map(sanitizeObject);
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [k, v] of Object.entries(obj)) result[k] = sanitizeObject(v);
        return result;
      }
      return obj;
    };
    
    const sanitizedMatinale = sanitizeObject(matinale);
    // Replace matinale fields with sanitized versions
    Object.assign(matinale, sanitizedMatinale);

    // Generate HTML email
    const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const tonaliteColor = matinale.veille_reputation.tonalite === 'positif' ? '#10b981'
      : matinale.veille_reputation.tonalite === 'negatif' ? '#ef4444' : '#f59e0b';
    const tonaliteLabel = matinale.veille_reputation.tonalite === 'positif' ? '✅ Positif'
      : matinale.veille_reputation.tonalite === 'negatif' ? '🔴 Négatif' : '🟡 Neutre';

    // Group titrologie by type
    const titroNationale = titrologie.filter(t => t.type === 'nationale');
    const titroEnLigne = titrologie.filter(t => t.type === 'en_ligne');
    const titroEco = titrologie.filter(t => t.type === 'economique');

    const buildTitroSection = (titres: typeof titrologie, label: string, icon: string) => {
      if (titres.length === 0) return '';
      return `
      <div style="margin-bottom:12px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#1e3a5f;">${icon} ${label}</p>
        ${titres.map(t => `
        <div style="margin-bottom:8px;padding:8px 10px;background:#ffffff;border-radius:6px;border-left:3px solid #6366f1;">
          <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#6366f1;">${t.journal}</p>
          <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#1e3a5f;">${t.titre}</p>
          ${t.resume ? `<p style="margin:0 0 2px;font-size:12px;color:#6b7280;">${t.resume}</p>` : ''}
          ${t.url ? `<p style="margin:0;font-size:11px;"><a href="${t.url}" style="color:#2563eb;text-decoration:underline;" target="_blank">Lire →</a></p>` : ''}
        </div>`).join('')}
      </div>`;
    };

    const titrologieHtml = titrologie.length > 0 ? `
<tr><td style="padding:0 24px 24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid #6366f1;padding-bottom:8px;">📰 Revue de Presse — Titrologie du jour</h2>
  <div style="padding:16px;background-color:#f0f0ff;border-radius:8px;">
    <p style="margin:0 0 12px;font-size:12px;color:#6b7280;">${titrologie.length} titre${titrologie.length > 1 ? 's' : ''} — ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    ${buildTitroSection(titroNationale, 'Presse Nationale', '🗞️')}
    ${buildTitroSection(titroEnLigne, 'Presse en Ligne', '🌐')}
    ${buildTitroSection(titroEco, 'Presse Économique & Tech', '📊')}
  </div>
</td></tr>` : '';

    const htmlEmail = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;text-align:center;">
  <h1 style="color:#ffffff;margin:0;font-size:24px;">📰 La Matinale ANSUT</h1>
  <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">${dateStr}</p>
</td></tr>
${titrologieHtml}
<tr><td style="padding:24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid #2563eb;padding-bottom:8px;">⚡ Flash Info</h2>
  ${matinale.flash_info.map((item: any) => `
  <div style="margin-bottom:16px;padding:12px;background-color:#f0f9ff;border-radius:8px;border-left:4px solid #2563eb;">
    <p style="margin:0 0 4px;font-weight:bold;color:#1e3a5f;font-size:14px;">${item.titre}</p>
    <p style="margin:0 0 4px;color:#374151;font-size:13px;">${item.resume}</p>
    <p style="margin:0;color:#6b7280;font-size:11px;">Source : ${item.source}${item.source_url ? ` — <a href="${item.source_url}" style="color:#2563eb;text-decoration:underline;" target="_blank">Lire →</a>` : ''}</p>
  </div>`).join('')}
</td></tr>
<tr><td style="padding:0 24px 24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid #6366f1;padding-bottom:8px;">📊 Activité des Comptes Sociaux (24h)</h2>
  ${accountsActivity.length > 0 ? `
  <p style="margin:0 0 12px;font-size:13px;color:#374151;">
    <strong>${(recentPubs || []).length}</strong> publication${(recentPubs || []).length !== 1 ? 's' : ''} détectée${(recentPubs || []).length !== 1 ? 's' : ''} sur <strong>${accountsActivity.length}</strong> compte${accountsActivity.length !== 1 ? 's' : ''} suivis
    ${accountsActivity.filter(a => a.publications_24h === 0).length > 0 ? ` — <span style="color:#ef4444;font-weight:bold;">⚠ ${accountsActivity.filter(a => a.publications_24h === 0).length} inactif${accountsActivity.filter(a => a.publications_24h === 0).length > 1 ? 's' : ''}</span>` : ''}
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  ${accountsActivity.map(a => {
    const platformIcon = a.plateforme === 'linkedin' ? '🔵' : a.plateforme === 'facebook' ? '📘' : a.plateforme === 'twitter' || a.plateforme === 'x' ? '🐦' : '🌐';
    const statusColor = a.publications_24h > 0 ? '#10b981' : '#ef4444';
    const statusLabel = a.publications_24h > 0 ? `✅ ${a.publications_24h} pub${a.publications_24h > 1 ? 's' : ''}` : '❌ 0 publication';
    return `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;">
        <span style="font-size:14px;">${platformIcon}</span>
        <span style="font-size:13px;font-weight:600;color:#1e3a5f;margin-left:6px;">${a.nom}</span>
        <span style="font-size:11px;color:#9ca3af;margin-left:4px;">@${a.identifiant}</span>
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;color:${statusColor};background-color:${a.publications_24h > 0 ? '#ecfdf5' : '#fef2f2'};">${statusLabel}</span>
        ${a.total_engagement > 0 ? `<span style="font-size:10px;color:#6b7280;margin-left:6px;">💬 ${a.total_engagement}</span>` : ''}
      </td>
    </tr>`;
  }).join('')}
  </table>` : `
  <div style="padding:12px;background:#fff7ed;border-radius:6px;border:1px dashed #f59e0b;">
    <p style="margin:0;font-size:12px;color:#92400e;">⚠️ Aucun compte VIP actif configuré.</p>
  </div>`}
</td></tr>
<tr><td style="padding:0 24px 24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid ${tonaliteColor};padding-bottom:8px;">🎯 Veille Réputation ANSUT ${tonaliteLabel}</h2>
  <div style="padding:16px;background-color:#fefce8;border-radius:8px;">
    <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">${matinale.veille_reputation.resume}</p>
    ${(matinale.veille_reputation.preuves || []).length > 0 ? `
    <div style="margin:12px 0;border-top:1px solid #e5e7eb;padding-top:12px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#1e3a5f;">📎 Preuves — Articles mentionnant l'ANSUT :</p>
      ${(matinale.veille_reputation.preuves || []).map((p: any) => {
        const sColor = p.sentiment_article === 'positif' ? '#10b981' : p.sentiment_article === 'negatif' ? '#ef4444' : '#f59e0b';
        return `
      <div style="margin-bottom:8px;padding:10px;background:#ffffff;border-radius:6px;border-left:3px solid ${sColor};">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1e3a5f;">${p.titre}</p>
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-style:italic;">« ${p.extrait} »</p>
        <p style="margin:0;font-size:11px;">
          <span style="color:#6b7280;">Source : ${p.source}</span>
          ${p.url ? ` — <a href="${p.url}" style="color:#2563eb;text-decoration:underline;" target="_blank">Voir l'article →</a>` : ''}
        </p>
      </div>`;
      }).join('')}
    </div>` : `
    <div style="margin:12px 0;padding:10px;background:#fff7ed;border-radius:6px;border:1px dashed #f59e0b;">
      <p style="margin:0;font-size:12px;color:#92400e;">ℹ️ Aucune mention directe de l'ANSUT détectée dans les médias sur les dernières 24h.</p>
    </div>`}
    ${matinale.veille_reputation.mentions_cles.length > 0 ? `
    <p style="margin:0;font-size:12px;color:#6b7280;">Mentions clés : ${matinale.veille_reputation.mentions_cles.map((m: string) => `<span style="display:inline-block;background:#e5e7eb;padding:2px 8px;border-radius:12px;margin:2px;font-size:11px;">${m}</span>`).join(' ')}</p>` : ''}
  </div>
</td></tr>
<tr><td style="padding:0 24px 24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid #8b5cf6;padding-bottom:8px;">📝 Prêt-à-Poster LinkedIn</h2>
  <div style="padding:16px;background-color:#f5f3ff;border-radius:8px;border:1px dashed #8b5cf6;">
    <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;white-space:pre-line;">${matinale.pret_a_poster.linkedin}</p>
    <p style="margin:0;font-size:12px;color:#7c3aed;font-style:italic;">💡 Angle : ${matinale.pret_a_poster.angle}</p>
  </div>
</td></tr>
<tr><td style="padding:0 24px 24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid #1d9bf0;padding-bottom:8px;">🐦 Prêt-à-Poster X (Twitter)</h2>
  <div style="padding:16px;background-color:#f0f9ff;border-radius:8px;border:1px dashed #1d9bf0;">
    <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">${matinale.pret_a_poster.x_post || ''}</p>
    <p style="margin:0;font-size:11px;color:#6b7280;">${(matinale.pret_a_poster.x_post || '').length}/280 caractères</p>
  </div>
</td></tr>
<tr><td style="background-color:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="margin:0;color:#9ca3af;font-size:11px;">ANSUT RADAR — Veille Stratégique & Communication</p>
  <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">Généré à partir de ${(articles || []).length} articles DB + ${perplexityNews.articles.length} articles temps réel + ${titrologie.length} titres presse, ${(mentions || []).length} mentions, ${(socialInsights || []).length} insights sociaux, ${accountsActivity.length} comptes suivis</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    // Compute freshness metadata for UI transparency
    const oldestPub = articles.reduce<string | null>((acc, a) => {
      if (!a.date_publication) return acc;
      if (!acc || a.date_publication < acc) return a.date_publication;
      return acc;
    }, null);
    const newestPub = articles.reduce<string | null>((acc, a) => {
      if (!a.date_publication) return acc;
      if (!acc || a.date_publication > acc) return a.date_publication;
      return acc;
    }, null);
    const freshnessMeta = {
      window_hours: freshnessHours,
      based_on: 'date_publication',
      articles_total_raw: articlesRaw?.length || 0,
      articles_kept: articles.length,
      oldest_publication: oldestPub,
      newest_publication: newestPub,
    };

    if (previewOnly) {
      return new Response(JSON.stringify({
        matinale, titrologie, html: htmlEmail, articles_count: (articles || []).length, perplexity_articles_count: perplexityNews.articles.length, accounts_activity: accountsActivity, generated_at: new Date().toISOString(), freshness: freshnessMeta,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get recipients
    if (recipients.length === 0) {
      const { data: destData } = await supabase
        .from('newsletter_destinataires')
        .select('email')
        .eq('actif', true);
      recipients = (destData || []).map(d => d.email);
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({
        matinale, titrologie, html: htmlEmail, warning: 'Aucun destinataire configuré', articles_count: (articles || []).length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[Matinale] Sending to ${recipients.length} recipients`);

    const subject = `📰 La Matinale ANSUT — ${dateStr}`;
    let successCount = 0;
    let failCount = 0;

    for (const email of recipients) {
      try {
        const res = await sendViaGateway(email, subject, htmlEmail);
        if (res.ok) {
          await res.text();
          successCount++;
        } else {
          failCount++;
          console.error(`[Matinale] Failed for ${email}:`, await res.text());
        }
      } catch (e) {
        failCount++;
        console.error(`[Matinale] Error for ${email}:`, e);
      }
    }

    // Log the diffusion
    await supabase.from('diffusion_logs').insert({
      canal: 'email', contenu_type: 'matinale', destinataires_count: recipients.length, succes_count: successCount, echec_count: failCount, message: subject,
    });

    console.log(`[Matinale] Sent: ${successCount}, Failed: ${failCount}`);

    return new Response(JSON.stringify({
      matinale, titrologie, sent: successCount, failed: failCount, articles_count: (articles || []).length, perplexity_articles_count: perplexityNews.articles.length, generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[Matinale] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
