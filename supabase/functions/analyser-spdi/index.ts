import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { personnalite_id } = await req.json();
    if (!personnalite_id) throw new Error("personnalite_id requis");

    // Get personnalite info
    const { data: perso, error: errPerso } = await supabase
      .from("personnalites")
      .select("*")
      .eq("id", personnalite_id)
      .single();
    if (errPerso) throw errPerso;

    // Get latest metric
    const { data: latestMetric } = await supabase
      .from("presence_digitale_metrics")
      .select("*")
      .eq("personnalite_id", personnalite_id)
      .order("date_mesure", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get recent mentions
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const { data: mentionLinks } = await supabase
      .from("personnalites_mentions")
      .select("mention_id")
      .eq("personnalite_id", personnalite_id);
    
    const mentionIds = (mentionLinks || []).map((m: any) => m.mention_id);
    let recentMentions: any[] = [];
    if (mentionIds.length > 0) {
      const { data } = await supabase
        .from("mentions")
        .select("contenu, source, sentiment, est_critique, date_mention")
        .in("id", mentionIds)
        .gte("date_mention", thirtyDaysAgo)
        .order("date_mention", { ascending: false })
        .limit(10);
      recentMentions = data || [];
    }

    // Build AI prompt
    const prompt = `Tu es un analyste en communication institutionnelle et présence digitale.

Acteur analysé : ${perso.prenom || ''} ${perso.nom}
Fonction : ${perso.fonction || 'N/A'}
Organisation : ${perso.organisation || 'N/A'}
Cercle stratégique : ${perso.cercle}
Thématiques : ${(perso.thematiques || []).join(', ') || 'Non définies'}

Score SPDI actuel : ${latestMetric?.score_spdi ?? 'Non calculé'}/100
- Visibilité : ${latestMetric?.score_visibilite ?? 0}/100
- Qualité : ${latestMetric?.score_qualite ?? 0}/100
- Autorité : ${latestMetric?.score_autorite ?? 0}/100
- Présence : ${latestMetric?.score_presence ?? 0}/100
Interprétation : ${latestMetric?.interpretation ?? 'N/A'}
Mentions récentes (30j) : ${latestMetric?.nb_mentions ?? 0}
Sentiment moyen : ${latestMetric?.sentiment_moyen ?? 0}
Controverses : ${latestMetric?.nb_controverses ?? 0}

Dernières mentions :
${recentMentions.map(m => `- [${m.source}] ${m.contenu?.substring(0, 150)}... (sentiment: ${m.sentiment})`).join('\n') || 'Aucune mention récente'}

Génère exactement 4 recommandations stratégiques pour améliorer la présence digitale de cet acteur.`;

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY non configurée");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Tu réponds UNIQUEMENT en JSON valide. Pas de markdown, pas de texte avant ou après." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_recommendations",
            description: "Génère des recommandations SPDI stratégiques",
            parameters: {
              type: "object",
              properties: {
                recommandations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["opportunite", "alerte", "canal", "thematique"] },
                      priorite: { type: "string", enum: ["haute", "normale", "basse"] },
                      titre: { type: "string", description: "Titre court de la recommandation (max 60 caractères)" },
                      message: { type: "string", description: "Message détaillé avec action concrète (max 200 caractères)" },
                      canal: { type: "string", enum: ["linkedin", "presse", "conference", "communique"], description: "Canal recommandé si applicable" },
                      thematique: { type: "string", description: "Thématique associée si applicable" },
                    },
                    required: ["type", "priorite", "titre", "message"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["recommandations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_recommendations" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes IA atteinte, réessayez plus tard." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("Erreur IA gateway");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Pas de recommandations générées");

    const { recommandations } = JSON.parse(toolCall.function.arguments);

    // Deactivate old recommendations
    await supabase
      .from("presence_digitale_recommandations")
      .update({ actif: false })
      .eq("personnalite_id", personnalite_id)
      .eq("actif", true);

    // Insert new recommendations
    const toInsert = recommandations.map((r: any) => ({
      personnalite_id,
      type: r.type,
      priorite: r.priorite,
      titre: r.titre,
      message: r.message,
      canal: r.canal || null,
      thematique: r.thematique || null,
      actif: true,
      vue: false,
    }));

    const { error: errInsert } = await supabase
      .from("presence_digitale_recommandations")
      .insert(toInsert);
    if (errInsert) throw errInsert;

    return new Response(
      JSON.stringify({ recommandations_generees: recommandations.length, recommandations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyser-spdi error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
