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

    const context = `=== ACTUALITÉS CONSOLIDÉES (${consolidated.length} faits uniques, ${dupGroups} doublon(s) fusionné(s)) ===
Une seule référence [N] par fait, toutes les sources listées par groupe.
${consolidatedList}

=== MENTIONS DIRECTES ANSUT (articles citant l'ANSUT) ===
${ansutArticlesList}

=== MENTIONS MÉDIAS ANSUT (table mentions) ===
${mentionsList}

=== MENTIONS SOCIALES ANSUT (réseaux sociaux) ===
${socialList}${alertesList}

=== ACTIVITÉ ANSUT (24h) — à reporter tel quel ===
- publications_count : ${ansutPubsCount}
- visibilite : ${ansutVisibilite}

=== FENÊTRE DE VEILLE ===
- Fenêtre demandée : ${freshnessHours}h
- Articles bruts analysés : ${articlesRaw?.length || 0}
- Articles retenus après filtre fraîcheur : ${articles.length}

=== RÉFÉRENTIEL PERSONNALITÉS VÉRIFIÉES (source de vérité) ===
${personnalitesRef}
RÈGLES ABSOLUES SUR LES PERSONNALITÉS :
1. Si tu mentionnes une personne (nom, titre, fonction), tu DOIS utiliser UNIQUEMENT les informations de ce référentiel.
2. Les personnes marquées "Ancien(ne)" ou "⚠️ N'EST PLUS EN POSTE" : utiliser le préfixe "Ancien" systématiquement.
3. Ne JAMAIS attribuer un poste à quelqu'un sans vérifier dans ce référentiel.`;

    console.log('[Matinale] Generating CODIR with', (articles || []).length, 'DB articles,', perplexityNews.articles.length, 'Perplexity,', ansutArticles.length, 'ANSUT,', (mentions || []).length, 'mentions');

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
            name: 'generate_matinale_codir',
            description: 'Génère la Matinale CODIR ANSUT au format strict (sections B→F)',
            parameters: {
              type: 'object',
              properties: {
                revue_de_presse: {
                  type: 'array',
                  description: '8 à 15 titres MAX, triés par rubrique, sans analyse',
                  items: {
                    type: 'object',
                    properties: {
                      titre: { type: 'string', description: 'Titre EXACT de l\'article' },
                      source: { type: 'string' },
                      date: { type: 'string', description: 'AAAA-MM-JJ' },
                      url: { type: 'string', description: 'URL EXACTE depuis le contexte, valide' },
                      rubrique: {
                        type: 'string',
                        enum: ['telecom_numerique', 'economie_finance', 'gouvernance_regulation', 'international'],
                      },
                    },
                    required: ['titre', 'source', 'date', 'url', 'rubrique'],
                  },
                },
                a_retenir: {
                  type: 'array',
                  description: 'Maximum 3 phrases courtes factuelles',
                  items: { type: 'string' },
                },
                retour_ansut: {
                  type: 'object',
                  properties: {
                    lecture_service_universel: {
                      type: 'object',
                      properties: {
                        acces: { type: ['string', 'null'] },
                        usages: { type: ['string', 'null'] },
                        impact: { type: ['string', 'null'] },
                      },
                      required: ['acces', 'usages', 'impact'],
                    },
                    implication_ansut: { type: ['string', 'null'], description: '2 lignes max ou null' },
                    niveau_attention: { type: 'string', enum: ['Faible', 'Moyen', 'Élevé'] },
                    action_suggeree: { type: ['string', 'null'] },
                  },
                  required: ['lecture_service_universel', 'implication_ansut', 'niveau_attention', 'action_suggeree'],
                },
                focus_du_jour: {
                  type: ['object', 'null'],
                  description: 'UNIQUEMENT si un sujet domine clairement, sinon null',
                  properties: {
                    titre: { type: 'string' },
                    contenu: { type: 'string', description: '5 lignes max' },
                  },
                },
                activite_ansut: {
                  type: 'object',
                  properties: {
                    publications_count: { type: 'number' },
                    visibilite: { type: 'string', enum: ['Faible', 'Moyen', 'Fort'] },
                  },
                  required: ['publications_count', 'visibilite'],
                },
              },
              required: ['revue_de_presse', 'a_retenir', 'retour_ansut', 'activite_ansut'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_matinale_codir' } },
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

    // Post-process: filtrer la revue_de_presse — exiger URLs valides du contexte + 8 à 15 max
    if (Array.isArray(matinale.revue_de_presse)) {
      matinale.revue_de_presse = matinale.revue_de_presse
        .filter((r: any) => r?.url && r.url !== 'N/A' && validUrls.has(r.url))
        .slice(0, 15);
    } else {
      matinale.revue_de_presse = [];
    }

    // Cap "à retenir" à 3 items
    if (Array.isArray(matinale.a_retenir)) {
      matinale.a_retenir = matinale.a_retenir.slice(0, 3);
    } else {
      matinale.a_retenir = [];
    }

    // Forcer activite_ansut à utiliser les vraies métriques (jamais l'IA)
    matinale.activite_ansut = {
      publications_count: ansutPubsCount,
      visibilite: ansutVisibilite,
    };

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

    // Generate HTML email — TEMPLATE MATINALE CODIR (PROD)
    const generatedAtUtc = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const RUBRIQUE_LABELS: Record<string, string> = {
      telecom_numerique: 'Télécom / Numérique',
      economie_finance: 'Économie / Finance',
      gouvernance_regulation: 'Gouvernance / Régulation',
      international: 'International',
    };
    const RUBRIQUE_ORDER = ['telecom_numerique', 'economie_finance', 'gouvernance_regulation', 'international'];

    const revue = matinale.revue_de_presse as Array<{ titre: string; source: string; date: string; url: string; rubrique: string }>;
    const aRetenir = matinale.a_retenir as string[];
    const ra = matinale.retour_ansut;
    const focus = matinale.focus_du_jour;
    const act = matinale.activite_ansut;

    const niveauColor = ra?.niveau_attention === 'Élevé' ? '#ef4444'
      : ra?.niveau_attention === 'Moyen' ? '#f59e0b' : '#10b981';

    // Indicateur qualité (G)
    const qualiteScore = revue.length >= 8 ? 'Bonne' : revue.length >= 4 ? 'Moyenne' : 'Faible';
    const qualiteColor = qualiteScore === 'Bonne' ? '#10b981' : qualiteScore === 'Moyenne' ? '#f59e0b' : '#ef4444';

    // Group revue by rubrique
    const groupedRevue: Record<string, typeof revue> = {};
    for (const r of revue) {
      if (!groupedRevue[r.rubrique]) groupedRevue[r.rubrique] = [];
      groupedRevue[r.rubrique].push(r);
    }

    const buildRubriqueBlock = (key: string) => {
      const items = groupedRevue[key];
      if (!items || items.length === 0) return '';
      return `
      <div style="margin-bottom:14px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.5px;">${RUBRIQUE_LABELS[key]}</p>
        ${items.map(it => `
        <div style="margin-bottom:6px;padding:8px 10px;background:#ffffff;border-radius:6px;border-left:3px solid #2563eb;">
          <p style="margin:0 0 2px;font-size:13px;color:#1e3a5f;line-height:1.4;"><strong>${it.titre}</strong></p>
          <p style="margin:0;font-size:11px;color:#6b7280;">${it.source} (${it.date}) — <a href="${it.url}" style="color:#2563eb;text-decoration:underline;" target="_blank">URL →</a></p>
        </div>`).join('')}
      </div>`;
    };

    const allUrlsTraceability = revue.map(r => r.url).filter(Boolean);

    const htmlEmail = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">

<!-- A. EN-TÊTE -->
<tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 30px;">
  <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.3px;">Matinale CODIR – ANSUT</h1>
  <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">${dateStr}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
    <tr>
      <td style="font-size:11px;color:#dbeafe;">Génération (UTC) : <strong>${generatedAtUtc}</strong></td>
      <td style="font-size:11px;color:#dbeafe;text-align:right;">Fenêtre : <strong>${freshnessHours}h</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="font-size:11px;color:#dbeafe;padding-top:4px;">Sources retenues : <strong>${revue.length}</strong> / Articles analysés : <strong>${articlesRaw?.length || 0}</strong></td>
    </tr>
  </table>
</td></tr>

<!-- B. REVUE DE PRESSE -->
<tr><td style="padding:24px;">
  <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 14px;border-bottom:2px solid #2563eb;padding-bottom:6px;">B. Revue de presse</h2>
  ${revue.length === 0 ? '<p style="font-size:13px;color:#6b7280;font-style:italic;">Aucun titre vérifié sur la fenêtre de veille.</p>' :
    RUBRIQUE_ORDER.map(buildRubriqueBlock).join('')}
</td></tr>

<!-- C. À RETENIR -->
<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 12px;border-bottom:2px solid #6366f1;padding-bottom:6px;">C. À retenir aujourd'hui</h2>
  ${aRetenir.length === 0 ? '<p style="font-size:13px;color:#6b7280;font-style:italic;">—</p>' : `
  <ul style="margin:0;padding-left:20px;">
    ${aRetenir.map(p => `<li style="margin:0 0 6px;font-size:13px;color:#1e3a5f;line-height:1.5;">${p}</li>`).join('')}
  </ul>`}
</td></tr>

<!-- D. RETOUR ANSUT -->
<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 12px;border-bottom:2px solid #8b5cf6;padding-bottom:6px;">D. Retour ANSUT</h2>
  <div style="padding:14px;background-color:#faf5ff;border-radius:8px;">

    ${(ra?.lecture_service_universel?.acces || ra?.lecture_service_universel?.usages || ra?.lecture_service_universel?.impact) ? `
    <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#6b21a8;">D1. Lecture Service Universel</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
      ${ra.lecture_service_universel.acces ? `<tr><td style="font-size:12px;color:#6b7280;width:70px;padding:2px 0;"><strong>Accès :</strong></td><td style="font-size:13px;color:#1e3a5f;padding:2px 0;">${ra.lecture_service_universel.acces}</td></tr>` : ''}
      ${ra.lecture_service_universel.usages ? `<tr><td style="font-size:12px;color:#6b7280;width:70px;padding:2px 0;"><strong>Usages :</strong></td><td style="font-size:13px;color:#1e3a5f;padding:2px 0;">${ra.lecture_service_universel.usages}</td></tr>` : ''}
      ${ra.lecture_service_universel.impact ? `<tr><td style="font-size:12px;color:#6b7280;width:70px;padding:2px 0;"><strong>Impact :</strong></td><td style="font-size:13px;color:#1e3a5f;padding:2px 0;">${ra.lecture_service_universel.impact}</td></tr>` : ''}
    </table>` : ''}

    ${ra?.implication_ansut ? `
    <p style="margin:8px 0 4px;font-size:12px;font-weight:bold;color:#6b21a8;">D2. Implication ANSUT</p>
    <p style="margin:0 0 10px;font-size:13px;color:#1e3a5f;line-height:1.5;">${ra.implication_ansut}</p>` : ''}

    <p style="margin:8px 0 4px;font-size:12px;font-weight:bold;color:#6b21a8;">D3. Niveau d'attention</p>
    <p style="margin:0 0 10px;"><span style="display:inline-block;padding:4px 12px;border-radius:14px;font-size:12px;font-weight:700;color:#ffffff;background:${niveauColor};">${ra?.niveau_attention || 'Faible'}</span></p>

    ${ra?.action_suggeree ? `
    <p style="margin:8px 0 4px;font-size:12px;font-weight:bold;color:#6b21a8;">D4. Action suggérée</p>
    <p style="margin:0;font-size:13px;color:#1e3a5f;line-height:1.5;">${ra.action_suggeree}</p>` : ''}

  </div>
</td></tr>

<!-- E. FOCUS DU JOUR (optionnel) -->
${focus && focus.titre ? `
<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 12px;border-bottom:2px solid #f59e0b;padding-bottom:6px;">E. Focus du jour</h2>
  <div style="padding:14px;background-color:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b;">
    <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#92400e;">${focus.titre}</p>
    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.5;white-space:pre-line;">${focus.contenu}</p>
  </div>
</td></tr>` : ''}

<!-- F. ACTIVITÉ ANSUT -->
<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 12px;border-bottom:2px solid #10b981;padding-bottom:6px;">F. Activité ANSUT</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;">
    <tr>
      <td style="padding:12px;font-size:13px;color:#1e3a5f;"><strong>Publications :</strong> ${act.publications_count}</td>
      <td style="padding:12px;font-size:13px;color:#1e3a5f;text-align:right;"><strong>Visibilité :</strong> <span style="color:${act.visibilite === 'Fort' ? '#10b981' : act.visibilite === 'Moyen' ? '#f59e0b' : '#ef4444'};font-weight:700;">${act.visibilite}</span></td>
    </tr>
  </table>
</td></tr>

<!-- G. TRAÇABILITÉ -->
<tr><td style="padding:0 24px 24px;">
  <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 12px;border-bottom:2px solid #6b7280;padding-bottom:6px;">G. Traçabilité</h2>
  <div style="padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 6px;font-size:11px;color:#6b7280;"><strong>Timestamp collecte :</strong> ${generatedAtUtc}</p>
    <p style="margin:0 0 6px;font-size:11px;color:#6b7280;"><strong>Indicateur qualité :</strong> <span style="color:${qualiteColor};font-weight:700;">${qualiteScore}</span> (${revue.length} sources retenues sur ${articlesRaw?.length || 0} analysées)</p>
    ${allUrlsTraceability.length > 0 ? `
    <p style="margin:8px 0 4px;font-size:11px;font-weight:bold;color:#374151;">URLs utilisées :</p>
    <ol style="margin:0;padding-left:18px;">
      ${allUrlsTraceability.map(u => `<li style="font-size:10px;color:#6b7280;line-height:1.4;word-break:break-all;"><a href="${u}" style="color:#2563eb;text-decoration:none;" target="_blank">${u}</a></li>`).join('')}
    </ol>` : ''}
  </div>
</td></tr>

<tr><td style="background-color:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="margin:0;color:#9ca3af;font-size:10px;">ANSUT RADAR — Matinale CODIR — Document interne</p>
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
    const totalRaw = articlesRaw?.length || 0;
    const droppedCount = Math.max(0, totalRaw - articles.length);
    const dropRatePct = totalRaw > 0 ? Math.round((droppedCount / totalRaw) * 100) : 0;

    // Charger les seuils d'alerte fraîcheur
    let alertThresholdPct = 40;
    let alertMinRaw = 5;
    try {
      const { data: cfgRows } = await supabase
        .from('config_seuils')
        .select('cle, valeur')
        .in('cle', ['freshness_alert_drop_rate_pct', 'freshness_alert_min_raw_articles']);
      for (const r of cfgRows || []) {
        if (r.cle === 'freshness_alert_drop_rate_pct' && typeof r.valeur === 'number') alertThresholdPct = r.valeur;
        if (r.cle === 'freshness_alert_min_raw_articles' && typeof r.valeur === 'number') alertMinRaw = r.valeur;
      }
    } catch (e) {
      console.warn('[Matinale/Freshness] config_seuils unreadable, using defaults', e);
    }

    let alertTriggered = false;
    if (totalRaw >= alertMinRaw && dropRatePct >= alertThresholdPct && !previewOnly) {
      try {
        await supabase.from('alertes').insert({
          type: 'freshness_degraded',
          niveau: dropRatePct >= 70 ? 'critique' : 'attention',
          titre: `Matinale : ${dropRatePct}% d'articles écartés (trop anciens)`,
          message: `Sur ${totalRaw} articles ingérés (${freshnessHours}h), ${droppedCount} ont été écartés car leur date de publication dépasse la fenêtre. Seuls ${articles.length} articles frais ont alimenté la Matinale. Vérifiez la qualité des sources ou ajustez les paramètres dans /admin/freshness.`,
          reference_type: 'matinale',
        });
        alertTriggered = true;
        console.warn(`[Matinale/Freshness] ALERTE créée : ${dropRatePct}% écartés (seuil ${alertThresholdPct}%)`);
      } catch (e) {
        console.error('[Matinale/Freshness] Échec création alerte', e);
      }
    }

    const freshnessMeta = {
      window_hours: freshnessHours,
      based_on: 'date_publication',
      articles_total_raw: totalRaw,
      articles_kept: articles.length,
      articles_dropped: droppedCount,
      drop_rate_pct: dropRatePct,
      alert_threshold_pct: alertThresholdPct,
      alert_triggered: alertTriggered,
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
