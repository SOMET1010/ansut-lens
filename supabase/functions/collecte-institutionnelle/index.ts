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

// Helper: valider une date de publication ABSOLUE extraite.
// On ne FABRIQUE jamais de date : si l'extraction n'a pas fourni de date réelle
// et vérifiable, on renvoie null. On rejette les dates futures ou absurdes.
function parseDateAbsolue(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const now = Date.now();
  if (d.getTime() > now + 24 * 3600 * 1000) return null; // pas de futur
  if (d.getFullYear() < 2000) return null; // pas d'aberration
  return d.toISOString();
}

/** Provenance de la date de publication (conservée durablement en base). */
type DateSource = 'absolute_source' | 'platform_metadata' | 'relative_text' | 'inferred' | 'unknown';

/**
 * Résout la datation d'un contenu à partir de la lecture d'extraction.
 *
 * RÈGLE FONDATRICE : `published_at` n'est renseigné QUE si une date ABSOLUE et
 * explicite est présente. Une mention RELATIVE affichée (« il y a 2 heures »,
 * « hier », « la semaine dernière ») n'est jamais convertie : elle reflète
 * l'instant du scraping, pas la vraie date de publication, et faisait passer des
 * contenus anciens (célébrations sportives, GITEX) pour « récents ». La date de
 * collecte ne sert JAMAIS de substitut.
 *
 * Deux origines FIABLES sont acceptées :
 *   - `absolute`  : une date absolue explicite est visible dans le texte
 *     (« 12 mars 2026 »).
 *   - `metadata`  : un horodatage machine ABSOLU a été lu dans le HTML — attribut
 *     `datetime`, `data-utime` (epoch), tooltip `title`, JSON-LD `datePublished`
 *     / `uploadDate`, `<meta article:published_time>`. Ces horodatages sont
 *     absolus MÊME QUAND l'affichage est relatif : c'est la vraie date de
 *     publication, pas une fabrication.
 * On conserve la PROVENANCE pour que le pipeline distingue durablement une date
 * fiable (et son origine) d'une date inconnue.
 */
function resoudreDatation(
  dateAbsolue: string | null | undefined,
  dateSourceBrute: string | null | undefined,
): { published_at: string | null; source: DateSource; verified: boolean } {
  const src = (dateSourceBrute || '').toLowerCase();
  if (src === 'absolute') {
    const d = parseDateAbsolue(dateAbsolue);
    if (d) return { published_at: d, source: 'absolute_source', verified: true };
    return { published_at: null, source: 'unknown', verified: false };
  }
  if (src === 'metadata') {
    // Horodatage machine absolu extrait du HTML → date vérifiée et tracée.
    const d = parseDateAbsolue(dateAbsolue);
    if (d) return { published_at: d, source: 'platform_metadata', verified: true };
    return { published_at: null, source: 'unknown', verified: false };
  }
  if (src === 'relative') {
    // Mention relative affichée → date d'origine NON vérifiée, jamais convertie.
    return { published_at: null, source: 'relative_text', verified: false };
  }
  return { published_at: null, source: 'unknown', verified: false };
}

/**
 * Extrait un horodatage de publication ABSOLU depuis les métadonnées machine
 * d'une page — sans IA, de façon déterministe et donc totalement traçable.
 *
 * Ordre de confiance : métadonnées déjà parsées par Firecrawl, puis JSON-LD,
 * puis balises meta, puis `<time datetime>`, puis `data-utime` (epoch Facebook).
 * Renvoie une date ISO validée (parseDateAbsolue) ou null. Convient pour une
 * page à contenu UNIQUE (un article, une vidéo) ; sur un flux multi-posts, la
 * date par post est lue par l'IA dans le bloc HTML de chaque post.
 */
function extraireDateMetadata(metadata: unknown, html: string | null): string | null {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>;
    const cles = [
      'publishedTime', 'article:published_time', 'og:article:published_time',
      'datePublished', 'date', 'og:updated_time', 'article:modified_time',
    ];
    for (const c of cles) {
      const v = m[c];
      const brut = typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : null;
      const d = parseDateAbsolue(brut);
      if (d) return d;
    }
  }
  if (!html) return null;
  const jsonld = html.match(/"(?:datePublished|uploadDate|dateCreated)"\s*:\s*"([^"]+)"/);
  if (jsonld) { const d = parseDateAbsolue(jsonld[1]); if (d) return d; }
  const meta =
    html.match(/<meta[^>]+(?:property|name|itemprop)=["'](?:article:published_time|datePublished|date)["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["'](?:article:published_time|datePublished)["']/i);
  if (meta) { const d = parseDateAbsolue(meta[1]); if (d) return d; }
  const time = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (time) { const d = parseDateAbsolue(time[1]); if (d) return d; }
  const utime = html.match(/data-utime=["'](\d{9,})["']/);
  if (utime) { const d = parseDateAbsolue(new Date(parseInt(utime[1], 10) * 1000).toISOString()); if (d) return d; }
  return null;
}

// Helper: inject publication into actualites table
async function injectIntoActualites(supabase: any, pub: {
  contenu: string;
  auteur: string;
  plateforme: string;
  url_original: string;
  date_publication: string | null;
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
    // Diagnostic traçable : pourquoi la collecte a (ou n'a pas) ramené du contenu.
    const diag: {
      firecrawl_configured: boolean;
      comptes_actifs: number;
      comptes: any[];
      website?: any;
    } = { firecrawl_configured: !!FIRECRAWL_API_KEY, comptes_actifs: 0, comptes: [] };

    // 1. Collect from VIP accounts
    if (mode === "all" || mode === "vip") {
      const { data: vipComptes } = await supabase
        .from("vip_comptes")
        .select("*")
        .eq("actif", true);

      diag.comptes_actifs = vipComptes?.length ?? 0;

      if (!FIRECRAWL_API_KEY) {
        diag.comptes.push({
          statut: "sans_cle",
          message: "FIRECRAWL_API_KEY non configurée — collecte réseau impossible.",
        });
      } else if (vipComptes && vipComptes.length > 0) {
        for (const compte of vipComptes) {
          let trouves = 0;
          let inseres = 0;
          let statut = "ok";
          let message = "";
          try {
            const profileUrl = compte.url_profil || `https://${compte.plateforme}.com/${compte.identifiant}`;

            const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                // HTML en plus du markdown : les horodatages machine (datetime,
                // data-utime, JSON-LD) vivent dans le HTML, pas dans le markdown.
                // onlyMainContent=false pour ne pas rogner ces attributs.
                url: profileUrl,
                formats: ["markdown", "html"],
                onlyMainContent: false,
              }),
            });

            if (!scrapeRes.ok) {
              statut = "injoignable";
              message = `Firecrawl a répondu HTTP ${scrapeRes.status}.`;
            } else {
              const scrapeData = await scrapeRes.json();
              const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
              const html = scrapeData.data?.html || scrapeData.html || "";

              if (markdown.length <= 100) {
                statut = "vide";
                message = `Contenu trop court (${markdown.length} car.) — page probablement protégée (mur de connexion) ou vide.`;
              } else {
                const posts = await extractPostsWithAI(LOVABLE_API_KEY, markdown, html, compte.plateforme);
                trouves = posts.length;

                for (const post of posts) {
                  const contentHash = post.contenu?.substring(0, 100);
                  const { data: existing } = await supabase
                    .from("publications_institutionnelles")
                    .select("id")
                    .ilike("contenu", `%${contentHash}%`)
                    .limit(1);

                  if (!existing || existing.length === 0) {
                    // Datation : date absolue seule ; mention relative → null +
                    // provenance conservée (jamais la date de collecte).
                    const dat = resoudreDatation(post.date_absolue, post.date_source);
                    const pubData = {
                      plateforme: compte.plateforme,
                      type_contenu: post.type || "post",
                      contenu: post.contenu,
                      // URL de la publication elle-même quand l'extraction l'a
                      // trouvée, sinon repli sur le profil.
                      url_original: (post.url && /^https?:\/\//.test(post.url)) ? post.url : profileUrl,
                      date_publication: dat.published_at,
                      publication_date_source: dat.source,
                      publication_date_verified: dat.verified,
                      auteur: compte.nom,
                      est_officiel: compte.fonction?.toLowerCase().includes("officiel") || false,
                      hashtags: post.hashtags || [],
                      vip_compte_id: compte.id,
                    };

                    const { error } = await supabase
                      .from("publications_institutionnelles")
                      .insert(pubData);

                    if (!error) {
                      inseres++;
                      results.push({ source: compte.nom, post: post.contenu?.substring(0, 80) });
                      // Bridge: inject into actualites (la date reste honnête : null si non vérifiée)
                      await injectIntoActualites(supabase, pubData);
                    }
                  }
                }

                if (trouves === 0) {
                  statut = "vide";
                  message = "Page lue mais aucun post exploitable n'a pu être extrait.";
                } else if (inseres === 0) {
                  statut = "deja_connu";
                  message = `${trouves} post(s) trouvé(s), tous déjà en base.`;
                }
              }
            }
          } catch (e) {
            statut = "erreur";
            message = e instanceof Error ? e.message : String(e);
            console.error(`Error collecting from ${compte.nom}:`, e);
          }
          diag.comptes.push({
            nom: compte.nom,
            plateforme: compte.plateforme,
            statut,
            posts_trouves: trouves,
            posts_inseres: inseres,
            message,
          });
        }
      }
    }

    // 2. Collect from ANSUT website
    if (mode === "all" || mode === "website") {
      if (!FIRECRAWL_API_KEY) {
        diag.website = { statut: "sans_cle", message: "FIRECRAWL_API_KEY non configurée." };
      } else try {
        const articles = await collectFromWebsite(FIRECRAWL_API_KEY, LOVABLE_API_KEY);
        let inseresSite = 0;

        for (const article of articles) {
          const { data: existing } = await supabase
            .from("publications_institutionnelles")
            .select("id")
            .ilike("contenu", `%${article.titre?.substring(0, 50)}%`)
            .limit(1);

          if (!existing || existing.length === 0) {
            const contenu = `${article.titre}\n\n${article.resume || ""}`;
            const dat = resoudreDatation(article.date_absolue, article.date_source);
            const pubData = {
              plateforme: "website",
              type_contenu: "article",
              contenu,
              url_original: article.url || "https://www.ansut.ci",
              date_publication: dat.published_at,
              publication_date_source: dat.source,
              publication_date_verified: dat.verified,
              auteur: "ANSUT",
              est_officiel: true,
              hashtags: [] as string[],
            };

            await supabase.from("publications_institutionnelles").insert(pubData);
            inseresSite++;
            results.push({ source: "Site ANSUT", post: article.titre });
            // Bridge: inject into actualites
            await injectIntoActualites(supabase, pubData);
          }
        }
        diag.website = {
          statut: articles.length === 0 ? "vide" : "ok",
          articles_trouves: articles.length,
          articles_inseres: inseresSite,
        };
      } catch (e) {
        diag.website = { statut: "erreur", message: e instanceof Error ? e.message : String(e) };
        console.error("Error collecting from ANSUT website:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, collected: results.length, diagnostic: diag, details: results }),
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

async function extractPostsWithAI(apiKey: string, markdown: string, html: string, plateforme: string) {
  // On donne le HTML en priorité : il porte les horodatages MACHINE (attribut
  // datetime, data-utime, tooltip title, JSON-LD) que le markdown a perdus.
  // Repli sur le markdown si le HTML est vide.
  const source = (html && html.length > 200) ? html.substring(0, 20000) : markdown.substring(0, 8000);
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
          content: `Tu es un extracteur de publications sociales. L'entrée est le HTML (ou le markdown) scrappé d'un profil ${plateforme}. Extrais chaque post en texte propre.
Pour chaque post: { "contenu": "texte lisible du post", "date_absolue": "date ISO", "date_source": "metadata|absolute|relative|none", "url": "lien direct du post/vidéo", "hashtags": ["..."], "type": "post|article|partage" }.
RÈGLES STRICTES SUR LA DATE — la vraie date de publication est presque toujours dans un ATTRIBUT MACHINE, même quand l'affichage dit « il y a 2 jours » :
- Cherche EN PRIORITÉ l'horodatage absolu machine du post : attribut datetime="..." d'une balise <time>, attribut data-utime="..." (epoch en secondes → convertis en ISO), attribut title="..." d'un lien de date (contient souvent la date complète), ou un champ JSON-LD "datePublished"/"uploadDate". Si tu le trouves, mets-le dans date_absolue (ISO) et date_source="metadata".
- Sinon, si une date ABSOLUE explicite est écrite en clair (« 12 mars 2026 », « 2026-03-12 »), mets-la dans date_absolue et date_source="absolute".
- N'utilise JAMAIS le TEXTE relatif affiché (« il y a 2 heures », « hier », « il y a 2 jours ») comme date : dans ce cas date_source="relative" et date_absolue vide. Ce texte reflète l'instant du scraping, pas la publication.
- N'INVENTE JAMAIS de date. date_source="none" si vraiment aucune date n'existe.
- url : le lien direct de la publication/vidéo si présent, sinon omets-le.
Si aucun post, retourne [].`,
        },
        { role: "user", content: source },
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
                    date_absolue: { type: "string", description: "Date ISO issue d'un horodatage machine (datetime, data-utime, JSON-LD) ou d'une date absolue explicite ; sinon omettre" },
                    date_source: { type: "string", description: "metadata (horodatage machine absolu) | absolute (date explicite écrite) | relative (seul un texte relatif) | none" },
                    url: { type: "string", description: "Lien direct de la publication si présent" },
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
      formats: ["markdown", "html"],
      onlyMainContent: false,
    }),
  });

  if (!siteRes.ok) return [];
  const siteData = await siteRes.json();
  const markdown = siteData.data?.markdown || siteData.markdown || "";
  const html = siteData.data?.html || siteData.html || "";
  const metadata = siteData.data?.metadata || siteData.metadata || null;
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
          content: `Extrais les articles/communiqués du site web ANSUT depuis le HTML (ou markdown) scrappé. Pour chaque article: { "titre": "...", "resume": "...", "date_absolue": "ISO date", "date_source": "metadata|absolute|relative|none", "url": "..." }.
RÈGLES SUR LA DATE :
- Cherche EN PRIORITÉ un horodatage machine absolu : <time datetime="...">, "datePublished" (JSON-LD), <meta property="article:published_time">. Si trouvé → date_absolue (ISO) + date_source="metadata".
- Sinon, une date ABSOLUE écrite en clair (« 12 mars 2026 ») → date_absolue + date_source="absolute".
- N'utilise JAMAIS une mention relative affichée (« il y a 2 jours ») → date_source="relative", date_absolue vide. N'invente jamais de date ; sinon date_source="none".
Retourne un JSON array.`,
        },
        { role: "user", content: (html && html.length > 200) ? html.substring(0, 20000) : markdown.substring(0, 8000) },
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
                    date_absolue: { type: "string", description: "Date ISO UNIQUEMENT si absolue et explicite, sinon omettre" },
                    date_source: { type: "string", description: "absolute | relative | none" },
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
  const liste = articles || [];

  // Filet de sécurité déterministe : si la page ne contient QU'UN article et que
  // l'IA n'a pas trouvé de date fiable, la date machine de la page (JSON-LD,
  // meta, <time>) EST celle de cet article. On ne l'applique jamais à une liste
  // multi-articles (ce serait leur coller à tous la même date — malhonnête).
  if (liste.length === 1) {
    const a = liste[0];
    const src = (a.date_source || "").toLowerCase();
    if (src !== "metadata" && src !== "absolute") {
      const dPage = extraireDateMetadata(metadata, html);
      if (dPage) {
        a.date_absolue = dPage;
        a.date_source = "metadata";
      }
    }
  }
  return liste;
}
