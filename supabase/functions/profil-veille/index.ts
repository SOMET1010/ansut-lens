import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth user
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const supabase = createClient(supabaseUrl, serviceKey);
    const { mode = "profile" } = await req.json().catch(() => ({ mode: "profile" }));

    if (mode === "profile") {
      // Get user interactions last 30 days
      const { data: interactions } = await supabase
        .from("user_interactions")
        .select("resource_type, action, metadata, created_at")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(200);

      // Get user feedback
      const { data: feedback } = await supabase
        .from("actualites_feedback")
        .select("feedback, actualites(titre, categorie, tags)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, department")
        .eq("id", userId)
        .single();

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      const prompt = `Analyse le comportement de veille de cet utilisateur RADAR et génère un portrait de veille personnalisé.

UTILISATEUR :
- Nom : ${profile?.full_name || "Inconnu"}
- Département : ${profile?.department || "Non spécifié"}
- Rôle : ${roleData?.role || "user"}

INTERACTIONS (${(interactions || []).length} dernières) :
${(interactions || []).slice(0, 50).map((i: any) => 
  `- ${i.action} sur ${i.resource_type} | ${JSON.stringify(i.metadata || {})}`
).join("\n")}

FEEDBACK SUR ACTUALITÉS (${(feedback || []).length} retours) :
${(feedback || []).slice(0, 30).map((f: any) => {
  const actu = f.actualites as any;
  return `- ${f.feedback}: "${actu?.titre}" [${actu?.categorie}] tags: ${JSON.stringify(actu?.tags || [])}`;
}).join("\n")}

Génère un profil de veille structuré avec :
1. Sujets favoris (ce que l'utilisateur consulte le plus)
2. Sujets ignorés (ce qu'il évite systématiquement)
3. Catégories préférées
4. Quadrants d'intérêt (tech, market, regulation, reputation)
5. Pays d'intérêt
6. Portrait narratif (2-3 phrases décrivant le profil de veille)`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Tu es un analyste de comportement de veille stratégique." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "generate_profile",
              description: "Generate user watch profile",
              parameters: {
                type: "object",
                properties: {
                  sujets_favoris: { type: "array", items: { type: "string" } },
                  sujets_ignores: { type: "array", items: { type: "string" } },
                  categories_preferees: { type: "array", items: { type: "string" } },
                  quadrants_preferes: { type: "array", items: { type: "string" } },
                  pays_interet: { type: "array", items: { type: "string" } },
                  portrait_ia: { type: "string" },
                },
                required: ["sujets_favoris", "categories_preferees", "portrait_ia"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "generate_profile" } },
        }),
      });

      if (!aiRes.ok) {
        const t = await aiRes.text();
        console.error("AI error:", aiRes.status, t);
        throw new Error("AI analysis failed");
      }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call response");

      const profileData = JSON.parse(toolCall.function.arguments);

      // Upsert preferences
      const { error: upsertErr } = await supabase
        .from("user_preferences_ia")
        .upsert({
          user_id: userId,
          sujets_favoris: profileData.sujets_favoris || [],
          sujets_ignores: profileData.sujets_ignores || [],
          categories_preferees: profileData.categories_preferees || [],
          quadrants_preferes: profileData.quadrants_preferes || [],
          pays_interet: profileData.pays_interet || [],
          portrait_ia: profileData.portrait_ia,
          derniere_analyse: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertErr) console.error("Upsert error:", upsertErr);

      return new Response(
        JSON.stringify({ success: true, profile: profileData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "recommend") {
      // Get user preferences
      const { data: prefs } = await supabase
        .from("user_preferences_ia")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Get recent actualites
      const { data: actualites } = await supabase
        .from("actualites")
        .select("id, titre, resume, categorie, tags, importance, date_publication")
        .order("date_publication", { ascending: false })
        .limit(50);

      // Get user feedback to exclude
      const { data: feedbackData } = await supabase
        .from("actualites_feedback")
        .select("actualite_id, feedback")
        .eq("user_id", userId);

      const rejectedIds = new Set(
        (feedbackData || []).filter((f: any) => f.feedback === "non_pertinent").map((f: any) => f.actualite_id)
      );
      const likedIds = new Set(
        (feedbackData || []).filter((f: any) => f.feedback === "pertinent" || f.feedback === "important").map((f: any) => f.actualite_id)
      );

      // Score each actualite
      const scored = (actualites || [])
        .filter((a: any) => !rejectedIds.has(a.id))
        .map((a: any) => {
          const importance = (a.importance || 50) / 100;
          let affinity = 0.5;

          if (prefs) {
            const favs = prefs.sujets_favoris || [];
            const cats = prefs.categories_preferees || [];
            const tags = a.tags || [];
            
            // Check tag overlap with favorites
            const tagMatch = tags.filter((t: string) => 
              favs.some((f: string) => t.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(t.toLowerCase()))
            ).length;
            
            // Check category match
            const catMatch = cats.includes(a.categorie) ? 1 : 0;
            
            affinity = Math.min(1, 0.3 + tagMatch * 0.2 + catMatch * 0.3);
          }

          if (likedIds.has(a.id)) affinity = Math.min(1, affinity + 0.2);

          const score = importance * 0.4 + affinity * 0.6;
          return { ...a, score_personnalise: Math.round(score * 100) };
        })
        .sort((a: any, b: any) => b.score_personnalise - a.score_personnalise);

      return new Response(
        JSON.stringify({ success: true, recommendations: scored.slice(0, 20) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid mode" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("profil-veille error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
