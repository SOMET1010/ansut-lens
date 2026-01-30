import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un expert en veille stratégique télécom pour l'ANSUT (Agence Nationale du Service Universel des Télécommunications) en Côte d'Ivoire.

À partir du nom et de la description d'un flux de veille, génère une configuration de surveillance optimale.

Contexte métier :
- Opérateurs : Orange CI, MTN Côte d'Ivoire, Moov Africa
- Régulateur : ARTCI (Autorité de Régulation des Télécommunications)
- Enjeux actuels : déploiement 5G, couverture fibre optique, inclusion numérique, satellites, mobile money (Wave, Orange Money)
- Thématiques clés : cybersécurité, e-gouvernement, transformation digitale, startups tech

Génère des mots-clés pertinents en français, adaptés au contexte ivoirien et africain.
Choisis les quadrants appropriés parmi : tech, market, regulation, reputation
Suggère un seuil d'importance entre 0 et 100 (plus élevé = plus sélectif).

Tu DOIS retourner UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "mots_cles": ["mot1", "mot2", "mot3", ...],
  "quadrants": ["tech", "regulation"],
  "importance_min": 50,
  "description": "Description courte et claire du flux de veille"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nom, description } = await req.json();

    if (!nom || nom.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Le nom du flux est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Configuration IA manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = `Nom du flux: ${nom.trim()}
Description: ${description?.trim() || 'Non fournie - génère une description appropriée'}`;

    console.log("Generating flux configuration for:", nom);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Réponse IA vide" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the AI response
    let config;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        config = JSON.parse(jsonMatch[0]);
      } else {
        config = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Format de réponse IA invalide" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize the response
    const validQuadrants = ["tech", "market", "regulation", "reputation"];
    const result = {
      mots_cles: Array.isArray(config.mots_cles) 
        ? config.mots_cles.filter((k: unknown) => typeof k === 'string').slice(0, 10)
        : [],
      quadrants: Array.isArray(config.quadrants)
        ? config.quadrants.filter((q: unknown) => typeof q === 'string' && validQuadrants.includes(q as string))
        : [],
      importance_min: typeof config.importance_min === 'number' 
        ? Math.min(100, Math.max(0, Math.round(config.importance_min)))
        : 50,
      description: typeof config.description === 'string' 
        ? config.description.slice(0, 200)
        : "",
    };

    console.log("Generated configuration:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generer-requete-flux error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
