// Edge function: collecte-titrologie
// Collects daily Ivorian press front pages, runs OCR + visual analysis (Gemini 2.5 Pro multimodal),
// extracts titles, themes, tone, ANSUT risk. Stores results in titrologie_unes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const ANSUT_KEYWORDS = [
  'ansut', 'service universel', 'télécommunications', 'fibre', 'connectivité',
  'numérique', '5g', '4g', 'internet', 'cybersécurité', 'data center',
  'haut débit', 'inclusion numérique', 'transformation digitale',
];

interface RawUne {
  journal: string;
  titre_une: string;
  image_url?: string;
  source_url?: string;
}

// 1. Discover front pages via Perplexity (multi-source)
async function discoverUnes(): Promise<RawUne[]> {
  if (!PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY missing');

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const prompt = `Liste les UNES (titres principaux) des journaux ivoiriens publiés aujourd'hui ${today}.
Cible : Fraternité Matin, L'Inter, Soir Info, Notre Voie, Le Patriote, Le Nouveau Réveil, L'Expression, Le Jour Plus, Le Mandat, Notre Temps, Aujourd'hui.
Sources à scanner en priorité :
- abidjan.net/titrologie ou news.abidjan.net/titrologie
- linfodrome.com, koaci.com, fratmat.info, aip.ci
Pour chaque journal trouvé, retourne strictement en JSON :
{ "unes": [ { "journal": "...", "titre_une": "...", "image_url": "URL image de la une si disponible", "source_url": "URL source" } ] }
Maximum 12 unes. Aucune invention : si pas trouvé, ne pas inclure.`;

  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'Tu es un agrégateur de presse ivoirienne. Réponds en JSON strict.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      search_recency_filter: 'day',
      response_format: {
        type: 'json_schema',
        json_schema: {
          schema: {
            type: 'object',
            properties: {
              unes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    journal: { type: 'string' },
                    titre_une: { type: 'string' },
                    image_url: { type: 'string' },
                    source_url: { type: 'string' },
                  },
                  required: ['journal', 'titre_une'],
                },
              },
            },
            required: ['unes'],
          },
        },
      },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Perplexity ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.unes) ? parsed.unes.slice(0, 12) : [];
  } catch {
    return [];
  }
}

// 2. OCR + visual analysis on a front page image (Gemini 2.5 Pro multimodal)
async function ocrAndAnalyze(une: RawUne): Promise<any> {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

  const userParts: any[] = [
    {
      type: 'text',
      text: `Analyse cette une de presse ivoirienne (journal: ${une.journal}). Titre indicatif : "${une.titre_une}".
Tâches :
1. OCR : extrait tous les titres visibles (gros titres, sous-titres).
2. Titre principal de la une.
3. Sujet dominant.
4. Ton.
5. Risque ANSUT (VERT/ORANGE/ROUGE) selon proximité avec : ${ANSUT_KEYWORDS.join(', ')}.
6. 2-5 thèmes clés (mots courts).
7. Lien ANSUT direct/indirect en 1 phrase, sinon null.
8. **ANALYSE PAR ANGLE** — pour chaque angle (politique, social, economique, numerique_telecom, reputationnel) :
   - intensite : 0 (absent) / 1 (faible) / 2 (moyen) / 3 (fort)
   - lecture : 1 phrase factuelle (max 25 mots) si intensite ≥ 1, sinon null
   - lien_ansut_mtnd : lien possible avec ANSUT, MTND (Ministère de la Transition Numérique et de la Digitalisation) ou Service Universel — 1 phrase si pertinent, sinon null

Réponds via l'outil structurer_une.`,
    },
  ];

  if (une.image_url && /^https?:\/\//.test(une.image_url)) {
    userParts.push({ type: 'image_url', image_url: { url: une.image_url } });
  }

  const angleSchema = {
    type: 'object',
    properties: {
      intensite: { type: 'integer', enum: [0, 1, 2, 3] },
      lecture: { type: ['string', 'null'] },
      lien_ansut_mtnd: { type: ['string', 'null'] },
    },
    required: ['intensite'],
  };

  const body = {
    model: 'google/gemini-2.5-pro',
    messages: [
      { role: 'system', content: 'Tu es analyste presse ANSUT/MTND. Précis, factuel, aucune invention.' },
      { role: 'user', content: userParts },
    ],
    temperature: 0.3,
    tools: [{
      type: 'function',
      function: {
        name: 'structurer_une',
        description: 'Structure l\'analyse OCR + visuelle + par angle de la une',
        parameters: {
          type: 'object',
          properties: {
            raw_ocr: { type: 'string' },
            titre_principal: { type: 'string' },
            sujet: { type: 'string', enum: ['politique','economie','social','sport','telecom_numerique','securite','international','autre'] },
            ton: { type: 'string', enum: ['positif','negatif','neutre','alarmiste','critique'] },
            risque_ansut: { type: 'string', enum: ['VERT','ORANGE','ROUGE'] },
            themes: { type: 'array', items: { type: 'string' } },
            lien_ansut: { type: ['string','null'] },
            angles: {
              type: 'object',
              properties: {
                politique: angleSchema,
                social: angleSchema,
                economique: angleSchema,
                numerique_telecom: angleSchema,
                reputationnel: angleSchema,
              },
              required: ['politique','social','economique','numerique_telecom','reputationnel'],
            },
          },
          required: ['titre_principal','sujet','ton','risque_ansut','themes','angles'],
        },
      },
    }],
    tool_choice: { type: 'function', function: { name: 'structurer_une' } },
  };

  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error('No tool call returned');
  return JSON.parse(toolCall.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  // Create run record
  const { data: run } = await supabase.from('titrologie_runs')
    .insert({ run_date: today, status: 'running' }).select().single();
  const runId = run?.id;

  try {
    console.log('[Titrologie] Discovering unes...');
    const rawUnes = await discoverUnes();
    console.log(`[Titrologie] Found ${rawUnes.length} raw unes`);

    let analyzed = 0;
    const inserts: any[] = [];

    for (const une of rawUnes) {
      try {
        const analysis = await ocrAndAnalyze(une);
        inserts.push({
          date_parution: today,
          journal: une.journal,
          image_url: une.image_url || null,
          source_url: une.source_url || null,
          titre_une: analysis.titre_principal || une.titre_une,
          sujet: analysis.sujet,
          ton: analysis.ton,
          risque_ansut: analysis.risque_ansut || 'VERT',
          lien_ansut: analysis.lien_ansut || null,
          themes: analysis.themes || [],
          raw_ocr: analysis.raw_ocr || null,
          angles: analysis.angles || {},
          analyse_ia: analysis,
        });
        analyzed++;
      } catch (e) {
        console.error(`[Titrologie] Analyze failed for ${une.journal}:`, e instanceof Error ? e.message : e);
      }
    }

    if (inserts.length > 0) {
      // Replace today's entries
      await supabase.from('titrologie_unes').delete().eq('date_parution', today);
      const { error: insErr } = await supabase.from('titrologie_unes').insert(inserts);
      if (insErr) throw insErr;
    }

    await supabase.from('titrologie_runs').update({
      status: 'success',
      unes_collected: rawUnes.length,
      unes_analyzed: analyzed,
      duration_ms: Date.now() - startedAt,
      finished_at: new Date().toISOString(),
    }).eq('id', runId);

    return new Response(JSON.stringify({
      ok: true, date: today, collected: rawUnes.length, analyzed, inserted: inserts.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Titrologie] FATAL:', msg);
    await supabase.from('titrologie_runs').update({
      status: 'error', error: msg, duration_ms: Date.now() - startedAt,
      finished_at: new Date().toISOString(),
    }).eq('id', runId);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
