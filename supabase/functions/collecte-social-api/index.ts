import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for VIP-only mode (fast polling)
    let vipOnly = false;
    try {
      const body = await req.json();
      vipOnly = body?.vip_only === true;
    } catch { /* no body = normal mode */ }

    // Check which platforms are enabled
    const { data: configs, error: configErr } = await supabase
      .from("social_api_config")
      .select("*")
      .eq("enabled", true);

    if (configErr) throw configErr;

    const results: Record<string, { collected: number; errors: string[] }> = {};

    // Get keywords for search
    const { data: keywords } = await supabase
      .from("mots_cles_veille")
      .select("mot_cle, variantes")
      .eq("actif", true)
      .limit(10);

    const searchTerms = (keywords || [])
      .flatMap((k) => [k.mot_cle, ...(k.variantes || [])])
      .filter(Boolean)
      .slice(0, 5);

    const searchQuery = searchTerms.length > 0 ? searchTerms.join(" OR ") : "Côte d'Ivoire";

    // Load all VIP accounts for mapping
    const { data: allVipAccounts } = await supabase
      .from("vip_comptes")
      .select("id, nom, plateforme, identifiant, url_profil, fonction")
      .eq("actif", true);

    const vipMap: Record<string, Record<string, any>> = {};
    for (const v of allVipAccounts || []) {
      const key = `${v.plateforme}:${v.identifiant.toLowerCase()}`;
      vipMap[key] = v;
    }

    for (const config of configs || []) {
      const platform = config.plateforme;

      // In VIP-only mode, skip quota check (VIP collectes are lightweight)
      if (!vipOnly) {
        const quotaUsed = config.quota_used || 0;
        const quotaLimit = config.quota_limit || 10000;
        if (quotaUsed >= quotaLimit) {
          results[platform] = { collected: 0, errors: [`Quota atteint (${quotaUsed}/${quotaLimit})`] };
          continue;
        }
      }

      try {
        if (platform === "twitter") {
          const collected = await collectTwitter(supabase, config, searchQuery, vipMap, vipOnly);
          results[platform] = { collected, errors: [] };
        } else if (platform === "linkedin") {
          const collected = await collectLinkedIn(supabase, config, vipMap);
          results[platform] = { collected, errors: [] };
        } else if (platform === "facebook") {
          const collected = await collectFacebook(supabase, config, vipMap);
          results[platform] = { collected, errors: [] };
        }
      } catch (err) {
        console.error(`Error collecting ${platform}:`, err);
        results[platform] = {
          collected: 0,
          errors: [err instanceof Error ? err.message : String(err)],
        };
      }
    }

    // Log the collection
    const totalCollected = Object.values(results).reduce((s, r) => s + r.collected, 0);
    await supabase.from("collectes_log").insert({
      type: vipOnly ? "social-api-vip" : "social-api",
      statut: totalCollected > 0 ? "succes" : "erreur",
      nb_resultats: totalCollected,
      mots_cles_utilises: searchTerms,
      sources_utilisees: Object.keys(results),
    });

    return new Response(
      JSON.stringify({ success: true, results, total_collected: totalCollected, vip_only: vipOnly }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("collecte-social-api error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Alert generation helper ─────────────────────────────────────────────────

async function generateAlert(
  supabase: any,
  niveau: string,
  titre: string,
  message: string,
  insightId?: string
) {
  await supabase.from("alertes").insert({
    type: "social",
    niveau,
    titre,
    message: message.slice(0, 300),
    reference_type: "social_insight",
    reference_id: insightId || null,
  });
}

// ─── Twitter/X API v2 ───────────────────────────────────────────────────────

async function collectTwitter(
  supabase: any,
  config: any,
  query: string,
  vipMap: Record<string, any>,
  vipOnly: boolean
): Promise<number> {
  let bearerToken = Deno.env.get("TWITTER_BEARER_TOKEN") || "";
  bearerToken = decodeURIComponent(bearerToken);
  if (!bearerToken) throw new Error("TWITTER_BEARER_TOKEN not configured");

  // Get ANSUT VIP accounts on Twitter
  const twitterVips = Object.entries(vipMap)
    .filter(([k]) => k.startsWith("twitter:"))
    .map(([, v]) => v);

  // Build query
  const fromClauses = twitterVips.map((v: any) => `from:${v.identifiant}`).join(" OR ");
  
  let fullQuery: string;
  if (vipOnly) {
    // VIP-only mode: only track VIP accounts
    if (!fromClauses) return 0;
    fullQuery = fromClauses;
  } else {
    fullQuery = fromClauses ? `(${fromClauses}) OR (${query})` : query;
  }

  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.searchParams.set("query", fullQuery);
  url.searchParams.set("max_results", vipOnly ? "20" : "50");
  url.searchParams.set(
    "tweet.fields",
    "created_at,public_metrics,entities,lang,author_id"
  );
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "name,username,profile_image_url");

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Twitter API ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  const tweets = data.data || [];
  const users = (data.includes?.users || []).reduce(
    (map: Record<string, any>, u: any) => {
      map[u.id] = u;
      return map;
    },
    {}
  );

  let inserted = 0;

  for (const tweet of tweets) {
    // Skip duplicates
    const { data: existing } = await supabase
      .from("social_insights")
      .select("id")
      .eq("platform_post_id", tweet.id)
      .eq("plateforme", "twitter")
      .maybeSingle();

    if (existing) continue;

    const author = users[tweet.author_id];
    const username = author?.username?.toLowerCase() || "";
    const metrics = tweet.public_metrics || {};
    const engagementScore =
      (metrics.like_count || 0) +
      (metrics.retweet_count || 0) * 2 +
      (metrics.reply_count || 0) * 1.5 +
      (metrics.quote_count || 0) * 2;

    const hashtags =
      tweet.entities?.hashtags?.map((h: any) => `#${h.tag}`) || [];

    // Match to VIP account
    const vipKey = `twitter:${username}`;
    const matchedVip = vipMap[vipKey] || null;

    const isCritical = engagementScore > 50;
    const isHighEngagement = (metrics.like_count || 0) > 50 || (metrics.retweet_count || 0) > 20;

    const { data: insertedRow, error } = await supabase.from("social_insights").insert({
      plateforme: "twitter",
      type_contenu: "post",
      contenu: tweet.text,
      auteur: author ? `@${author.username}` : null,
      auteur_url: author ? `https://x.com/${author.username}` : null,
      url_original: `https://x.com/i/status/${tweet.id}`,
      date_publication: tweet.created_at,
      engagement_score: Math.round(engagementScore),
      sentiment: 0,
      hashtags,
      est_critique: isCritical,
      is_official_api: true,
      platform_post_id: tweet.id,
      likes_count: metrics.like_count || 0,
      shares_count: (metrics.retweet_count || 0) + (metrics.quote_count || 0),
      comments_count: metrics.reply_count || 0,
      vip_compte_id: matchedVip?.id || null,
    }).select("id").maybeSingle();

    if (!error) {
      inserted++;
      const insightId = insertedRow?.id;

      // Enriched alerts
      if (matchedVip) {
        // VIP post → always alert for traceability
        await generateAlert(supabase, "info",
          `📱 Publication ${matchedVip.nom}`,
          `${matchedVip.nom} a publié sur X: ${tweet.text.slice(0, 150)}...`,
          insightId
        );
      }

      if (isHighEngagement) {
        await generateAlert(supabase, "important",
          `🔥 Tweet viral détecté`,
          `@${author?.username || "?"}: ${tweet.text.slice(0, 150)}... (${metrics.like_count} ❤️, ${metrics.retweet_count} 🔄)`,
          insightId
        );
      }

      if (isCritical && !matchedVip) {
        // External mention about ANSUT with high engagement
        await generateAlert(supabase, "important",
          `📢 Mention ANSUT externe`,
          `@${author?.username || "?"}: ${tweet.text.slice(0, 150)}...`,
          insightId
        );
      }

      if (insertedRow) {
        await supabase
          .from("social_insights")
          .update({ alerte_generee: true })
          .eq("id", insightId);
      }
    }
  }

  // Update quota & last_sync (skip quota update in VIP-only mode)
  if (!vipOnly) {
    await supabase
      .from("social_api_config")
      .update({
        quota_used: (config.quota_used || 0) + tweets.length,
        last_sync: new Date().toISOString(),
      })
      .eq("id", config.id);
  } else {
    await supabase
      .from("social_api_config")
      .update({ last_sync: new Date().toISOString() })
      .eq("id", config.id);
  }

  return inserted;
}

// ─── LinkedIn API ───────────────────────────────────────────────────────────

async function collectLinkedIn(
  supabase: any,
  config: any,
  vipMap: Record<string, any>
): Promise<number> {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn credentials not configured");
  }

  const tokenResp = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  if (!tokenResp.ok) {
    const body = await tokenResp.text();
    throw new Error(`LinkedIn OAuth ${tokenResp.status}: ${body}`);
  }

  const tokenData = await tokenResp.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) throw new Error("LinkedIn: no access token received");

  const configOrgIds: string[] = (config.config as any)?.organization_ids || [];
  
  const { data: vipAccounts } = await supabase
    .from("vip_comptes")
    .select("id, identifiant, nom")
    .eq("plateforme", "linkedin")
    .eq("actif", true);

  const vipOrgMap: Record<string, any> = {};
  for (const v of vipAccounts || []) {
    vipOrgMap[v.identifiant] = v;
  }

  const vipOrgIds = (vipAccounts || []).map((v: any) => v.identifiant);
  const orgIds = [...new Set([...configOrgIds, ...vipOrgIds])];

  let totalInserted = 0;

  for (const orgId of orgIds) {
    try {
      const postsResp = await fetch(
        `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn%3Ali%3Aorganization%3A${orgId})&count=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      if (!postsResp.ok) {
        console.error(`LinkedIn posts for org ${orgId}: ${postsResp.status}`);
        continue;
      }

      const postsData = await postsResp.json();
      const posts = postsData.elements || [];
      const matchedVip = vipOrgMap[orgId] || null;

      for (const post of posts) {
        const postId = post.id || post["activity"];
        if (!postId) continue;

        const { data: existing } = await supabase
          .from("social_insights")
          .select("id")
          .eq("platform_post_id", postId)
          .eq("plateforme", "linkedin")
          .maybeSingle();

        if (existing) continue;

        const text =
          post.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text ||
          post.commentary || "";

        const { data: insertedRow, error } = await supabase.from("social_insights").insert({
          plateforme: "linkedin",
          type_contenu: "post",
          contenu: text,
          auteur: matchedVip?.nom || `Organization ${orgId}`,
          url_original: `https://www.linkedin.com/feed/update/${postId}`,
          date_publication: post.created?.time
            ? new Date(post.created.time).toISOString()
            : null,
          engagement_score: 0,
          sentiment: 0,
          est_critique: false,
          is_official_api: true,
          platform_post_id: postId,
          vip_compte_id: matchedVip?.id || null,
        }).select("id").maybeSingle();

        if (!error) {
          totalInserted++;
          if (matchedVip && insertedRow) {
            await generateAlert(supabase, "info",
              `📱 Publication LinkedIn ${matchedVip.nom}`,
              `${matchedVip.nom} a publié sur LinkedIn: ${text.slice(0, 150)}...`,
              insertedRow.id
            );
          }
        }
      }
    } catch (err) {
      console.error(`LinkedIn org ${orgId} error:`, err);
    }
  }

  await supabase
    .from("social_api_config")
    .update({
      quota_used: (config.quota_used || 0) + totalInserted,
      last_sync: new Date().toISOString(),
    })
    .eq("id", config.id);

  return totalInserted;
}

// ─── Facebook (via Firecrawl scraping) ──────────────────────────────────────

async function collectFacebook(
  supabase: any,
  config: any,
  vipMap: Record<string, any>
): Promise<number> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

  const { data: vipAccounts } = await supabase
    .from("vip_comptes")
    .select("id, identifiant, url_profil, nom")
    .eq("plateforme", "facebook")
    .eq("actif", true);

  if (!vipAccounts || vipAccounts.length === 0) {
    console.log("No Facebook VIP accounts configured");
    return 0;
  }

  let totalInserted = 0;

  for (const account of vipAccounts) {
    try {
      const pageUrl = account.url_profil || `https://www.facebook.com/${account.identifiant}`;
      console.log(`Scraping Facebook page: ${account.nom} (${pageUrl})`);

      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: pageUrl,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 5000,
        }),
      });

      if (!scrapeResponse.ok) {
        console.error(`Firecrawl error for ${account.nom}: ${scrapeResponse.status}`);
        continue;
      }

      const scrapeData = await scrapeResponse.json();
      const markdown = scrapeData.data?.markdown || "";

      if (!markdown || markdown.length < 50) {
        console.log(`No meaningful content from ${account.nom}`);
        continue;
      }

      const postBlocks = markdown.split(/\n{3,}/).filter((b: string) => b.trim().length > 30);

      for (const block of postBlocks.slice(0, 10)) {
        const text = block.trim().substring(0, 1000);
        const postHash = await hashText(text.substring(0, 200));

        const { data: existing } = await supabase
          .from("social_insights")
          .select("id")
          .eq("platform_post_id", postHash)
          .eq("plateforme", "facebook")
          .maybeSingle();

        if (existing) continue;
        if (/log\s*in|sign\s*up|create.*account|forgot.*password|cookie/i.test(text)) continue;

        const { data: insertedRow, error } = await supabase.from("social_insights").insert({
          plateforme: "facebook",
          type_contenu: "post",
          contenu: text,
          auteur: account.nom,
          auteur_url: pageUrl,
          url_original: pageUrl,
          engagement_score: 0,
          sentiment: 0,
          est_critique: false,
          is_official_api: false,
          is_manual_entry: false,
          platform_post_id: postHash,
          vip_compte_id: account.id,
        }).select("id").maybeSingle();

        if (!error) {
          totalInserted++;
          if (insertedRow) {
            await generateAlert(supabase, "info",
              `📱 Publication Facebook ${account.nom}`,
              `${account.nom} a publié sur Facebook: ${text.slice(0, 150)}...`,
              insertedRow.id
            );
          }
        }
      }
    } catch (err) {
      console.error(`Facebook scrape error for ${account.nom}:`, err);
    }
  }

  await supabase
    .from("social_api_config")
    .update({
      quota_used: (config.quota_used || 0) + totalInserted,
      last_sync: new Date().toISOString(),
    })
    .eq("id", config.id);

  return totalInserted;
}

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 32);
}
