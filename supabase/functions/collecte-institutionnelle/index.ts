import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: extract title from content
function extractTitle(contenu: string): string {
  const firstLine = contenu.split("\n")[0].replace(/^#+\s*/, "").trim();
  return firstLine.length > 10 ? firstLine.substring(0, 150) : contenu.substring(0, 150);
}

// Helper: inject publication into actualites table
async function injectIntoActualites(supabase: any, pub: {
  contenu: string;
  auteur: string;
  plateforme: string;
  url_original: string;
  date_publication: string;
  est_officiel: boolean;
  hashtags?: string[];
}) {
  const titre = extractTitle(pub.contenu);

  // Deduplicate by source_url
  if (pub.url_original) {
    const { data: existing } = await supabase
      .from("actualites")
      .select("id")
      .eq("source_url", pub.url_original)
      .limit(1);
    if (existing && existing.length > 0) return false;
  }

  const { error } = await supabase.from("actualites").insert({
    titre,
    contenu: pub.contenu,
    source_nom: pub.auteur || "ANSUT Officiel",
    source_url: pub.url_original,
    source_type: "institutionnel",
    date_publication: pub.date_publication,
    categorie: "institutionnel",
    tags: pub.hashtags || [],
    importance: pub.est_officiel ? 75 : 60,
    score_pertinence: 90,
    impact_ansut: "Publication propre de l'ANSUT",
  });

  return !error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    const { mode = "all" } = await req.json().catch(() => ({ mode: "all" }));

    const results: any[] = [];

    // 1. Collect from VIP accounts
    if (mode === "all" || mode === "vip") {
      const { data: vipComptes } = await supabase
        .from("vip_comptes")
        .select("*")
        .eq("actif", true);

      if (vipComptes && vipComptes.length > 0 && FIRECRAWL_API_KEY) {
        for (const compte of vipComptes) {
          try {
            const profileUrl = compte.url_profil || `https://${compte.plateforme}.com/${compte.identifiant}`;
            
            const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: profileUrl,
                formats: ["markdown"],
                onlyMainContent: true,
              }),
            });

            if (scrapeRes.ok) {
              const scrapeData = await scrapeRes.json();
              const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

              if (markdown.length > 100) {
                const posts = await extractPostsWithAI(LOVABLE_API_KEY, markdown, compte.plateforme);
                
                for (const post of posts) {
                  const contentHash = post.contenu?.substring(0, 100);
                  const { data: existing } = await supabase
                    .from("publications_institutionnelles")
                    .select("id")
                    .ilike("contenu", `%${contentHash}%`)
                    .limit(1);

                  if (!existing || existing.length === 0) {
                    const pubData = {
                      plateforme: compte.plateforme,
                      type_contenu: post.type || "post",
                      contenu: post.contenu,
                      url_original: profileUrl,
                      date_publication: post.date_estimee || new Date().toISOString(),
                      auteur: compte.nom,
                      est_officiel: compte.fonction?.toLowerCase().includes("officiel") || false,
                      hashtags: post.hashtags || [],
                      vip_compte_id: compte.id,
                    };

                    const { error } = await supabase
                      .from("publications_institutionnelles")
                      .insert(pubData);

                    if (!error) {
                      results.push({ source: compte.nom, post: post.contenu?.substring(0, 80) });
                      // Bridge: inject into actualites
                      await injectIntoActualites(supabase, pubData);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Error collecting from ${compte.nom}:`, e);
          }
        }
      }
    }

    // 2. Collect from ANSUT website
    if (FIRECRAWL_API_KEY && (mode === "all" || mode === "website")) {
      try {
        const articles = await collectFromWebsite(FIRECRAWL_API_KEY, LOVABLE_API_KEY);
        
        for (const article of articles) {
          const { data: existing } = await supabase
            .from("publications_institutionnelles")
            .select("id")
            .ilike("contenu", `%${article.titre?.substring(0, 50)}%`)
            .limit(1);

          if (!existing || existing.length === 0) {
            const contenu = `${article.titre}\n\n${article.resume || ""}`;
            const pubData = {
              plateforme: "website",
              type_contenu: "article",
              contenu,
              url_original: article.url || "https://www.ansut.ci",
              date_publication: article.date_estimee || new Date().toISOString(),
              auteur: "ANSUT",
              est_officiel: true,
              hashtags: [] as string[],
            };

            await supabase.from("publications_institutionnelles").insert(pubData);
            results.push({ source: "Site ANSUT", post: article.titre });
            // Bridge: inject into actualites
            await injectIntoActualites(supabase, pubData);
          }
        }
      } catch (e) {
        console.error("Error collecting from ANSUT website:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, collected: results.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("collecte-institutionnelle error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- AI helpers ---

async function extractPostsWithAI(apiKey: string, markdown: string, plateforme: string) {
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Tu es un extracteur de publications sociales. Extrais les posts récents (dernières 48h) du contenu scrappé d'un profil ${plateforme}.
Retourne un JSON array avec pour chaque post: { "contenu": "texte du post", "date_estimee": "ISO date", "hashtags": ["..."], "type": "post|article|partage" }
Si aucun post récent, retourne [].`,
        },
        { role: "user", content: markdown.substring(0, 8000) },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_posts",
          description: "Extract social media posts",
          parameters: {
            type: "object",
            properties: {
              posts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    contenu: { type: "string" },
                    date_estimee: { type: "string" },
                    hashtags: { type: "array", items: { type: "string" } },
                    type: { type: "string" },
                  },
                  required: ["contenu", "type"],
                },
              },
            },
            required: ["posts"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_posts" } },
    }),
  });

  if (!aiRes.ok) return [];
  const aiData = await aiRes.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return [];
  const { posts } = JSON.parse(toolCall.function.arguments);
  return posts || [];
}

async function collectFromWebsite(firecrawlKey: string, aiKey: string) {
  const siteRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: "https://www.ansut.ci/actualites",
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!siteRes.ok) return [];
  const siteData = await siteRes.json();
  const markdown = siteData.data?.markdown || siteData.markdown || "";
  if (markdown.length <= 100) return [];

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Extrais les articles/communiqués récents du site web ANSUT. Pour chaque article: { "titre": "...", "resume": "...", "date_estimee": "ISO date", "url": "..." }. Retourne un JSON array.`,
        },
        { role: "user", content: markdown.substring(0, 8000) },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_articles",
          description: "Extract website articles",
          parameters: {
            type: "object",
            properties: {
              articles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    titre: { type: "string" },
                    resume: { type: "string" },
                    date_estimee: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["titre"],
                },
              },
            },
            required: ["articles"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_articles" } },
    }),
  });

  if (!aiRes.ok) return [];
  const aiData = await aiRes.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return [];
  const { articles } = JSON.parse(toolCall.function.arguments);
  return articles || [];
}
