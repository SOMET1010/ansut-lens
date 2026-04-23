import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isValidUrl(u?: string | null): boolean {
  if (!u || typeof u !== 'string') return false;
  try {
    const p = new URL(u);
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch { return false; }
}

// Resolve a possibly-marker source ("[1]", "1", "Non spécifié") into a real URL via citations array
function resolveSource(raw: string | null | undefined, citations: string[]): string | null {
  if (!raw) return citations[0] || null;
  if (isValidUrl(raw)) return raw;
  // Match "[N]" or bare "N"
  const m = String(raw).match(/(\d+)/);
  if (m) {
    const idx = parseInt(m[1], 10) - 1;
    if (idx >= 0 && idx < citations.length && isValidUrl(citations[idx])) {
      return citations[idx];
    }
  }
  // Fallback: first valid citation if any
  return citations.find(isValidUrl) || null;
}

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

    const searchQuery = `Projets récents en Afrique de l'Ouest et centrale sur: ${themes.slice(0, 4).join(", ")}. Pays: ${pays.join(", ")}. Derniers 30 jours.`;

    let searchResults = "";
    let citations: string[] = [];

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
            { role: "system", content: "Recherche les projets gouvernementaux numériques et télécoms récents en Afrique. Cite tes sources." },
            { role: "user", content: searchQuery },
          ],
          search_recency_filter: "month",
          return_citations: true,
        }),
      });

      if (perpRes.ok) {
        const perpData = await perpRes.json();
        searchResults = perpData.choices?.[0]?.message?.content || "";
        citations = Array.isArray(perpData.citations) ? perpData.citations.filter(isValidUrl) : [];
      }
    }

    if (!searchResults) {
      searchResults = "Aucun résultat de recherche disponible.";
    }

    // Build a clear citation legend for the model so it returns real URLs
    const citationLegend = citations.length
      ? `\n\nSOURCES DISPONIBLES (utilise ces URLs EXACTES pour le champ source_url, jamais "[1]" ou "Non spécifié") :\n${citations.map((u, i) => `[${i + 1}] ${u}`).join('\n')}`
      : '';

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

RÈGLES STRICTES :
- N'extrait QUE des projets explicitement mentionnés dans les résultats.
- Le champ source_url DOIT être une URL http(s) complète prise dans la liste SOURCES DISPONIBLES. JAMAIS "[1]", "Non spécifié" ou un numéro nu.
- Si aucune URL réelle n'est disponible pour un projet, ne l'extrait pas.
- Le champ raison_proximite explique en 1 phrase POURQUOI ce projet ressemble à un projet ANSUT (mots-clés communs, type d'infrastructure, public cible, etc.).`,
          },
          { role: "user", content: `Résultats de recherche:\n${searchResults.substring(0, 6000)}${citationLegend}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_projets",
            description: "Extraire les projets similaires avec sourcing vérifiable",
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
                      similitude_score: { type: "number", description: "0-100, basé sur la convergence d'objectifs/cibles/infrastructure" },
                      recommandation_com: { type: "string" },
                      source_url: { type: "string", description: "URL http(s) COMPLÈTE issue des SOURCES DISPONIBLES" },
                      raison_proximite: { type: "string", description: "Pourquoi ce projet est dans le radar (1 phrase)" },
                    },
                    required: ["pays", "titre", "description", "similitude_score", "source_url", "raison_proximite"],
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
    let skippedNoSource = 0;

    for (const projet of projets) {
      // Resolve & validate source_url; reject if no real URL
      const resolvedUrl = resolveSource(projet.source_url, citations);
      if (!resolvedUrl) {
        skippedNoSource++;
        continue;
      }

      // Append "Pourquoi" reasoning to recommandation_com so existing UI fields surface it
      const recoEnriched = [
        projet.raison_proximite ? `🔎 Pourquoi : ${projet.raison_proximite}` : null,
        projet.recommandation_com ? `💡 ${projet.recommandation_com}` : null,
      ].filter(Boolean).join('\n\n');

      // Deduplicate by title prefix
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
          recommandation_com: recoEnriched || null,
          source_url: resolvedUrl,
        });
        if (!error) inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        detected: inserted,
        total: projets.length,
        skipped_no_source: skippedNoSource,
        citations_count: citations.length,
      }),
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
