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

    const { action, vip_compte_id, contenu, url_post, plateforme } = await req.json();

    // Action: scan - scan a specific VIP post for compliance
    if (action === "scan_post") {
      // Get VIP info
      const { data: vip } = await supabase
        .from("vip_comptes")
        .select("*, personnalites(nom, prenom, organisation)")
        .eq("id", vip_compte_id)
        .single();

      // Get active keywords for compliance check
      const { data: motsCles } = await supabase
        .from("mots_cles_veille")
        .select("mot_cle, variantes")
        .eq("actif", true)
        .limit(50);

      const keywords = motsCles?.map(m => m.mot_cle).join(", ") || "";

      const systemPrompt = `Tu es un analyste de communication institutionnelle pour l'ANSUT (Autorité Nationale du Service Universel des Télécommunications de Côte d'Ivoire).

Ton rôle est d'analyser les publications sur les réseaux sociaux des VIP internes (directeurs, DG) pour vérifier leur conformité avec la stratégie de communication.

Mots-clés stratégiques de l'ANSUT : ${keywords}

Hashtags officiels : #ANSUT, #ServiceUniversel, #DigitalCotedIvoire, #ANSUT_CI

Analyse le post suivant et retourne un JSON structuré.`;

      const userPrompt = `Auteur: ${vip?.nom || "Inconnu"} (${vip?.personnalites?.organisation || "ANSUT"})
Plateforme: ${plateforme}
Contenu du post:
"""
${contenu}
"""

Analyse ce post et retourne UNIQUEMENT un objet JSON avec:
{
  "conformite_score": (0-100, 100 = parfaitement aligné),
  "niveau_risque": "normal" | "attention" | "critique",
  "alignement_strategie": "oui" | "partiel" | "non",
  "hashtags_manquants": ["liste des hashtags officiels manquants"],
  "themes_detectes": ["liste des thèmes abordés"],
  "points_positifs": ["ce qui est bien"],
  "points_attention": ["ce qui pourrait poser problème"],
  "suggestion_amelioration": "texte court de suggestion pour la Com",
  "resume_executif": "résumé en 2 phrases pour la notification"
}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI gateway error: ${aiResponse.status} - ${errText}`);
      }

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "{}";
      
      // Extract JSON from response
      let analyse;
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        analyse = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        analyse = { resume_executif: rawContent, niveau_risque: "normal" };
      }

      // Insert VIP alert
      const { data: alerte, error: insertError } = await supabase
        .from("vip_alertes")
        .insert({
          vip_compte_id,
          contenu,
          url_post,
          plateforme,
          date_publication: new Date().toISOString(),
          analyse_conformite: analyse,
          niveau_risque: analyse.niveau_risque || "normal",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If critical, create a system alert
      if (analyse.niveau_risque === "critique" || analyse.niveau_risque === "attention") {
        await supabase.from("alertes").insert({
          type: "reputation",
          niveau: analyse.niveau_risque === "critique" ? "critique" : "warning",
          titre: `Publication VIP: ${vip?.nom || "Directeur"}`,
          message: analyse.resume_executif || `Post détecté sur ${plateforme} nécessitant attention.`,
          reference_type: "vip_alerte",
          reference_id: alerte.id,
        });
      }

      // Update last check timestamp
      await supabase
        .from("vip_comptes")
        .update({ derniere_verification: new Date().toISOString() })
        .eq("id", vip_compte_id);

      return new Response(JSON.stringify({ success: true, analyse, alerte }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: generate_crisis_checklist - auto crisis response
    if (action === "crisis_checklist") {
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
              content: `Tu es le directeur de la communication de crise de l'ANSUT. Génère une checklist de réponse immédiate en JSON.`,
            },
            {
              role: "user",
              content: `Post problématique détecté:
"""
${contenu}
"""
Auteur: VIP interne
Plateforme: ${plateforme}

Génère UNIQUEMENT un JSON:
{
  "urgence": "haute" | "moyenne" | "basse",
  "actions_immediates": ["action 1", "action 2", ...],
  "message_correctif_suggere": "texte à envoyer au VIP",
  "communique_presse": "brouillon si nécessaire ou null",
  "elements_langage": ["point clé 1", "point clé 2"],
  "delai_reaction_heures": number
}`,
            },
          ],
          temperature: 0.3,
        }),
      });

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "{}";
      let checklist;
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        checklist = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        checklist = { actions_immediates: [rawContent] };
      }

      return new Response(JSON.stringify({ success: true, checklist }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
