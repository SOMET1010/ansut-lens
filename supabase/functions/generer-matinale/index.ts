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

// ============= MODULE TITROLOGIE IVOIRIENNE =============
// Mots-clés Service Universel / ANSUT pour scoring de risque réputationnel
const TITROLOGIE_RISK_KEYWORDS = [
  'ansut', 'mtnd', 'artci', 'service universel', 'zones blanches',
  'internet', 'réseau', 'fibre', 'haut débit', 'haut-débit', '5g', '4g',
  'satellite', 'starlink', 'ia', 'intelligence artificielle',
  'cybersécurité', 'cyber', 'dématérialisation', 'e-services', 'eservices',
  'administration numérique', 'inclusion numérique', 'coût de connexion',
  'accès rural', 'numérique', 'télécom', 'télécoms', 'telecom',
  'orange', 'mtn', 'moov', 'wave', 'datacenter', 'data center', 'cloud souverain',
];

export type UneJournal = {
  journal: string;
  type: 'nationale' | 'en_ligne' | 'economique';
  titre: string;
  resume: string;
  url: string;
  sujet: 'politique' | 'social' | 'economique' | 'numerique_telecom' | 'reputationnel' | 'international' | 'autre';
  ton: 'positif' | 'neutre' | 'negatif' | 'critique';
  risque_ansut: 'VERT' | 'ORANGE' | 'ROUGE';
  lien_ansut: string;
};

export type TitrologieResult = {
  unes: (UneJournal & { risque_score?: number; risque_signals?: string[] })[];
  synthese_codir: {
    sujets_dominants: string[];
    impact_ansut: string[];
    opportunite_communication: string | null;
    risque_a_surveiller: string | null;
    action_recommandee: string;
    risque_distribution?: { ROUGE: number; ORANGE: number; VERT: number };
    risque_global?: 'VERT' | 'ORANGE' | 'ROUGE';
    score_global?: number;
    top_risques?: Array<{ journal: string; titre: string; score: number; risque: 'VERT' | 'ORANGE' | 'ROUGE'; signals: string[] }>;
  } | null;
  signaux_ansut: string[];
  generated_at: string;
};

// ============= SCORING DÉTERMINISTE DU RISQUE RÉPUTATIONNEL =============
// Mots-clés pondérés (poids = points)
const RISK_KEYWORDS_DIRECT: Record<string, number> = {
  'ansut': 6, 'mtnd': 5, 'artci': 4, 'service universel': 5,
  'ministère du numérique': 4, 'ministere du numerique': 4,
};
const RISK_KEYWORDS_SECTOR: Record<string, number> = {
  'fibre': 3, 'haut débit': 3, 'haut-débit': 3, '5g': 3, '4g': 2,
  'cybersécurité': 3, 'cyber': 2, 'datacenter': 3, 'data center': 3,
  'cloud souverain': 3, 'zones blanches': 3, 'accès rural': 3,
  'inclusion numérique': 3, 'starlink': 2, 'satellite': 2,
  'dématérialisation': 2, 'e-services': 2, 'eservices': 2,
  'administration numérique': 2, 'télécom': 2, 'télécoms': 2, 'telecom': 2,
  'orange ci': 2, 'mtn ci': 2, 'moov africa': 2, 'wave': 1,
  'ia': 1, 'intelligence artificielle': 2,
};
const RISK_TONE_BOOST: Record<string, number> = {
  critique: 3, negatif: 2, alarmiste: 3, neutre: 0, positif: -1,
};

function scoreUneRisk(une: { titre: string; resume?: string; ton?: string }): { score: number; signals: string[]; risque: 'VERT' | 'ORANGE' | 'ROUGE' } {
  const text = `${une.titre || ''} ${une.resume || ''}`.toLowerCase();
  let score = 0;
  const signals: string[] = [];
  for (const [kw, w] of Object.entries(RISK_KEYWORDS_DIRECT)) {
    if (text.includes(kw)) { score += w; signals.push(`direct:${kw}(+${w})`); }
  }
  for (const [kw, w] of Object.entries(RISK_KEYWORDS_SECTOR)) {
    if (text.includes(kw)) { score += w; signals.push(`secteur:${kw}(+${w})`); }
  }
  const toneBoost = RISK_TONE_BOOST[(une.ton || 'neutre').toLowerCase()] ?? 0;
  if (toneBoost !== 0) { score += toneBoost; signals.push(`ton:${une.ton}(${toneBoost >= 0 ? '+' : ''}${toneBoost})`); }
  score = Math.max(0, score);
  // Seuils : ≥6 ROUGE, ≥3 ORANGE, sinon VERT
  const risque: 'VERT' | 'ORANGE' | 'ROUGE' = score >= 6 ? 'ROUGE' : score >= 3 ? 'ORANGE' : 'VERT';
  return { score, signals, risque };
}

const RISK_RANK: Record<string, number> = { VERT: 0, ORANGE: 1, ROUGE: 2 };
function maxRisque(a: 'VERT' | 'ORANGE' | 'ROUGE', b: 'VERT' | 'ORANGE' | 'ROUGE'): 'VERT' | 'ORANGE' | 'ROUGE' {
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b;
}

// Enrichit chaque une avec score déterministe + agrège la synthèse CODIR
function enrichTitrologieWithRisk(result: TitrologieResult): TitrologieResult {
  const unes = (result.unes || []).map(u => {
    const det = scoreUneRisk({ titre: u.titre, resume: u.resume, ton: u.ton });
    const finalRisque = maxRisque(u.risque_ansut || 'VERT', det.risque);
    return { ...u, risque_ansut: finalRisque, risque_score: det.score, risque_signals: det.signals };
  });
  const distribution = unes.reduce((acc, u) => { acc[u.risque_ansut] = (acc[u.risque_ansut] || 0) + 1; return acc; }, { ROUGE: 0, ORANGE: 0, VERT: 0 } as { ROUGE: number; ORANGE: number; VERT: number });
  const score_global = unes.reduce((s, u) => s + (u.risque_score || 0), 0);
  const risque_global: 'VERT' | 'ORANGE' | 'ROUGE' =
    distribution.ROUGE >= 2 ? 'ROUGE'
    : distribution.ROUGE === 1 || distribution.ORANGE >= 3 ? 'ORANGE'
    : distribution.ORANGE >= 1 ? 'ORANGE' : 'VERT';
  const top_risques = [...unes]
    .filter(u => (u.risque_score || 0) > 0)
    .sort((a, b) => (b.risque_score || 0) - (a.risque_score || 0))
    .slice(0, 3)
    .map(u => ({ journal: u.journal, titre: u.titre, score: u.risque_score || 0, risque: u.risque_ansut, signals: u.risque_signals || [] }));
  const synthese_codir = result.synthese_codir
    ? { ...result.synthese_codir, risque_distribution: distribution, risque_global, score_global, top_risques }
    : (unes.length > 0 ? {
        sujets_dominants: [],
        impact_ansut: [],
        opportunite_communication: null,
        risque_a_surveiller: top_risques[0] ? `${top_risques[0].journal} — ${top_risques[0].titre}` : null,
        action_recommandee: risque_global === 'ROUGE' ? 'Préparer une réaction DG sous 24h' : risque_global === 'ORANGE' ? 'Surveiller et instruire dans la semaine' : 'Aucune action immédiate',
        risque_distribution: distribution,
        risque_global,
        score_global,
        top_risques,
      } : null);
  return { ...result, unes, synthese_codir };
}

// Étape 1 : collecte brute des unes via Perplexity multi-sources
async function collectUnesRaw(): Promise<Array<{ journal: string; titre: string; resume: string; url: string; type: string }>> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  if (!PERPLEXITY_API_KEY) {
    console.warn('[Titrologie] PERPLEXITY_API_KEY manquant');
    return [];
  }

  const prompt = `Scanne les UNES (gros titres principaux) du jour de la presse ivoirienne. Couvre OBLIGATOIREMENT plusieurs sources :
- abidjan.net/titrologie et news.abidjan.net/titrologie (agrégateur national des unes)
- linfodrome.com
- koaci.com
- fratmat.info (Fraternité Matin)
- aip.ci (Agence Ivoirienne de Presse)
- Et si possible : Le Patriote, Notre Voie, Soir Info, L'Intelligent d'Abidjan, L'Expression

Pour CHAQUE journal repéré aujourd'hui, donne 1 à 2 gros titres MAX (la une). Vise 8 à 15 unes au total.

Concentre-toi sur les sujets : politique, social, économie, numérique/télécom, IA, cybersécurité, service universel, ARTCI, MTND, ANSUT, opérateurs (Orange/MTN/Moov), zones blanches, fibre, accès rural, dématérialisation, e-services.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `Tu es un agent de revue de presse ivoirienne. Réponds UNIQUEMENT en JSON valide :
{
  "titres": [
    { "journal": "Nom exact", "titre": "Gros titre EXACT publié aujourd'hui", "resume": "Une phrase résumant l'article", "url": "URL réelle", "type": "nationale|en_ligne|economique" }
  ]
}
RÈGLES STRICTES :
- N'invente AUCUN titre. Si non trouvé, omettre le journal.
- Ne reprends que les unes du JOUR (date du jour).
- Maximum 15 titres. Diversifie les journaux.`
          },
          { role: 'user', content: prompt }
        ],
        search_recency_filter: 'day',
        return_citations: true,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error(`[Titrologie/collect] Erreur ${response.status}`);
      await response.text();
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations: string[] = data.citations || [];

    const jsonMatch = content.match(/\{[\s\S]*"titres"[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.titres)) return [];

    return parsed.titres.map((t: any, i: number) => ({
      journal: t.journal || 'Inconnu',
      titre: t.titre || '',
      resume: t.resume || '',
      url: t.url || citations[i] || '',
      type: t.type || 'nationale',
    })).filter((t: any) => t.titre && t.titre.length > 5);
  } catch (e) {
    console.error('[Titrologie/collect] Exception:', e);
    return [];
  }
}

// Étape 2 : analyse IA (Gemini 2.5 Pro) — sujet, ton, risque ANSUT, synthèse CODIR
async function analyzeUnesWithAI(rawUnes: Array<{ journal: string; titre: string; resume: string; url: string; type: string }>): Promise<TitrologieResult> {
  const empty: TitrologieResult = {
    unes: [],
    synthese_codir: null,
    signaux_ansut: [],
    generated_at: new Date().toISOString(),
  };

  if (rawUnes.length === 0) return empty;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('[Titrologie/analyze] LOVABLE_API_KEY manquant — fallback heuristique');
    // Fallback minimal : scoring lexical
    return {
      ...empty,
      unes: rawUnes.slice(0, 12).map(t => {
        const text = `${t.titre} ${t.resume}`.toLowerCase();
        const hits = TITROLOGIE_RISK_KEYWORDS.filter(k => text.includes(k));
        const risque: 'VERT' | 'ORANGE' | 'ROUGE' = hits.some(h => ['ansut', 'mtnd', 'artci', 'service universel'].includes(h)) ? 'ROUGE' : hits.length > 0 ? 'ORANGE' : 'VERT';
        return {
          journal: t.journal,
          type: (t.type as any) || 'nationale',
          titre: t.titre,
          resume: t.resume,
          url: t.url,
          sujet: hits.length > 0 ? 'numerique_telecom' : 'autre',
          ton: 'neutre',
          risque_ansut: risque,
          lien_ansut: hits.length > 0 ? `Mots-clés détectés : ${hits.join(', ')}` : '',
        } as UneJournal;
      }),
    };
  }

  const context = rawUnes.map((t, i) => `[${i + 1}] ${t.journal} (${t.type}) : "${t.titre}" — ${t.resume}`).join('\n');

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `Tu es l'analyste titrologie de l'ANSUT (Agence Nationale du Service Universel des Télécommunications, Côte d'Ivoire). Tu analyses les unes de la presse ivoirienne pour le DG.

Pour CHAQUE une fournie, tu détermines :
- sujet : politique | social | economique | numerique_telecom | reputationnel | international | autre
- ton : positif | neutre | negatif | critique
- risque_ansut :
  * VERT = aucun impact ANSUT/MTND/ARTCI/Service Universel
  * ORANGE = sujet indirect mais sensible (numérique, télécoms, opérateurs, données, cyber, accès rural)
  * ROUGE = sujet direct ANSUT/MTND/ARTCI/Service Universel ou pouvant exiger une réaction du DG
- lien_ansut : phrase courte expliquant le lien (vide si VERT)

Puis tu produis une SYNTHÈSE CODIR (3 sujets dominants, impact ANSUT, opportunité com, risque à surveiller, action recommandée) et 1-3 signaux faibles ANSUT.

INTERDICTION absolue d'inventer des titres ou journaux. Reprends UNIQUEMENT ceux du contexte.`
          },
          { role: 'user', content: `UNES À ANALYSER :\n${context}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyse_titrologie',
            description: 'Analyse stratégique des unes ivoiriennes',
            parameters: {
              type: 'object',
              properties: {
                unes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      journal: { type: 'string' },
                      type: { type: 'string', enum: ['nationale', 'en_ligne', 'economique'] },
                      titre: { type: 'string' },
                      resume: { type: 'string' },
                      url: { type: 'string' },
                      sujet: { type: 'string', enum: ['politique', 'social', 'economique', 'numerique_telecom', 'reputationnel', 'international', 'autre'] },
                      ton: { type: 'string', enum: ['positif', 'neutre', 'negatif', 'critique'] },
                      risque_ansut: { type: 'string', enum: ['VERT', 'ORANGE', 'ROUGE'] },
                      lien_ansut: { type: 'string' },
                    },
                    required: ['journal', 'type', 'titre', 'resume', 'url', 'sujet', 'ton', 'risque_ansut', 'lien_ansut'],
                  },
                },
                synthese_codir: {
                  type: 'object',
                  properties: {
                    sujets_dominants: { type: 'array', items: { type: 'string' }, description: '3 sujets dominants du jour' },
                    impact_ansut: { type: 'array', items: { type: 'string' }, description: '2-4 puces sur l\'impact ANSUT' },
                    opportunite_communication: { type: ['string', 'null'] },
                    risque_a_surveiller: { type: ['string', 'null'] },
                    action_recommandee: { type: 'string', description: 'Préparer / ne pas préparer de réaction, et pourquoi' },
                  },
                  required: ['sujets_dominants', 'impact_ansut', 'opportunite_communication', 'risque_a_surveiller', 'action_recommandee'],
                },
                signaux_ansut: { type: 'array', items: { type: 'string' }, description: '0 à 3 signaux faibles liés ANSUT/Service Universel' },
              },
              required: ['unes', 'synthese_codir', 'signaux_ansut'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'analyse_titrologie' } },
      }),
    });

    if (!response.ok) {
      console.error(`[Titrologie/analyze] Erreur AI Gateway ${response.status}`);
      await response.text();
      return { ...empty, unes: rawUnes.slice(0, 12).map(t => ({ journal: t.journal, type: (t.type as any) || 'nationale', titre: t.titre, resume: t.resume, url: t.url, sujet: 'autre', ton: 'neutre', risque_ansut: 'VERT', lien_ansut: '' })) };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return empty;

    const parsed = JSON.parse(toolCall.function.arguments);
    console.log(`[Titrologie] ${parsed.unes?.length || 0} unes analysées, synthèse=${!!parsed.synthese_codir}, signaux=${parsed.signaux_ansut?.length || 0}`);

    return {
      unes: Array.isArray(parsed.unes) ? parsed.unes : [],
      synthese_codir: parsed.synthese_codir || null,
      signaux_ansut: Array.isArray(parsed.signaux_ansut) ? parsed.signaux_ansut : [],
      generated_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[Titrologie/analyze] Exception:', e);
    return empty;
  }
}

async function fetchTitrologie(): Promise<TitrologieResult> {
  let baseResult: TitrologieResult | null = null;

  // 1. Try to read today's pre-collected unes from titrologie_unes (cron at 06:00 UTC)
  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const today = new Date().toISOString().slice(0, 10);
    const { data: stored } = await sb
      .from('titrologie_unes')
      .select('journal,titre_une,sujet,ton,risque_ansut,lien_ansut,themes,source_url,image_url,angles')
      .eq('date_parution', today)
      .order('risque_ansut', { ascending: false })
      .limit(15);

    if (stored && stored.length > 0) {
      console.log(`[Titrologie] Using ${stored.length} pre-collected unes from DB`);
      const unes = stored.map((r: any) => ({
        journal: r.journal,
        titre: r.titre_une,
        resume: '',
        type: 'nationale' as const,
        sujet: r.sujet || 'autre',
        ton: r.ton || 'neutre',
        risque_ansut: r.risque_ansut || 'VERT',
        lien_ansut: r.lien_ansut || '',
        url: r.source_url || r.image_url || '',
        angles: r.angles || {},
      }));
      try {
        const synth = await analyzeUnesWithAI(stored.map((r: any) => ({
          journal: r.journal, titre: r.titre_une, resume: '', url: r.source_url || '', type: 'nationale',
        })));
        baseResult = { ...synth, unes };
      } catch {
        baseResult = { unes, synthese_codir: null, signaux_ansut: [], generated_at: new Date().toISOString() };
      }
    }
  } catch (e) {
    console.warn('[Titrologie] DB read failed, falling back to live collect:', (e as Error).message);
  }

  // 2. Fallback: live collection via Perplexity (slower, on-demand)
  if (!baseResult) {
    const raw = await collectUnesRaw();
    baseResult = raw.length === 0
      ? { unes: [], synthese_codir: null, signaux_ansut: [], generated_at: new Date().toISOString() }
      : await analyzeUnesWithAI(raw);
  }

  // 3. Apply deterministic risk scoring + aggregate into CODIR synthesis
  return enrichTitrologieWithRisk(baseResult);
}


const MATINALE_PROMPT = `Tu produis la **MATINALE CODIR – ANSUT** en mode **INTELLIGENCE EXÉCUTIVE**.
Tu n'es PAS un agrégateur de presse : tu es la cellule d'intelligence stratégique du Directeur Général de l'Agence Nationale du Service Universel des Télécommunications (Côte d'Ivoire).
Le DG ne lit pas pour s'informer : il lit pour DÉCIDER. Chaque section doit lui dire QUOI faire, POURQUOI maintenant, et avec QUEL niveau d'urgence.

==== POSITIONNEMENT ====
RADAR n'est PAS un outil de veille média. C'est un système national d'intelligence stratégique numérique au service de l'ANSUT.
Le livrable distingue toujours : bruit médiatique vs. signal stratégique vs. menace vs. opportunité vs. risque réputation vs. enjeu régulation vs. mouvement concurrent vs. urgence DG.

==== CADRE D'ANALYSE OBLIGATOIRE ====
Quatre piliers ANSUT à utiliser pour structurer la veille (section veille_par_pilier) :
1. CONNECTIVITÉ : zones blanches, satellite/LEO, FTTH, pylônes, qualité réseau, Open RAN, énergie sites, backbone.
2. USAGES & SERVICES : mobile money, e-services, inclusion, IA citoyenne, plateformes publiques, super apps.
3. RÉGULATION & SOUVERAINETÉ : données, cloud souverain, cybersécurité, identité numérique, taxation, directives CEDEAO/UEMOA.
4. CONCURRENCE & MARCHÉ : Orange, MTN, Moov, Wave, Starlink, Canal, fintechs.

Et toujours en arrière-plan : lecture Service Universel (Accès / Usages / Impact) + lecture IA & Communications électroniques.

==== NIVEAUX DE CRITICITÉ (codes couleur DG) ====
- ROUGE  : arbitrage DG immédiat (24-72h), risque ou opportunité majeurs, action requise
- ORANGE : risque ou opportunité moyen terme, à instruire dans la semaine
- VERT   : information utile, simple suivi
- BLEU   : opportunité ou signal faible à explorer

==== CONTRAINTES STRICTES ====
- JAMAIS inventer un titre, une URL, un chiffre, un nom, une fonction, un projet
- JAMAIS de phrases vides type "la concurrence s'intensifie" sans QUI / SUR QUOI / IMPACT ANSUT / RISQUE / ACTION
- JAMAIS dire "0 sources retenues". Si la matière est faible, basculer en mode "signaux faibles + suivi tendances + veille opérateurs" et le dire clairement.
- Si une donnée est incertaine → l'omettre purement (pas de "non disponible" partout)
- Aucun jargon de communication interne
- Français professionnel, ton institutionnel décisionnel
- Si tu nommes une personne, utiliser UNIQUEMENT le "RÉFÉRENTIEL PERSONNALITÉS VÉRIFIÉES". Sinon : ne pas nommer.
- URLs : copier EXACTEMENT depuis le contexte. Aucune URL inventée. Si pas d'URL fiable, exclure le titre.

==== STRUCTURE DE SORTIE OBLIGATOIRE (JSON via tool call) ====

1. priorite_executive : LE sujet du jour qui exige une décision/arbitrage du DG.
   Toujours présent. Si rien d'urgent : prendre le signal stratégique le plus structurant et l'expliquer comme tel.
   { titre, impacts: [3 puces max, factuelles, ANSUT-centric], recommandation: [2-4 actions concrètes], niveau: "ROUGE|ORANGE|VERT|BLEU" }

2. synthese_60s : 3 à 5 lignes ultra-condensées pour lire la journée en 60 secondes.
   Chaque ligne : { sujet (court), impact_ansut (1 phrase), niveau: "ROUGE|ORANGE|VERT|BLEU" }

3. veille_par_pilier : la veille structurée PAR PILIER ANSUT (pas par actualité).
   { connectivite: [items], usages_services: [items], regulation_souverainete: [items], concurrence_marche: [items] }
   Chaque item : { titre, lecture_ansut (1-2 phrases : ce que ça veut dire pour l'ANSUT), niveau: "ROUGE|ORANGE|VERT|BLEU", url (depuis contexte), source }
   Distribuer intelligemment les actualités du contexte. Vide ([]) autorisé pour un pilier sans matière.

4. lecture_strategique : 1 à 2 sujets approfondis avec vraie analyse.
   { sujet, opportunites: [puces], risques: [puces], scores: { acces, usage, gouvernance, souverainete } (chaque score 0-10) }

5. impact_projets_ansut : impact direct sur les projets connus de l'ANSUT.
   Liste d'objets { domaine (ex: "Zones blanches", "RNHD", "Cockpit DG", "Identité numérique"), impact: "ÉLEVÉ|MOYEN|FAIBLE|AUCUN", commentaire (1 phrase) }
   3 à 6 entrées. Si aucun projet impacté de façon connue : tableau vide.

6. actions_immediates : ce que le DG/CODIR doit déclencher.
   Liste d'objets { action (verbe d'action), responsable (ex: "DTDI", "DSIS", "CT", "DG"), delai (ex: "72h", "5 jours", "1 semaine") }
   2 à 5 actions concrètes. Vide [] si vraiment rien.

7. reputation_ansut : lecture critique de la perception ANSUT.
   { positif: [puces courtes], negatif: [puces courtes], confusion_role: (string|null, ex: "ANSUT/ARTCI"), niveau_risque: "ROUGE|ORANGE|VERT|BLEU" }

8. signaux_faibles : tendances émergentes / signaux à surveiller (régional, technologique, sociétal).
   Liste de 3 à 6 strings courtes et précises (pas de génériques creux).

9. revue_de_presse : 6 à 12 titres MAX, triés par rubrique, sans analyse.
   Items { titre exact, source, date (AAAA-MM-JJ), url valide, rubrique: "telecom_numerique|economie_finance|gouvernance_regulation|international" }

10. activite_ansut : { publications_count (fourni dans contexte), visibilite (fourni dans contexte) } — ne PAS recalculer.

==== ANTI-FAIBLESSE ====
Si le contexte est pauvre :
- TOUJOURS produire priorite_executive en s'appuyant sur le signal le plus structurant disponible (mention, signal faible, tendance régionale)
- TOUJOURS produire au moins 3 signaux_faibles (issus de la connaissance du secteur télécom/numérique africain)
- TOUJOURS produire au moins 2 actions_immediates (ne serait-ce que "instruire", "cartographier", "préparer note")
- Ne JAMAIS écrire "Aucune actualité disponible" comme contenu utile`;


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

    // Charger les règles de scoring configurables (admin/scoring)
    const SCORING_DEFAULTS = {
      threshold_rouge: 80,
      threshold_orange: 60,
      threshold_vert: 40,
      pertinence_min: 30,
      min_signaux_total: 8,
      min_actions_immediates: 3,
      min_signaux_faibles: 3,
      min_synthese_60s: 2,
      min_impact_projets: 2,
      weight_press: 1,
      weight_synthese: 1,
      weight_pilier: 1,
      weight_signaux_faibles: 1,
    };
    const scoring = { ...SCORING_DEFAULTS };
    try {
      const { data: scoringRows } = await supabase
        .from('config_seuils')
        .select('cle, valeur')
        .like('cle', 'scoring_%');
      for (const r of scoringRows || []) {
        const k = (r.cle as string).replace(/^scoring_/, '');
        if (k in scoring && typeof r.valeur === 'number') (scoring as any)[k] = r.valeur;
      }
    } catch (e) {
      console.warn('[Matinale/Scoring] fallback defaults:', (e as Error).message);
    }
    console.log('[Matinale/Scoring] config:', scoring);

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

    console.log('[Matinale] Accounts activity:', accountsActivity.length, 'comptes,', (recentPubs || []).length, 'pubs 24h,', titrologie.unes.length, 'unes titrologie');

    // Also filter articles that specifically mention ANSUT
    const ansutKeywords = ['ansut', 'service universel', 'télécommunications'];
    const ansutArticles = (articles || []).filter(a => {
      const text = `${a.titre} ${a.resume || ''} ${a.contenu || ''} ${a.impact_ansut || ''}`.toLowerCase();
      return ansutKeywords.some(kw => text.includes(kw));
    });

    // ============= MODE FUSIONNER INTELLIGEMMENT =============
    // Unifie articles DB + Perplexity + mentions ANSUT + insights sociaux et déduplique transversalement.
    const allItems: ActuLike[] = [
      ...(articles || []).map(a => ({
        titre: a.titre,
        resume: a.resume,
        source_nom: a.source_nom,
        source_url: a.source_url,
        importance: a.importance,
        sentiment: a.sentiment,
        impact_ansut: a.impact_ansut,
        entites_personnes: (a as any).entites_personnes ?? null,
        entites_entreprises: (a as any).entites_entreprises ?? null,
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
      ...((mentions || []).map((m: any) => ({
        titre: (m.contenu || '').slice(0, 140),
        resume: m.contenu,
        source_nom: m.source || 'Mention',
        source_url: m.source_url,
        importance: m.est_critique ? 75 : 50,
        sentiment: m.sentiment,
        origin: 'mention' as const,
      }))),
      ...((socialInsights || []).map((s: any) => ({
        titre: (s.contenu || '').slice(0, 140),
        resume: s.contenu,
        source_nom: s.plateforme || 'Social',
        source_url: s.url_original,
        importance: s.est_critique ? 70 : 45,
        sentiment: s.sentiment,
        origin: 'social' as const,
      }))),
    ];
    const consolidated = consolidateActualites(allItems);
    const dupGroups = consolidated.filter(g => g.members.length > 1).length;
    const fusionnesCount = consolidated.reduce((s, g) => s + Math.max(0, g.members.length - 1), 0);
    const consolidatedList = consolidated.length > 0
      ? formatConsolidatedForPrompt(consolidated)
      : 'Aucune actualité disponible.';

    console.log('[Matinale] Fusion intelligente:', allItems.length, 'items →', consolidated.length, 'faits uniques (', dupGroups, 'groupes,', fusionnesCount, 'doublons fusionnés)');

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

    const context = `=== SIGNAUX CONSOLIDÉS (${consolidated.length} faits uniques après fusion ; ${fusionnesCount} doublons fusionnés sur ${allItems.length} items bruts) ===
RÈGLE DE CONSOLIDATION : chaque entrée [N] représente UN signal unique, déjà fusionné depuis plusieurs sources.
- Ne JAMAIS recréer un item par source. Un signal = une entrée, même s'il apparaît 5 fois dans la presse.
- Quand un signal est marqué [SIGNAL CONSOLIDÉ ×N], cela renforce sa pertinence stratégique (à hiérarchiser plus haut).
- Présenter les sources groupées (ex: "selon Reuters, Jeune Afrique et APA") plutôt que dupliquer le sujet.
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
                priorite_executive: {
                  type: 'object',
                  description: 'LE sujet du jour qui exige une décision/arbitrage. Toujours présent.',
                  properties: {
                    titre: { type: 'string' },
                    impacts: { type: 'array', items: { type: 'string' }, description: '3 puces max, ANSUT-centric' },
                    recommandation: { type: 'array', items: { type: 'string' }, description: '2 à 4 actions' },
                    niveau: { type: 'string', enum: ['ROUGE', 'ORANGE', 'VERT', 'BLEU'] },
                  },
                  required: ['titre', 'impacts', 'recommandation', 'niveau'],
                },
                synthese_60s: {
                  type: 'array',
                  description: '3 à 5 lignes ultra-condensées',
                  items: {
                    type: 'object',
                    properties: {
                      sujet: { type: 'string' },
                      impact_ansut: { type: 'string' },
                      niveau: { type: 'string', enum: ['ROUGE', 'ORANGE', 'VERT', 'BLEU'] },
                    },
                    required: ['sujet', 'impact_ansut', 'niveau'],
                  },
                },
                veille_par_pilier: {
                  type: 'object',
                  properties: {
                    connectivite: { type: 'array', items: { type: 'object', properties: { titre: { type: 'string' }, lecture_ansut: { type: 'string' }, niveau: { type: 'string', enum: ['ROUGE', 'ORANGE', 'VERT', 'BLEU'] }, url: { type: 'string' }, source: { type: 'string' } }, required: ['titre', 'lecture_ansut', 'niveau'] } },
                    usages_services: { type: 'array', items: { type: 'object', properties: { titre: { type: 'string' }, lecture_ansut: { type: 'string' }, niveau: { type: 'string', enum: ['ROUGE', 'ORANGE', 'VERT', 'BLEU'] }, url: { type: 'string' }, source: { type: 'string' } }, required: ['titre', 'lecture_ansut', 'niveau'] } },
                    regulation_souverainete: { type: 'array', items: { type: 'object', properties: { titre: { type: 'string' }, lecture_ansut: { type: 'string' }, niveau: { type: 'string', enum: ['ROUGE', 'ORANGE', 'VERT', 'BLEU'] }, url: { type: 'string' }, source: { type: 'string' } }, required: ['titre', 'lecture_ansut', 'niveau'] } },
                    concurrence_marche: { type: 'array', items: { type: 'object', properties: { titre: { type: 'string' }, lecture_ansut: { type: 'string' }, niveau: { type: 'string', enum: ['ROUGE', 'ORANGE', 'VERT', 'BLEU'] }, url: { type: 'string' }, source: { type: 'string' } }, required: ['titre', 'lecture_ansut', 'niveau'] } },
                  },
                  required: ['connectivite', 'usages_services', 'regulation_souverainete', 'concurrence_marche'],
                },
                lecture_strategique: {
                  type: 'array',
                  description: '1 à 2 sujets approfondis avec scores stratégiques',
                  items: {
                    type: 'object',
                    properties: {
                      sujet: { type: 'string' },
                      opportunites: { type: 'array', items: { type: 'string' } },
                      risques: { type: 'array', items: { type: 'string' } },
                      scores: {
                        type: 'object',
                        properties: {
                          acces: { type: 'number' },
                          usage: { type: 'number' },
                          gouvernance: { type: 'number' },
                          souverainete: { type: 'number' },
                        },
                        required: ['acces', 'usage', 'gouvernance', 'souverainete'],
                      },
                    },
                    required: ['sujet', 'opportunites', 'risques', 'scores'],
                  },
                },
                impact_projets_ansut: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      domaine: { type: 'string' },
                      impact: { type: 'string', enum: ['ÉLEVÉ', 'MOYEN', 'FAIBLE', 'AUCUN'] },
                      commentaire: { type: 'string' },
                    },
                    required: ['domaine', 'impact', 'commentaire'],
                  },
                },
                actions_immediates: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      action: { type: 'string' },
                      responsable: { type: 'string' },
                      delai: { type: 'string' },
                    },
                    required: ['action', 'responsable', 'delai'],
                  },
                },
                reputation_ansut: {
                  type: 'object',
                  properties: {
                    positif: { type: 'array', items: { type: 'string' } },
                    negatif: { type: 'array', items: { type: 'string' } },
                    confusion_role: { type: ['string', 'null'] },
                    niveau_risque: { type: 'string', enum: ['ROUGE', 'ORANGE', 'VERT', 'BLEU'] },
                  },
                  required: ['positif', 'negatif', 'confusion_role', 'niveau_risque'],
                },
                signaux_faibles: {
                  type: 'array',
                  description: '3 à 6 signaux émergents précis',
                  items: { type: 'string' },
                },
                revue_de_presse: {
                  type: 'array',
                  description: '6 à 12 titres MAX, triés par rubrique, sans analyse',
                  items: {
                    type: 'object',
                    properties: {
                      titre: { type: 'string' },
                      source: { type: 'string' },
                      date: { type: 'string', description: 'AAAA-MM-JJ' },
                      url: { type: 'string', description: 'URL EXACTE depuis le contexte' },
                      rubrique: { type: 'string', enum: ['telecom_numerique', 'economie_finance', 'gouvernance_regulation', 'international'] },
                    },
                    required: ['titre', 'source', 'date', 'url', 'rubrique'],
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
              required: ['priorite_executive', 'synthese_60s', 'veille_par_pilier', 'lecture_strategique', 'impact_projets_ansut', 'actions_immediates', 'reputation_ansut', 'signaux_faibles', 'revue_de_presse', 'activite_ansut'],

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
    // Normalize URLs to make matching robust (trailing slash, tracking params, casing)
    const normalizeUrl = (u?: string | null): string => {
      if (!u) return '';
      try {
        const url = new URL(u.trim());
        // Strip common tracking params
        const trackingPrefixes = ['utm_', 'fbclid', 'gclid', 'mc_'];
        const params = [...url.searchParams.keys()];
        for (const k of params) {
          if (trackingPrefixes.some(p => k.toLowerCase().startsWith(p))) url.searchParams.delete(k);
        }
        let path = url.pathname.replace(/\/+$/, '');
        if (!path) path = '/';
        return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
      } catch {
        return u.trim().toLowerCase().replace(/\/+$/, '');
      }
    };

    const urlMeta = new Map<string, { source: string; date: string; titre: string }>();
    const todayIso = new Date().toISOString().slice(0, 10);
    const registerUrl = (rawUrl: string | null | undefined, source: string, titre: string, date?: string | null) => {
      const norm = normalizeUrl(rawUrl);
      if (!norm) return;
      if (!urlMeta.has(norm)) urlMeta.set(norm, { source: source || 'Web', date: (date || '').slice(0, 10) || todayIso, titre: titre || '' });
    };
    for (const a of (articles || [])) registerUrl(a.source_url, a.source_nom || 'Source', a.titre, a.date_publication || a.created_at);
    for (const m of (mentions || [])) registerUrl(m.source_url, m.source || 'Mention', (m.contenu || '').slice(0, 120), m.date_mention);
    for (const s of (socialInsights || [])) registerUrl(s.url_original, s.plateforme || 'Social', (s.contenu || '').slice(0, 120));
    for (const p of perplexityNews.articles) registerUrl(p.url, p.source, p.titre);
    for (const c of perplexityNews.citations) registerUrl(c, 'Web', '');

    const validUrls = new Set<string>(urlMeta.keys());

    // Post-process: filtrer la revue_de_presse — exiger URLs valides du contexte (normalisées) + 15 max
    if (Array.isArray(matinale.revue_de_presse)) {
      matinale.revue_de_presse = matinale.revue_de_presse
        .map((r: any) => {
          if (!r?.url) return null;
          const norm = normalizeUrl(r.url);
          if (!validUrls.has(norm)) return null;
          return { ...r, url: norm };
        })
        .filter(Boolean)
        .slice(0, 15);
    } else {
      matinale.revue_de_presse = [];
    }

    // Fallback: si la revue est vide alors que des articles existent, on la reconstruit depuis le contexte
    if (matinale.revue_de_presse.length === 0 && urlMeta.size > 0) {
      console.warn('[Matinale] Revue vide après filtrage — reconstruction fallback depuis articles bruts');
      const inferRubrique = (text: string): string => {
        const t = text.toLowerCase();
        if (/(banque|finance|bourse|économ|investiss|fisc|budget|pib)/.test(t)) return 'economie_finance';
        if (/(régulat|gouvern|ministre|décret|loi|président|conseil|état)/.test(t)) return 'gouvernance_regulation';
        if (/(union|afrique|union européenne|onu|cedeao|international|coopérat|sommet)/.test(t)) return 'international';
        return 'telecom_numerique';
      };
      const fallback: Array<{ titre: string; source: string; date: string; url: string; rubrique: string }> = [];
      for (const [url, meta] of urlMeta.entries()) {
        if (!meta.titre) continue;
        fallback.push({
          titre: meta.titre,
          source: meta.source,
          date: meta.date || todayIso,
          url,
          rubrique: inferRubrique(`${meta.titre} ${meta.source}`),
        });
        if (fallback.length >= 15) break;
      }
      matinale.revue_de_presse = fallback;
    }


    // ====== INTÉGRITÉ DES SOURCES (anti-biais) ======
    // Règle d'or : aucune donnée non sourcée. Si un item ne peut être rattaché à un article/URL
    // du contexte, il est rejeté plutôt qu'imaginé. Les sections deviennent simplement vides ;
    // l'UI affiche un état "empty" explicite plutôt que du contenu fabriqué.

    // Index lexical du contexte pour vérifier l'ancrage textuel
    const norm = (s: string) => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const contextCorpus: string[] = [];
    const contextTitles: string[] = [];
    for (const a of (articles || [])) {
      contextCorpus.push(norm(`${a.titre} ${a.resume || ''}`));
      contextTitles.push(norm(a.titre || ''));
    }
    for (const m of (mentions || [])) contextCorpus.push(norm(m.contenu || ''));
    for (const p of perplexityNews.articles) {
      contextCorpus.push(norm(`${p.titre} ${(p as any).resume || ''}`));
      contextTitles.push(norm(p.titre || ''));
    }

    const isAnchored = (text: string, minTokens = 2): boolean => {
      const t = norm(text);
      if (!t || t.length < 8) return false;
      if (contextTitles.some((ct) => ct && ct.length > 8 && (ct.includes(t.slice(0, 40)) || t.includes(ct.slice(0, 40))))) return true;
      const tokens = t.split(/[^a-z0-9]+/g).filter((w) => w.length > 4);
      let hits = 0;
      for (const tok of tokens) {
        if (contextCorpus.some((c) => c.includes(tok))) hits++;
        if (hits >= minTokens) return true;
      }
      return false;
    };

    // Cap sizes
    matinale.synthese_60s = Array.isArray(matinale.synthese_60s) ? matinale.synthese_60s.slice(0, 5) : [];
    matinale.signaux_faibles = Array.isArray(matinale.signaux_faibles) ? matinale.signaux_faibles.slice(0, 6) : [];
    matinale.actions_immediates = Array.isArray(matinale.actions_immediates) ? matinale.actions_immediates.slice(0, 5) : [];
    matinale.impact_projets_ansut = Array.isArray(matinale.impact_projets_ansut) ? matinale.impact_projets_ansut.slice(0, 6) : [];
    matinale.lecture_strategique = Array.isArray(matinale.lecture_strategique) ? matinale.lecture_strategique.slice(0, 2) : [];

    // Veille par pilier : URL OBLIGATOIREMENT validée par le contexte
    if (!matinale.veille_par_pilier || typeof matinale.veille_par_pilier !== 'object') {
      matinale.veille_par_pilier = { connectivite: [], usages_services: [], regulation_souverainete: [], concurrence_marche: [] };
    }
    for (const k of ['connectivite', 'usages_services', 'regulation_souverainete', 'concurrence_marche']) {
      if (!Array.isArray(matinale.veille_par_pilier[k])) matinale.veille_par_pilier[k] = [];
      matinale.veille_par_pilier[k] = matinale.veille_par_pilier[k]
        .map((it: any) => {
          const u = it?.url ? normalizeUrl(it.url) : '';
          return u && validUrls.has(u) ? { ...it, url: u } : null;
        })
        .filter(Boolean)
        .slice(0, 5);
    }

    // Synthèse 60s, lecture stratégique, impact projets : sujet ancré dans le corpus
    matinale.synthese_60s = matinale.synthese_60s.filter((s: any) => isAnchored(s?.sujet || ''));
    matinale.lecture_strategique = matinale.lecture_strategique.filter((s: any) => isAnchored(s?.sujet || ''));
    matinale.impact_projets_ansut = matinale.impact_projets_ansut.filter((p: any) => isAnchored(p?.domaine || '', 1));

    // Signaux faibles : phrase ancrée (rejette les généralités sectorielles non sourcées)
    matinale.signaux_faibles = matinale.signaux_faibles.filter((s: string) => typeof s === 'string' && isAnchored(s, 2));

    // Réputation : seuls les éléments ancrés sont conservés
    if (!matinale.reputation_ansut || typeof matinale.reputation_ansut !== 'object') {
      matinale.reputation_ansut = { positif: [], negatif: [], confusion_role: null, niveau_risque: 'VERT' };
    } else {
      matinale.reputation_ansut.positif = (matinale.reputation_ansut.positif || []).filter((p: string) => isAnchored(p, 1));
      matinale.reputation_ansut.negatif = (matinale.reputation_ansut.negatif || []).filter((n: string) => isAnchored(n, 1));
      if (matinale.reputation_ansut.confusion_role && !isAnchored(matinale.reputation_ansut.confusion_role, 1)) {
        matinale.reputation_ansut.confusion_role = null;
      }
    }

    // Priorité exécutive : conservée UNIQUEMENT si ancrée. Pas d'invention de "seed" générique.
    const prioAnchored = !!matinale.priorite_executive
      && typeof matinale.priorite_executive === 'object'
      && typeof matinale.priorite_executive.titre === 'string'
      && isAnchored(matinale.priorite_executive.titre, 1);
    if (!prioAnchored) {
      matinale.priorite_executive = null;
      // Sans priorité ancrée, les actions immédiates n'ont plus d'objet : on vide
      matinale.actions_immediates = [];
    } else {
      // Filtrer aussi les actions individuelles (au cas où l'IA en glisserait une hors-sujet)
      matinale.actions_immediates = matinale.actions_immediates.filter((a: any) => !!a?.action && a.action.length > 5);
    }

    // Métadonnées d'intégrité — exposées pour traçabilité front
    matinale._integrity = {
      sources_indexed: validUrls.size,
      context_articles: (articles || []).length,
      perplexity_articles: perplexityNews.articles.length,
      mode: 'strict_no_fallback',
    };


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

    const revue = (matinale.revue_de_presse || []) as Array<{ titre: string; source: string; date: string; url: string; rubrique: string }>;
    const act = matinale.activite_ansut;
    const prio = matinale.priorite_executive;
    const synthese = (matinale.synthese_60s || []) as Array<{ sujet: string; impact_ansut: string; niveau: string }>;
    const veille = matinale.veille_par_pilier as Record<string, Array<{ titre: string; lecture_ansut: string; niveau: string; url?: string; source?: string }>>;
    const lectureStrat = (matinale.lecture_strategique || []) as Array<{ sujet: string; opportunites: string[]; risques: string[]; scores: { acces: number; usage: number; gouvernance: number; souverainete: number } }>;
    const impactProjets = (matinale.impact_projets_ansut || []) as Array<{ domaine: string; impact: string; commentaire: string }>;
    const actions = (matinale.actions_immediates || []) as Array<{ action: string; responsable: string; delai: string }>;
    const reput = matinale.reputation_ansut as { positif: string[]; negatif: string[]; confusion_role: string | null; niveau_risque: string };
    const signaux = (matinale.signaux_faibles || []) as string[];

    // Couleurs par niveau de criticité
    const NIV_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
      ROUGE:  { bg: '#fef2f2', fg: '#991b1b', border: '#dc2626' },
      ORANGE: { bg: '#fff7ed', fg: '#9a3412', border: '#ea580c' },
      VERT:   { bg: '#f0fdf4', fg: '#166534', border: '#16a34a' },
      BLEU:   { bg: '#eff6ff', fg: '#1e40af', border: '#2563eb' },
    };
    const nivBadge = (niv: string) => {
      const c = NIV_COLORS[niv] || NIV_COLORS.BLEU;
      return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;color:#fff;background:${c.border};letter-spacing:0.5px;">${niv}</span>`;
    };
    const impactBadge = (lvl: string) => {
      const map: Record<string, string> = { 'ÉLEVÉ': '#dc2626', 'MOYEN': '#ea580c', 'FAIBLE': '#16a34a', 'AUCUN': '#9ca3af' };
      return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;color:#fff;background:${map[lvl] || '#9ca3af'};">${lvl}</span>`;
    };

    const groupedRevue: Record<string, typeof revue> = {};
    for (const r of revue) { (groupedRevue[r.rubrique] ||= []).push(r); }
    const buildRubriqueBlock = (key: string) => {
      const items = groupedRevue[key];
      if (!items || items.length === 0) return '';
      return `<div style="margin-bottom:12px;"><p style="margin:0 0 6px;font-size:11px;font-weight:bold;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.5px;">${RUBRIQUE_LABELS[key]}</p>${items.map(it => `<div style="margin-bottom:6px;padding:8px 10px;background:#ffffff;border-radius:6px;border-left:3px solid #2563eb;"><p style="margin:0 0 2px;font-size:13px;color:#1e3a5f;line-height:1.4;"><strong>${it.titre}</strong></p><p style="margin:0;font-size:11px;color:#6b7280;">${it.source} (${it.date})${it.url ? ` — <a href="${it.url}" style="color:#2563eb;" target="_blank">URL →</a>` : ''}</p></div>`).join('')}</div>`;
    };

    const PILIER_LABELS: Record<string, { label: string; color: string }> = {
      connectivite: { label: '📡 Connectivité', color: '#2563eb' },
      usages_services: { label: '💳 Usages & Services', color: '#7c3aed' },
      regulation_souverainete: { label: '⚖️ Régulation & Souveraineté', color: '#0891b2' },
      concurrence_marche: { label: '🏁 Concurrence & Marché', color: '#dc2626' },
    };
    const buildPilierBlock = (key: string) => {
      const items = (veille?.[key] || []);
      const cfg = PILIER_LABELS[key];
      if (!items.length) return `<div style="margin-bottom:10px;padding:10px;background:#f9fafb;border-radius:6px;border-left:3px solid ${cfg.color};"><p style="margin:0;font-size:12px;font-weight:700;color:${cfg.color};">${cfg.label}</p><p style="margin:4px 0 0;font-size:11px;color:#9ca3af;font-style:italic;">Pas de signal sur la fenêtre.</p></div>`;
      return `<div style="margin-bottom:14px;"><p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${cfg.color};">${cfg.label}</p>${items.map(it => `<div style="margin-bottom:6px;padding:10px;background:#ffffff;border-radius:6px;border:1px solid #e5e7eb;border-left:3px solid ${cfg.color};"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:12px;color:#1e3a5f;"><strong>${it.titre}</strong></td><td style="text-align:right;width:70px;">${nivBadge(it.niveau)}</td></tr></table><p style="margin:6px 0 0;font-size:12px;color:#374151;line-height:1.5;">→ ${it.lecture_ansut}</p>${it.url ? `<p style="margin:4px 0 0;font-size:10px;color:#6b7280;"><a href="${it.url}" style="color:${cfg.color};" target="_blank">${it.source || 'source'} ↗</a></p>` : ''}</div>`).join('')}</div>`;
    };

    const allUrlsTraceability = revue.map(r => r.url).filter(Boolean);
    // Indicateur qualité pondéré (poids configurables via /admin/scoring)
    const piliersCount = Object.values(veille || {}).reduce((s, arr: any) => s + (arr?.length || 0), 0);
    const totalSignaux = Math.round(
      revue.length * scoring.weight_press
      + (synthese?.length || 0) * scoring.weight_synthese
      + piliersCount * scoring.weight_pilier
      + (signaux?.length || 0) * scoring.weight_signaux_faibles
      + (actions?.length || 0)
      + (impactProjets?.length || 0)
    );
    const seuilBonne = Math.max(scoring.min_signaux_total + 5, scoring.min_signaux_total * 1.6);
    const qualiteScore = totalSignaux >= seuilBonne ? 'Bonne' : totalSignaux >= scoring.min_signaux_total ? 'Moyenne' : 'Faible';
    const qualiteColor = qualiteScore === 'Bonne' ? '#10b981' : qualiteScore === 'Moyenne' ? '#f59e0b' : '#ef4444';
    const prioColor = NIV_COLORS[prio?.niveau || 'BLEU'];

    const htmlEmail = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0;"><tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">

<!-- EN-TÊTE -->
<tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:28px 30px;">
  <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Système d'intelligence stratégique numérique</p>
  <h1 style="color:#ffffff;margin:6px 0 0;font-size:24px;letter-spacing:0.3px;">Matinale CODIR – ANSUT</h1>
  <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">${dateStr}</p>
  <p style="color:#94a3b8;margin:10px 0 0;font-size:11px;">Génération ${generatedAtUtc} · Fenêtre ${freshnessHours}h · ${totalSignaux} signaux exploités</p>
</td></tr>

<!-- 1. PRIORITÉ EXÉCUTIVE -->
<tr><td style="padding:24px 24px 16px;">
  <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#dc2626;letter-spacing:1.5px;">🚨 PRIORITÉ EXÉCUTIVE</p>
  <div style="padding:18px;background:${prioColor.bg};border-radius:10px;border-left:5px solid ${prioColor.border};">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:16px;font-weight:700;color:${prioColor.fg};">${prio?.titre || ''}</td>
      <td style="text-align:right;width:90px;">${nivBadge(prio?.niveau || 'BLEU')}</td>
    </tr></table>
    ${(prio?.impacts || []).length ? `<p style="margin:14px 0 4px;font-size:11px;font-weight:700;color:${prioColor.fg};text-transform:uppercase;letter-spacing:0.5px;">Impact potentiel</p><ul style="margin:0;padding-left:18px;">${prio.impacts.map((i: string) => `<li style="font-size:13px;color:#1e3a5f;line-height:1.5;margin-bottom:3px;">${i}</li>`).join('')}</ul>` : ''}
    ${(prio?.recommandation || []).length ? `<p style="margin:12px 0 4px;font-size:11px;font-weight:700;color:${prioColor.fg};text-transform:uppercase;letter-spacing:0.5px;">Recommandation IA</p><ul style="margin:0;padding-left:18px;">${prio.recommandation.map((i: string) => `<li style="font-size:13px;color:#1e3a5f;line-height:1.5;margin-bottom:3px;">${i}</li>`).join('')}</ul>` : ''}
  </div>
</td></tr>

<!-- 2. SYNTHÈSE 60s -->
${synthese.length ? `<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:15px;margin:0 0 10px;border-bottom:2px solid #6366f1;padding-bottom:6px;">⏱️ Synthèse 60 secondes</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;font-size:11px;color:#475569;text-transform:uppercase;">Sujet</th><th style="padding:8px;text-align:left;font-size:11px;color:#475569;text-transform:uppercase;">Impact ANSUT</th><th style="padding:8px;text-align:center;font-size:11px;color:#475569;text-transform:uppercase;width:80px;">Niveau</th></tr>
    ${synthese.map(s => `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-size:13px;color:#1e3a5f;font-weight:600;">${s.sujet}</td><td style="padding:8px;font-size:12px;color:#374151;">${s.impact_ansut}</td><td style="padding:8px;text-align:center;">${nivBadge(s.niveau)}</td></tr>`).join('')}
  </table>
</td></tr>` : ''}

<!-- 3. VEILLE STRATÉGIQUE PAR PILIER -->
<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:15px;margin:0 0 12px;border-bottom:2px solid #2563eb;padding-bottom:6px;">🎯 Veille stratégique par pilier ANSUT</h2>
  ${['connectivite','usages_services','regulation_souverainete','concurrence_marche'].map(buildPilierBlock).join('')}
</td></tr>

<!-- 4. LECTURE STRATÉGIQUE -->
${lectureStrat.length ? `<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:15px;margin:0 0 12px;border-bottom:2px solid #8b5cf6;padding-bottom:6px;">🧠 Lecture stratégique ANSUT</h2>
  ${lectureStrat.map(l => `<div style="margin-bottom:14px;padding:14px;background:#faf5ff;border-radius:8px;border-left:4px solid #8b5cf6;">
    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#6b21a8;">${l.sujet}</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top;width:50%;padding-right:8px;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;">Opportunités</p><ul style="margin:0;padding-left:16px;">${(l.opportunites||[]).map(o=>`<li style="font-size:12px;color:#1e3a5f;line-height:1.5;">${o}</li>`).join('')}</ul></td>
      <td style="vertical-align:top;width:50%;padding-left:8px;border-left:1px solid #e9d5ff;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;">Risques</p><ul style="margin:0;padding-left:16px;">${(l.risques||[]).map(r=>`<li style="font-size:12px;color:#1e3a5f;line-height:1.5;">${r}</li>`).join('')}</ul></td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;background:#fff;border-radius:6px;"><tr>
      <td style="padding:6px;text-align:center;font-size:11px;color:#6b7280;border-right:1px solid #e5e7eb;"><strong style="display:block;color:#6b21a8;font-size:14px;">${l.scores?.acces ?? '–'}/10</strong>Accès</td>
      <td style="padding:6px;text-align:center;font-size:11px;color:#6b7280;border-right:1px solid #e5e7eb;"><strong style="display:block;color:#6b21a8;font-size:14px;">${l.scores?.usage ?? '–'}/10</strong>Usage</td>
      <td style="padding:6px;text-align:center;font-size:11px;color:#6b7280;border-right:1px solid #e5e7eb;"><strong style="display:block;color:#6b21a8;font-size:14px;">${l.scores?.gouvernance ?? '–'}/10</strong>Gouvernance</td>
      <td style="padding:6px;text-align:center;font-size:11px;color:#6b7280;"><strong style="display:block;color:#6b21a8;font-size:14px;">${l.scores?.souverainete ?? '–'}/10</strong>Souveraineté</td>
    </tr></table>
  </div>`).join('')}
</td></tr>` : ''}

<!-- 5. IMPACT PROJETS ANSUT -->
${impactProjets.length ? `<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:15px;margin:0 0 12px;border-bottom:2px solid #f59e0b;padding-bottom:6px;">🎯 Impact direct projets ANSUT</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr style="background:#fffbeb;"><th style="padding:8px;text-align:left;font-size:11px;color:#92400e;text-transform:uppercase;">Domaine / Projet</th><th style="padding:8px;text-align:center;font-size:11px;color:#92400e;text-transform:uppercase;width:90px;">Impact</th><th style="padding:8px;text-align:left;font-size:11px;color:#92400e;text-transform:uppercase;">Lecture</th></tr>
    ${impactProjets.map(p => `<tr style="border-bottom:1px solid #fde68a;"><td style="padding:8px;font-size:13px;font-weight:600;color:#1e3a5f;">${p.domaine}</td><td style="padding:8px;text-align:center;">${impactBadge(p.impact)}</td><td style="padding:8px;font-size:12px;color:#374151;">${p.commentaire}</td></tr>`).join('')}
  </table>
</td></tr>` : ''}

<!-- 6. ACTIONS IMMÉDIATES -->
${actions.length ? `<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:15px;margin:0 0 12px;border-bottom:2px solid #dc2626;padding-bottom:6px;">⚡ Actions immédiates</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fef2f2;border-radius:8px;overflow:hidden;">
    <tr style="background:#fee2e2;"><th style="padding:10px;text-align:left;font-size:11px;color:#991b1b;text-transform:uppercase;">Action</th><th style="padding:10px;text-align:center;font-size:11px;color:#991b1b;text-transform:uppercase;width:120px;">Responsable</th><th style="padding:10px;text-align:center;font-size:11px;color:#991b1b;text-transform:uppercase;width:90px;">Délai</th></tr>
    ${actions.map(a => `<tr style="border-bottom:1px solid #fecaca;"><td style="padding:10px;font-size:13px;color:#1e3a5f;">${a.action}</td><td style="padding:10px;text-align:center;font-size:12px;font-weight:700;color:#991b1b;">${a.responsable}</td><td style="padding:10px;text-align:center;font-size:12px;font-weight:700;color:#991b1b;">${a.delai}</td></tr>`).join('')}
  </table>
</td></tr>` : ''}

<!-- 7. RÉPUTATION ANSUT -->
<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:15px;margin:0 0 12px;border-bottom:2px solid #0891b2;padding-bottom:6px;">🛡️ Réputation & visibilité ANSUT</h2>
  <div style="padding:14px;background:#ecfeff;border-radius:8px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top;width:50%;padding-right:8px;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;">✅ Positif</p>${(reput?.positif||[]).length ? `<ul style="margin:0;padding-left:16px;">${reput.positif.map(p=>`<li style="font-size:12px;color:#1e3a5f;line-height:1.5;">${p}</li>`).join('')}</ul>` : '<p style="margin:0;font-size:11px;color:#9ca3af;font-style:italic;">—</p>'}</td>
      <td style="vertical-align:top;width:50%;padding-left:8px;border-left:1px solid #cffafe;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;">⚠️ Négatif</p>${(reput?.negatif||[]).length ? `<ul style="margin:0;padding-left:16px;">${reput.negatif.map(n=>`<li style="font-size:12px;color:#1e3a5f;line-height:1.5;">${n}</li>`).join('')}</ul>` : '<p style="margin:0;font-size:11px;color:#9ca3af;font-style:italic;">—</p>'}</td>
    </tr></table>
    ${reput?.confusion_role ? `<p style="margin:10px 0 0;font-size:12px;color:#9a3412;background:#fff7ed;padding:6px 10px;border-radius:6px;">🔁 Confusion de rôle détectée : <strong>${reput.confusion_role}</strong></p>` : ''}
    <p style="margin:10px 0 0;font-size:12px;color:#1e3a5f;">Risque réputation : ${nivBadge(reput?.niveau_risque || 'VERT')}</p>
  </div>
</td></tr>

<!-- 8. SIGNAUX FAIBLES -->
${signaux.length ? `<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:15px;margin:0 0 12px;border-bottom:2px solid #6366f1;padding-bottom:6px;">📡 Signaux faibles & tendances émergentes</h2>
  <div style="padding:12px;background:#eef2ff;border-radius:8px;"><ul style="margin:0;padding-left:18px;">${signaux.map(s=>`<li style="font-size:12px;color:#3730a3;line-height:1.6;margin-bottom:3px;">${s}</li>`).join('')}</ul></div>
</td></tr>` : ''}

<!-- 9. REVUE DE PRESSE (sources) -->
<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#475569;font-size:14px;margin:0 0 10px;border-bottom:1px dashed #cbd5e1;padding-bottom:4px;">📰 Sources consultées (revue de presse)</h2>
  ${revue.length === 0 ? '<p style="font-size:12px;color:#9ca3af;font-style:italic;">Pas de presse vérifiée sur la fenêtre — analyse fondée sur signaux internes et tendances sectorielles.</p>' : RUBRIQUE_ORDER.map(buildRubriqueBlock).join('')}
</td></tr>

<!-- F. ACTIVITÉ ANSUT -->
<tr><td style="padding:0 24px 20px;">
  <h2 style="color:#1e3a5f;font-size:14px;margin:0 0 10px;border-bottom:1px dashed #cbd5e1;padding-bottom:4px;">📣 Activité ANSUT (24h)</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:6px;"><tr>
    <td style="padding:10px;font-size:12px;color:#1e3a5f;"><strong>Publications :</strong> ${act?.publications_count ?? 0}</td>
    <td style="padding:10px;font-size:12px;color:#1e3a5f;text-align:right;"><strong>Visibilité :</strong> <span style="color:${act?.visibilite === 'Fort' ? '#10b981' : act?.visibilite === 'Moyen' ? '#f59e0b' : '#ef4444'};font-weight:700;">${act?.visibilite || 'Faible'}</span></td>
  </tr></table>
</td></tr>

<!-- TRAÇABILITÉ -->
<tr><td style="padding:0 24px 24px;">
  <div style="padding:10px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
    <p style="margin:0;font-size:10px;color:#6b7280;"><strong>Qualité du livrable :</strong> <span style="color:${qualiteColor};font-weight:700;">${qualiteScore}</span> · ${totalSignaux} signaux exploités · ${revue.length} sources presse · ${articlesRaw?.length || 0} articles analysés</p>
    ${allUrlsTraceability.length > 0 ? `<details style="margin-top:6px;"><summary style="font-size:10px;color:#374151;cursor:pointer;">URLs sources (${allUrlsTraceability.length})</summary><ol style="margin:6px 0 0;padding-left:16px;">${allUrlsTraceability.map(u => `<li style="font-size:9px;color:#6b7280;line-height:1.4;word-break:break-all;"><a href="${u}" style="color:#2563eb;text-decoration:none;" target="_blank">${u}</a></li>`).join('')}</ol></details>` : ''}
  </div>
</td></tr>

<tr><td style="background-color:#0f172a;padding:14px;text-align:center;"><p style="margin:0;color:#64748b;font-size:10px;letter-spacing:0.5px;">ANSUT RADAR · Système d'intelligence stratégique numérique · Document interne</p></td></tr>

</table></td></tr></table></body></html>`;



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
