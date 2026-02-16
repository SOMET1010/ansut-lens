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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { personnalite_id, batch } = body;

    // Mode batch: calcul pour tous les acteurs suivis
    if (batch) {
      const startTime = Date.now();

      const { data: acteurs, error: errActeurs } = await supabase
        .from("personnalites")
        .select("id")
        .eq("suivi_spdi_actif", true);
      if (errActeurs) throw errActeurs;

      const results: { id: string; score: number | null; error?: string }[] = [];
      for (const acteur of (acteurs || [])) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/calculer-spdi`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ personnalite_id: acteur.id }),
          });
          const data = await res.json();
          results.push({ id: acteur.id, score: data.score_final ?? null, error: data.error });
        } catch (e) {
          results.push({ id: acteur.id, score: null, error: e instanceof Error ? e.message : "unknown" });
        }
      }

      const durationMs = Date.now() - startTime;
      const hasErrors = results.some(r => r.error);

      // Log dans collectes_log pour déclencher les notifications temps réel
      await supabase.from("collectes_log").insert({
        type: "calcul-spdi",
        statut: hasErrors ? "error" : "success",
        nb_resultats: results.length,
        duree_ms: durationMs,
        erreur: hasErrors
          ? results.filter(r => r.error).map(r => `${r.id}: ${r.error}`).join("; ").slice(0, 500)
          : null,
        mots_cles_utilises: ["spdi", "batch"],
      });

      console.log(`[calculer-spdi] Batch terminé: ${results.length} acteurs traités en ${durationMs}ms`);
      return new Response(
        JSON.stringify({ batch: true, count: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!personnalite_id) throw new Error("personnalite_id requis");

    // 1. Get the personnalite
    const { data: perso, error: errPerso } = await supabase
      .from("personnalites")
      .select("id, nom, prenom, cercle, thematiques, organisation")
      .eq("id", personnalite_id)
      .single();
    if (errPerso) throw errPerso;

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    // 2. Count mentions linked to this personnalite (last 30 days)
    const { data: mentionLinks } = await supabase
      .from("personnalites_mentions")
      .select("mention_id")
      .eq("personnalite_id", personnalite_id);
    
    const mentionIds = (mentionLinks || []).map(m => m.mention_id);
    
    let mentionsData: any[] = [];
    if (mentionIds.length > 0) {
      const { data } = await supabase
        .from("mentions")
        .select("*")
        .in("id", mentionIds)
        .gte("date_mention", thirtyDaysAgo);
      mentionsData = data || [];
    }

    // 3. Count actualites that mention this person (by name)
    const searchName = `${perso.prenom || ''} ${perso.nom}`.trim();
    const { data: articles } = await supabase
      .from("actualites")
      .select("*")
      .gte("date_publication", thirtyDaysAgo)
      .or(`titre.ilike.%${searchName}%,contenu.ilike.%${searchName}%,resume.ilike.%${searchName}%`);

    const articlesData = articles || [];

    // 4. Social insights mentioning this person
    const { data: socialData } = await supabase
      .from("social_insights")
      .select("*")
      .gte("date_publication", thirtyDaysAgo)
      .or(`contenu.ilike.%${searchName}%,auteur.ilike.%${searchName}%`);

    const socialInsights = socialData || [];

    // === Compute axes ===
    const nbMentions = mentionsData.length + articlesData.length + socialInsights.length;
    const sourceSet = new Set([
      ...mentionsData.map(m => m.source || "unknown"),
      ...articlesData.map(a => a.source_nom || "unknown"),
      ...socialInsights.map(s => s.plateforme),
    ]);
    const nbSources = sourceSet.size;

    // Regularity: number of distinct days with activity
    const days = new Set([
      ...mentionsData.map(m => m.date_mention?.split("T")[0]).filter(Boolean),
      ...articlesData.map(a => a.date_publication?.split("T")[0]).filter(Boolean),
      ...socialInsights.map(s => s.date_publication?.split("T")[0]).filter(Boolean),
    ]);
    const regularite = Math.min((days.size / 30) * 100, 100);

    // Visibility score (30% weight)
    const scoreVisibilite = Math.min(
      (nbMentions / 20) * 40 + (nbSources / 5) * 30 + regularite * 0.3,
      100
    );

    // Quality: sentiment analysis
    const allSentiments = [
      ...mentionsData.map(m => m.sentiment).filter((s: any) => s !== null),
      ...articlesData.map(a => a.sentiment).filter((s: any) => s !== null),
      ...socialInsights.map(s => s.sentiment).filter((s: any) => s !== null),
    ];
    const sentimentMoyen = allSentiments.length > 0
      ? allSentiments.reduce((a: number, b: number) => a + b, 0) / allSentiments.length
      : 0;

    // Themes: check how many match the acteur's thematiques
    const themes = perso.thematiques || [];
    const allTags = articlesData.flatMap(a => a.tags || []);
    const matchedThemes = themes.length > 0
      ? allTags.filter((t: string) => themes.some((th: string) => t.toLowerCase().includes(th.toLowerCase()))).length
      : 0;
    const pctThemesStrategiques = allTags.length > 0 ? (matchedThemes / allTags.length) * 100 : 0;

    const nbControverses = mentionsData.filter((m: any) => m.est_critique).length +
      socialInsights.filter((s: any) => s.est_critique).length;

    const scoreQualite = Math.min(
      ((sentimentMoyen + 1) / 2) * 50 + Math.min(pctThemesStrategiques, 100) * 0.3 + Math.max(0, 20 - nbControverses * 5),
      100
    );

    // Authority
    const citationsDirectes = mentionsData.filter((m: any) => m.score_influence > 5).length;
    const referencesArticles = articlesData.filter((a: any) => (a.importance || 0) >= 7).length;
    const scoreAutorite = Math.min(
      citationsDirectes * 10 + referencesArticles * 8 + nbSources * 5,
      100
    );

    // Presence (LinkedIn focus)
    const linkedinInsights = socialInsights.filter((s: any) => s.plateforme === "linkedin");
    const activiteLinkedin = linkedinInsights.length;
    const engagementLinkedin = linkedinInsights.reduce((acc: number, s: any) => 
      acc + (s.likes_count || 0) + (s.comments_count || 0) + (s.shares_count || 0), 0);
    const scorePresence = Math.min(
      activiteLinkedin * 15 + Math.min(engagementLinkedin, 200) * 0.25 + regularite * 0.25,
      100
    );

    // Composite SPDI score
    const scoreFinal = scoreVisibilite * 0.30 + scoreQualite * 0.25 + scoreAutorite * 0.25 + scorePresence * 0.20;

    // Interpretation
    let interpretation = "risque_invisibilite";
    if (scoreFinal >= 80) interpretation = "presence_forte";
    else if (scoreFinal >= 60) interpretation = "presence_solide";
    else if (scoreFinal >= 40) interpretation = "visibilite_faible";

    // 5. Upsert metric for today
    const { error: errInsert } = await supabase
      .from("presence_digitale_metrics")
      .upsert({
        personnalite_id,
        date_mesure: today,
        score_visibilite: Math.round(scoreVisibilite * 10) / 10,
        score_qualite: Math.round(scoreQualite * 10) / 10,
        score_autorite: Math.round(scoreAutorite * 10) / 10,
        score_presence: Math.round(scorePresence * 10) / 10,
        score_spdi: Math.round(scoreFinal * 10) / 10,
        interpretation,
        nb_mentions: nbMentions,
        nb_sources_distinctes: nbSources,
        regularite_mentions: Math.round(regularite * 10) / 10,
        sentiment_moyen: Math.round(Math.max(-9.99, Math.min(9.99, sentimentMoyen)) * 100) / 100,
        pct_themes_strategiques: Math.round(pctThemesStrategiques * 10) / 10,
        nb_controverses: nbControverses,
        nb_citations_directes: citationsDirectes,
        nb_invitations_panels: 0,
        nb_references_croisees: referencesArticles,
        activite_linkedin: activiteLinkedin,
        engagement_linkedin: engagementLinkedin,
        coherence_message: Math.round(pctThemesStrategiques * 10) / 10,
      }, { onConflict: "personnalite_id,date_mesure" });

    if (errInsert) throw errInsert;

    // 6. Update personnalite with latest score
    const tendance = scoreFinal >= 60 ? "up" : scoreFinal >= 40 ? "stable" : "down";
    await supabase
      .from("personnalites")
      .update({
        score_spdi_actuel: Math.round(scoreFinal * 10) / 10,
        tendance_spdi: tendance,
        derniere_mesure_spdi: today,
      })
      .eq("id", personnalite_id);

    return new Response(
      JSON.stringify({ score_final: Math.round(scoreFinal * 10) / 10, interpretation, axes: { scoreVisibilite, scoreQualite, scoreAutorite, scorePresence } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("calculer-spdi error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
