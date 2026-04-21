// Using native Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nom_evenement, date_debut, date_fin, mots_cles, contexte } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch related articles from the period
    const { data: articles } = await supabase
      .from("actualites")
      .select("titre, resume, source_nom, source_url, sentiment, importance, impact_ansut, date_publication")
      .gte("date_publication", date_debut)
      .lte("date_publication", date_fin)
      .order("importance", { ascending: false })
      .limit(30);

    // Fetch social insights from the period
    const { data: insights } = await supabase
      .from("social_insights")
      .select("plateforme, contenu, auteur, sentiment, engagement_score, date_publication")
      .gte("created_at", date_debut)
      .lte("created_at", date_fin)
      .order("engagement_score", { ascending: false })
      .limit(20);

    const prompt = `Tu es analyste stratégique de l'ANSUT (Agence du Service Universel des Télécommunications de Côte d'Ivoire), expert télécoms / Service Universel / IA appliquée aux réseaux en Afrique.

CADRE D'ANALYSE OBLIGATOIRE — applique-le à toute interprétation :
1. SERVICE UNIVERSEL : Accès / Usages / Impact populations
2. IA & COMMUNICATIONS ÉLECTRONIQUES : Optimisation réseau / Inclusion (voice-first, low literacy, offline) / Réduction coûts / Souveraineté

CONTRAINTES STRICTES :
- Ne JAMAIS inventer un fait ou un chiffre
- Si donnée incertaine → "information non disponible"
- Ignorer ce qui n'a pas de lien ANSUT / Service Universel / IA télécom
- Pas de généralité non actionnable

Génère un **Rapport d'Impact Rétrospectif** pour l'événement "${nom_evenement}" (${date_debut} à ${date_fin}).

${contexte ? `Contexte additionnel fourni par l'utilisateur : ${contexte}` : ''}

Mots-clés de l'événement : ${(mots_cles || []).join(', ')}

Articles collectés durant la période (${articles?.length || 0}) :
${articles?.map(a => `- [${a.importance}/100] ${a.titre} (${a.source_nom}) - Sentiment: ${a.sentiment} - Impact ANSUT: ${a.impact_ansut || 'non évalué'}`).join('\n') || 'Aucun article trouvé'}

Insights sociaux collectés (${insights?.length || 0}) :
${insights?.map(i => `- [${i.plateforme}] ${i.contenu?.substring(0, 100)}... (engagement: ${i.engagement_score})`).join('\n') || 'Aucun insight'}

Génère le rapport en JSON avec cette structure :
{
  "resume_executif": "3-4 phrases résumant la couverture, ancrées sur le cadre Service Universel + IA",
  "couverture_medias": {
    "articles_trouves": number,
    "sentiment_moyen": number,
    "sources_principales": ["source1", "source2"]
  },
  "presence_ansut": {
    "mentionnee": boolean,
    "contexte": "comment l'ANSUT a été mentionnée (ou non), via quel angle Service Universel/IA",
    "visibilite_score": number
  },
  "impact_service_universel": {
    "acces": "lecture sur la couverture/infrastructures/zones blanches ou 'information non disponible'",
    "usages": "lecture sur l'adoption/services numériques/inclusion ou 'information non disponible'",
    "impact_population": "effets socio-économiques observables ou 'information non disponible'"
  },
  "innovation_ia_identifiee": "innovation IA pour réseaux/services repérée dans la période, ou 'information non disponible'",
  "temps_forts": ["fait marquant 1", "fait marquant 2", "fait marquant 3"],
  "risques_opportunites": ["risque ou opportunité 1 actionnable", "..."],
  "opportunites_manquees": ["opportunité 1", "opportunité 2"],
  "recommandations": ["recommandation ANSUT concrète 1", "recommandation 2", "recommandation 3"],
  "post_linkedin_rattrapage": "Post LinkedIn 150 mots que la Com peut publier maintenant pour capitaliser, avec un angle Service Universel ou IA"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error ${aiResponse.status}: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let rapport = null;
    if (jsonMatch) {
      try { rapport = JSON.parse(jsonMatch[0]); } catch { rapport = null; }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rapport,
        raw_content: content,
        stats: {
          articles_analyses: articles?.length || 0,
          insights_analyses: insights?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
