import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    const pays = ["Sénégal", "Ghana", "Nigeria", "Kenya", "Rwanda", "Maroc"];
    const themes = [
      "service universel télécommunications",
      "backbone fibre optique national",
      "inclusion numérique rurale",
      "fonds de service universel",
      "agence nationale numérique",
      "connectivité scolaire",
    ];

    // Use Perplexity to search for similar projects
    const searchQuery = `Projets récents en Afrique de l'Ouest et centrale sur: ${themes.slice(0, 4).join(", ")}. Pays: ${pays.join(", ")}. Derniers 30 jours.`;

    let searchResults = "";

    if (PERPLEXITY_API_KEY) {
      const perpRes = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: "Recherche les projets gouvernementaux numériques et télécoms récents en Afrique." },
            { role: "user", content: searchQuery },
          ],
          search_recency_filter: "month",
        }),
      });

      if (perpRes.ok) {
        const perpData = await perpRes.json();
        searchResults = perpData.choices?.[0]?.message?.content || "";
      }
    }

    if (!searchResults) {
      searchResults = "Aucun résultat de recherche disponible. Analyse basée sur les connaissances.";
    }

    // Use Gemini to extract structured projects
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un analyste de veille concurrentielle pour l'ANSUT (Côte d'Ivoire). Tu compares les projets numériques des pays voisins avec ceux de l'ANSUT.

Projets clés de l'ANSUT :
- Backbone national fibre optique
- Connectivité scolaire (écoles rurales)
- Service Universel des Télécommunications
- Couverture 4G zones blanches
- Formation au numérique

Analyse les résultats de recherche et identifie les projets similaires chez les voisins.`,
          },
          { role: "user", content: `Résultats de recherche:\n${searchResults.substring(0, 6000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_projets",
            description: "Extraire les projets similaires",
            parameters: {
              type: "object",
              properties: {
                projets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      pays: { type: "string" },
                      titre: { type: "string" },
                      description: { type: "string" },
                      organisme: { type: "string" },
                      projet_ansut_equivalent: { type: "string" },
                      similitude_score: { type: "number", description: "0-100" },
                      recommandation_com: { type: "string", description: "Suggestion pour la Com ANSUT" },
                      source_url: { type: "string" },
                    },
                    required: ["pays", "titre", "description", "similitude_score"],
                  },
                },
              },
              required: ["projets"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_projets" } },
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response");

    const { projets } = JSON.parse(toolCall.function.arguments);
    let inserted = 0;

    for (const projet of projets) {
      // Deduplicate
      const { data: existing } = await supabase
        .from("radar_proximite")
        .select("id")
        .ilike("titre", `%${projet.titre.substring(0, 40)}%`)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error } = await supabase.from("radar_proximite").insert({
          pays: projet.pays,
          titre: projet.titre,
          description: projet.description,
          organisme: projet.organisme || null,
          projet_ansut_equivalent: projet.projet_ansut_equivalent || null,
          similitude_score: projet.similitude_score || 50,
          recommandation_com: projet.recommandation_com || null,
          source_url: projet.source_url || null,
        });
        if (!error) inserted++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, detected: inserted, total: projets.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("detecter-proximite error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
