import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    for (const config of configs || []) {
      const platform = config.plateforme;

      // Check quota
      const quotaUsed = config.quota_used || 0;
      const quotaLimit = config.quota_limit || 10000;
      if (quotaUsed >= quotaLimit) {
        results[platform] = { collected: 0, errors: [`Quota atteint (${quotaUsed}/${quotaLimit})`] };
        continue;
      }

      try {
        if (platform === "twitter") {
          const collected = await collectTwitter(supabase, config, searchQuery);
          results[platform] = { collected, errors: [] };
        } else if (platform === "linkedin") {
          const collected = await collectLinkedIn(supabase, config);
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
      type: "social-api",
      statut: totalCollected > 0 ? "succes" : "erreur",
      nb_resultats: totalCollected,
      mots_cles_utilises: searchTerms,
      sources_utilisees: Object.keys(results),
    });

    return new Response(
      JSON.stringify({ success: true, results, total_collected: totalCollected }),
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

// ─── Twitter/X API v2 ───────────────────────────────────────────────────────

async function collectTwitter(
  supabase: any,
  config: any,
  query: string
): Promise<number> {
  // Decode the bearer token (may contain URL-encoded chars)
  let bearerToken = Deno.env.get("TWITTER_BEARER_TOKEN") || "";
  bearerToken = decodeURIComponent(bearerToken);

  if (!bearerToken) throw new Error("TWITTER_BEARER_TOKEN not configured");

  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", "20");
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
    const metrics = tweet.public_metrics || {};
    const engagementScore =
      (metrics.like_count || 0) +
      (metrics.retweet_count || 0) * 2 +
      (metrics.reply_count || 0) * 1.5 +
      (metrics.quote_count || 0) * 2;

    const hashtags =
      tweet.entities?.hashtags?.map((h: any) => `#${h.tag}`) || [];

    // Simple sentiment heuristic (will be enriched by AI later)
    const sentiment = 0;
    const isCritical = engagementScore > 100;

    const { error } = await supabase.from("social_insights").insert({
      plateforme: "twitter",
      type_contenu: "post",
      contenu: tweet.text,
      auteur: author ? `@${author.username}` : null,
      auteur_url: author
        ? `https://x.com/${author.username}`
        : null,
      url_original: `https://x.com/i/status/${tweet.id}`,
      date_publication: tweet.created_at,
      engagement_score: Math.round(engagementScore),
      sentiment,
      hashtags,
      est_critique: isCritical,
      is_official_api: true,
      platform_post_id: tweet.id,
      likes_count: metrics.like_count || 0,
      shares_count: (metrics.retweet_count || 0) + (metrics.quote_count || 0),
      comments_count: metrics.reply_count || 0,
    });

    if (!error) {
      inserted++;

      // Generate alert for critical insights
      if (isCritical) {
        await supabase.from("alertes").insert({
          type: "social",
          niveau: "important",
          titre: `Tweet viral détecté`,
          message: `@${author?.username || "?"}: ${tweet.text.slice(0, 100)}...`,
          reference_type: "social_insight",
        });

        await supabase
          .from("social_insights")
          .update({ alerte_generee: true })
          .eq("platform_post_id", tweet.id)
          .eq("plateforme", "twitter");
      }
    }
  }

  // Update quota & last_sync
  await supabase
    .from("social_api_config")
    .update({
      quota_used: (config.quota_used || 0) + tweets.length,
      last_sync: new Date().toISOString(),
    })
    .eq("id", config.id);

  return inserted;
}

// ─── LinkedIn API ───────────────────────────────────────────────────────────

async function collectLinkedIn(
  supabase: any,
  config: any
): Promise<number> {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn credentials not configured");
  }

  // Step 1: Get access token via Client Credentials
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

  if (!accessToken) {
    throw new Error("LinkedIn: no access token received");
  }

  // Step 2: Get organization posts (limited by Client Credentials scope)
  // With Client Credentials, we can access organization data if the app has permissions
  // We'll try to get posts from organizations configured in the platform config
  const orgIds: string[] = (config.config as any)?.organization_ids || [];

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

      for (const post of posts) {
        const postId = post.id || post["activity"];
        if (!postId) continue;

        // Skip duplicates
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

        const { error } = await supabase.from("social_insights").insert({
          plateforme: "linkedin",
          type_contenu: "post",
          contenu: text,
          auteur: `Organization ${orgId}`,
          url_original: `https://www.linkedin.com/feed/update/${postId}`,
          date_publication: post.created?.time
            ? new Date(post.created.time).toISOString()
            : null,
          engagement_score: 0,
          sentiment: 0,
          est_critique: false,
          is_official_api: true,
          platform_post_id: postId,
        });

        if (!error) totalInserted++;
      }
    } catch (err) {
      console.error(`LinkedIn org ${orgId} error:`, err);
    }
  }

  // Update last_sync
  await supabase
    .from("social_api_config")
    .update({
      quota_used: (config.quota_used || 0) + totalInserted,
      last_sync: new Date().toISOString(),
    })
    .eq("id", config.id);

  return totalInserted;
}
