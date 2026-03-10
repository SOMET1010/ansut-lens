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
    const supabase = createClient(supabaseUrl, serviceKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { publication_id, mode = "single" } = await req.json().catch(() => ({ mode: "batch" }));

    // Get publications to analyze
    let publications: any[];
    if (mode === "single" && publication_id) {
      const { data } = await supabase
        .from("publications_institutionnelles")
        .select("*")
        .eq("id", publication_id);
      publications = data || [];
    } else {
      // Batch: analyze recent publications without echo metrics
      const { data } = await supabase
        .from("publications_institutionnelles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      publications = data || [];
    }

    // Get recent press articles for comparison
    const { data: actualites } = await supabase
      .from("actualites")
      .select("titre, resume, source_nom, date_publication, tags")
      .gte("date_publication", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("date_publication", { ascending: false })
      .limit(100);

    // Get influencers for citation detection
    const { data: influenceurs } = await supabase
      .from("influenceurs_metier")
      .select("nom, organisation, plateforme")
      .eq("actif", true);

    const results: any[] = [];

    for (const pub of publications) {
      try {
        // Check if echo metrics already exist
        const { data: existing } = await supabase
          .from("echo_metrics")
          .select("id")
          .eq("publication_id", pub.id)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const prompt = `Analyse la résonance de cette publication institutionnelle ANSUT :

PUBLICATION ANSUT :
- Plateforme : ${pub.plateforme}
- Date : ${pub.date_publication}
- Contenu : ${pub.contenu?.substring(0, 1000)}
- Likes : ${pub.likes_count}, Partages : ${pub.shares_count}, Commentaires : ${pub.comments_count}

ARTICLES DE PRESSE RÉCENTS (pour détecter les reprises) :
${(actualites || []).slice(0, 30).map((a: any) => `- ${a.titre} (${a.source_nom})`).join("\n")}

INFLUENCEURS SUIVIS :
${(influenceurs || []).slice(0, 20).map((i: any) => `- ${i.nom} (${i.organisation}, ${i.plateforme})`).join("\n")}

Analyse :
1. Combien d'articles de presse ont repris ou fait écho à cette publication ?
2. Quels influenceurs l'ont potentiellement citée ?
3. Estime la portée totale (en nombre de personnes atteintes)
4. Score de résonance sur 100
5. Y a-t-il un gap entre l'effort de communication et la couverture obtenue ?
6. Recommandation pour améliorer la résonance`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un analyste en communication institutionnelle spécialisé en Côte d'Ivoire." },
              { role: "user", content: prompt },
            ],
            tools: [{
              type: "function",
              function: {
                name: "echo_analysis",
                description: "Analyze publication echo and resonance",
                parameters: {
                  type: "object",
                  properties: {
                    nb_reprises_presse: { type: "integer" },
                    sources_reprises: { type: "array", items: { type: "string" } },
                    nb_citations_influenceurs: { type: "integer" },
                    influenceurs_citant: { type: "array", items: { type: "string" } },
                    portee_estimee: { type: "integer" },
                    score_resonance: { type: "number" },
                    gap_media: { type: "string" },
                    recommandation_ia: { type: "string" },
                  },
                  required: ["nb_reprises_presse", "score_resonance", "recommandation_ia"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "echo_analysis" } },
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const analysis = JSON.parse(toolCall.function.arguments);
            
            await supabase.from("echo_metrics").insert({
              publication_id: pub.id,
              nb_reprises_presse: analysis.nb_reprises_presse || 0,
              sources_reprises: analysis.sources_reprises || [],
              nb_citations_influenceurs: analysis.nb_citations_influenceurs || 0,
              influenceurs_citant: analysis.influenceurs_citant || [],
              portee_estimee: analysis.portee_estimee || 0,
              score_resonance: Math.min(100, Math.max(0, analysis.score_resonance || 0)),
              gap_media: analysis.gap_media,
              recommandation_ia: analysis.recommandation_ia,
            });

            results.push({ publication_id: pub.id, score: analysis.score_resonance });
          }
        }
      } catch (e) {
        console.error(`Error analyzing pub ${pub.id}:`, e);
      }
    }

    // Generate Share of Voice report for current month
    if (mode === "batch" || mode === "share_of_voice") {
      const now = new Date();
      const mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { count: pubCount } = await supabase
        .from("publications_institutionnelles")
        .select("*", { count: "exact", head: true })
        .gte("date_publication", startOfMonth)
        .lte("date_publication", endOfMonth);

      const { count: pressCount } = await supabase
        .from("actualites")
        .select("*", { count: "exact", head: true })
        .gte("date_publication", startOfMonth)
        .lte("date_publication", endOfMonth)
        .or("titre.ilike.%ansut%,contenu.ilike.%ansut%,tags.cs.{ANSUT}");

      const { count: socialCount } = await supabase
        .from("social_insights")
        .select("*", { count: "exact", head: true })
        .gte("date_publication", startOfMonth)
        .lte("date_publication", endOfMonth);

      const nbPub = pubCount || 0;
      const nbPress = pressCount || 0;
      const ratio = nbPub > 0 ? (nbPress / nbPub) : 0;

      // Check if already exists for this month
      const { data: existingVoix } = await supabase
        .from("part_de_voix")
        .select("id")
        .eq("periode", periode)
        .limit(1);

      if (!existingVoix || existingVoix.length === 0) {
        const gapText = ratio < 0.5
          ? `Gap important : seulement ${nbPress} articles pour ${nbPub} publications. Suggestion : kit média + relances presse.`
          : ratio > 2
          ? `Excellente couverture : ${nbPress} articles pour ${nbPub} publications. La presse reprend bien vos actions.`
          : `Couverture correcte : ${nbPress} articles pour ${nbPub} publications.`;

        await supabase.from("part_de_voix").insert({
          periode,
          mois,
          nb_publications_ansut: nbPub,
          nb_articles_presse: nbPress,
          nb_mentions_social: socialCount || 0,
          ratio_earned_owned: Math.round(ratio * 100) / 100,
          gap_analyse: gapText,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, analyzed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyser-echo-resonance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
