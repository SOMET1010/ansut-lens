import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, image_url, source_url, plateforme, auteur } = await req.json();

    if (action === "analyse_image") {
      if (!image_url) throw new Error("image_url requis");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Tu es un analyste visuel pour l'ANSUT (Autorité Nationale du Service Universel des Télécommunications) de Côte d'Ivoire.
Tu analyses les images provenant des réseaux sociaux pour détecter :
- La présence du logo ANSUT ou de partenaires (UIT, GSMA, Orange, MTN, Huawei, etc.)
- Des stands d'exposition, poignées de main officielles, signatures de conventions
- Des slides de présentation contenant des chiffres ou projets stratégiques
- Des personnalités identifiables du secteur télécom africain

Retourne UNIQUEMENT un JSON structuré.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyse cette image et retourne un JSON:
{
  "logos_detectes": ["liste des logos/marques identifiés"],
  "personnes_identifiees": ["si reconnaissables"],
  "contexte": "description du contexte (stand MWC, signature, conférence...)",
  "pertinence_ansut": true/false,
  "score_pertinence": 0-100,
  "type_evenement": "conference | stand | signature | reunion | autre",
  "texte_visible": "tout texte lisible sur l'image",
  "recommandation_com": "suggestion pour la Com si pertinent"
}`,
                },
                {
                  type: "image_url",
                  image_url: { url: image_url },
                },
              ],
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI error: ${aiResponse.status} - ${errText}`);
      }

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "{}";

      let analyse;
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        analyse = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        analyse = { contexte: rawContent };
      }

      // Store result
      const { data, error } = await supabase.from("analyses_visuelles").insert({
        image_url,
        source_url,
        plateforme,
        auteur,
        resultat_analyse: analyse,
        logos_detectes: analyse.logos_detectes || [],
        pertinence_ansut: analyse.pertinence_ansut || false,
        score_pertinence: analyse.score_pertinence || 0,
      }).select().single();

      if (error) throw error;

      // Alert if relevant
      if (analyse.pertinence_ansut && analyse.score_pertinence > 60) {
        await supabase.from("alertes").insert({
          type: "visuel",
          niveau: analyse.score_pertinence > 80 ? "critique" : "info",
          titre: `Image ANSUT détectée: ${analyse.contexte?.substring(0, 60) || "Analyse visuelle"}`,
          message: analyse.recommandation_com || `Logos détectés: ${(analyse.logos_detectes || []).join(", ")}`,
          reference_type: "analyse_visuelle",
          reference_id: data.id,
        });
      }

      return new Response(JSON.stringify({ success: true, analyse, id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "radar_proximite") {
      // Get territories for context
      const { data: territoires } = await supabase
        .from("territoires_expression")
        .select("nom, concepts")
        .eq("actif", true);

      const conceptsList = territoires?.flatMap(t => t.concepts || []).join(", ") || "";

      const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
      const pays = ["Sénégal", "Ghana", "Nigeria", "Kenya", "Rwanda"];

      // Search for look-alike projects using Perplexity
      const searchQuery = `Projets récents de service universel, infrastructures télécoms ou inclusion numérique en ${pays.join(", ")}. Programmes similaires à l'ANSUT Côte d'Ivoire. Résultats des 30 derniers jours.`;

      let searchResults = "";
      if (perplexityKey) {
        const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${perplexityKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "system",
                content: "Tu es un analyste de veille sectorielle spécialisé en télécommunications africaines.",
              },
              { role: "user", content: searchQuery },
            ],
            temperature: 0.1,
          }),
        });

        if (perplexityResponse.ok) {
          const pData = await perplexityResponse.json();
          searchResults = pData.choices?.[0]?.message?.content || "";
        }
      }

      // Analyze with Gemini for structured output
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Tu es un analyste stratégique de l'ANSUT. Domaines de l'ANSUT: ${conceptsList}. Identifie les projets similaires chez les voisins africains et recommande des actions de communication.`,
            },
            {
              role: "user",
              content: `Voici les résultats de veille sur les projets voisins:\n\n${searchResults}\n\nExtrait les projets pertinents et retourne UNIQUEMENT un JSON array:\n[\n  {\n    "pays": "nom du pays",\n    "titre": "nom du projet",\n    "description": "résumé court",\n    "organisme": "qui le porte",\n    "similitude_score": 0-100,\n    "projet_ansut_equivalent": "projet ANSUT comparable ou null",\n    "recommandation_com": "ce que la Com ANSUT devrait faire"\n  }\n]`,
            },
          ],
          temperature: 0.2,
        }),
      });

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "[]";

      let projets;
      try {
        const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
        projets = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        projets = [];
      }

      // Insert into radar_proximite
      if (projets.length > 0) {
        const { error } = await supabase.from("radar_proximite").insert(
          projets.map((p: any) => ({
            pays: p.pays,
            titre: p.titre,
            description: p.description,
            organisme: p.organisme,
            similitude_score: p.similitude_score || 0,
            projet_ansut_equivalent: p.projet_ansut_equivalent,
            recommandation_com: p.recommandation_com,
          }))
        );
        if (error) console.error("Insert error:", error);
      }

      return new Response(JSON.stringify({ success: true, projets, count: projets.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
