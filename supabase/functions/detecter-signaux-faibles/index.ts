import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const hoursBack = body.hours || 48;
    const minSources = body.min_sources || 3;

    // 1. Fetch recent articles (last 48h)
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    const { data: articles, error: fetchErr } = await supabase
      .from('actualites')
      .select('id, titre, resume, source_nom, tags, categorie, date_publication')
      .gte('date_publication', since)
      .order('date_publication', { ascending: false })
      .limit(200);

    if (fetchErr) throw fetchErr;
    if (!articles?.length) {
      return new Response(JSON.stringify({ success: true, clusters: [], message: 'Aucun article récent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[detecter-signaux-faibles] Analysing ${articles.length} articles from last ${hoursBack}h`);

    // 2. Send to AI for clustering via tool calling
    const articleList = articles.map((a, i) =>
      `[${i}] source="${a.source_nom || 'inconnue'}" titre="${a.titre}" ${a.resume ? `résumé="${a.resume.slice(0, 120)}"` : ''}`
    ).join('\n');

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un analyste de veille stratégique pour l'ANSUT (Agence Nationale du Service Universel des Télécommunications, Côte d'Ivoire). 
Tu dois identifier les sujets émergents mentionnés par plusieurs sources distinctes.
Un signal faible = un thème abordé par ${minSources}+ sources DISTINCTES (source_nom différents) dans la fenêtre temporelle.
Ignore les sujets génériques ou trop vagues.`
          },
          {
            role: 'user',
            content: `Analyse ces ${articles.length} articles et identifie les clusters thématiques mentionnés par ${minSources}+ sources distinctes:\n\n${articleList}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'report_clusters',
              description: 'Rapporte les clusters de signaux faibles détectés',
              parameters: {
                type: 'object',
                properties: {
                  clusters: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        theme: { type: 'string', description: 'Titre court du signal faible détecté' },
                        description: { type: 'string', description: 'Explication en 1-2 phrases de pourquoi c\'est un signal faible important pour l\'ANSUT' },
                        article_indices: { type: 'array', items: { type: 'number' }, description: 'Indices des articles concernés' },
                        quadrant: { type: 'string', enum: ['tech', 'regulation', 'market', 'reputation'], description: 'Quadrant du radar' },
                        urgency: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Niveau d\'urgence' },
                        distinct_sources: { type: 'array', items: { type: 'string' }, description: 'Noms des sources distinctes' }
                      },
                      required: ['theme', 'description', 'article_indices', 'quadrant', 'urgency', 'distinct_sources'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['clusters'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'report_clusters' } },
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[detecter-signaux-faibles] AI error ${resp.status}:`, errText);

      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requêtes atteinte, réessayez plus tard' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA insuffisants' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${resp.status}`);
    }

    const aiData = await resp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.log('[detecter-signaux-faibles] No tool call in AI response');
      return new Response(JSON.stringify({ success: true, clusters: [], message: 'Aucun cluster détecté' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clusters } = JSON.parse(toolCall.function.arguments);

    // Filter clusters that actually have enough distinct sources
    const validClusters = (clusters || []).filter(
      (c: any) => c.distinct_sources?.length >= minSources
    );

    console.log(`[detecter-signaux-faibles] ${validClusters.length} valid clusters detected`);

    // 3. Insert signals and alerts for each cluster
    const results = [];
    for (const cluster of validClusters) {
      const niveauSignal = cluster.urgency === 'high' ? 'critical' : 'warning';

      // Insert signal
      const { data: signal, error: sigErr } = await supabase
        .from('signaux')
        .insert({
          titre: `🔍 ${cluster.theme}`,
          description: cluster.description,
          quadrant: cluster.quadrant,
          niveau: niveauSignal,
          score_impact: cluster.urgency === 'high' ? 80 : cluster.urgency === 'medium' ? 60 : 40,
          source_type: 'cluster_detection',
          tendance: 'up',
        })
        .select('id')
        .single();

      if (sigErr) {
        console.error('[detecter-signaux-faibles] Signal insert error:', sigErr);
        continue;
      }

      // Insert alert
      const articleIds = cluster.article_indices
        .filter((i: number) => i < articles.length)
        .map((i: number) => articles[i].id);

      await supabase.from('alertes').insert({
        type: 'signal_faible',
        niveau: niveauSignal,
        titre: `Signal Faible : ${cluster.theme}`,
        message: `${cluster.distinct_sources.length} sources distinctes convergent sur ce sujet en ${hoursBack}h. ${cluster.description}`,
        reference_type: 'signal',
        reference_id: signal.id,
      });

      results.push({
        signal_id: signal.id,
        theme: cluster.theme,
        description: cluster.description,
        quadrant: cluster.quadrant,
        urgency: cluster.urgency,
        sources: cluster.distinct_sources,
        articles: articleIds,
      });
    }

    console.log(`[detecter-signaux-faibles] Done: ${results.length} signals created`);

    return new Response(JSON.stringify({ success: true, clusters: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[detecter-signaux-faibles] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
