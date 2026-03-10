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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);
    const { image_url, source_url, plateforme, auteur } = await req.json();

    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Gemini multimodal to analyze the image
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
            content: `Tu es un analyste visuel pour l'ANSUT (Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire).

Analyse cette image et identifie :
1. Les logos visibles (ANSUT, opérateurs télécom, partenaires, institutions)
2. Le contexte (conférence, signature, terrain, bureau, événement)
3. Les personnalités reconnaissables si possible
4. La pertinence pour l'ANSUT (score 0-100)
5. Les éléments textuels visibles (slides, panneaux, badges)

Logos à surveiller particulièrement : ANSUT, Orange, MTN, Moov, ARTCI, Huawei, ZTE, Nokia, Ericsson, Banque Mondiale, BAD, UIT, Smart Africa.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyse cette image provenant de ${plateforme || "réseau social"} (auteur: ${auteur || "inconnu"}). Source: ${source_url || "non spécifiée"}` },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyse_image",
            description: "Résultat de l'analyse visuelle",
            parameters: {
              type: "object",
              properties: {
                logos_detectes: { type: "array", items: { type: "string" }, description: "Logos identifiés" },
                contexte: { type: "string", description: "Description du contexte" },
                personnalites: { type: "array", items: { type: "string" }, description: "Personnalités identifiées" },
                texte_visible: { type: "string", description: "Texte visible dans l'image" },
                pertinence_ansut: { type: "boolean", description: "Image pertinente pour l'ANSUT" },
                score_pertinence: { type: "number", description: "Score 0-100" },
                recommandation: { type: "string", description: "Action recommandée pour la Com" },
              },
              required: ["logos_detectes", "contexte", "pertinence_ansut", "score_pertinence"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyse_image" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      throw new Error(`AI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response");

    const result = JSON.parse(toolCall.function.arguments);

    // Store in analyses_visuelles
    const { error: insertErr } = await supabase.from("analyses_visuelles").insert({
      image_url,
      source_url: source_url || null,
      plateforme: plateforme || null,
      auteur: auteur || null,
      logos_detectes: result.logos_detectes || [],
      pertinence_ansut: result.pertinence_ansut || false,
      score_pertinence: result.score_pertinence || 0,
      resultat_analyse: result,
    });

    if (insertErr) console.error("Insert error:", insertErr);

    // If highly relevant, create an alert
    if (result.score_pertinence >= 70) {
      await supabase.from("alertes").insert({
        type: "analyse_visuelle",
        niveau: result.score_pertinence >= 90 ? "critical" : "info",
        titre: `Image pertinente détectée (${result.logos_detectes?.join(", ") || "logos"})`,
        message: `${result.contexte}. ${result.recommandation || ""}`.trim(),
        reference_type: "analyse_visuelle",
      });
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyser-visuel error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
