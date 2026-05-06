import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckStatus = "ok" | "warn" | "fail" | "skip";
interface Check {
  step: string;
  status: CheckStatus;
  detail: string;
  durationMs?: number;
}
interface AccountDiag {
  id: string;
  nom: string;
  plateforme: string;
  identifiant: string;
  url_profil: string | null;
  globalStatus: "healthy" | "degraded" | "blocked" | "no_data";
  diagnosis: string;
  recommendation: string;
  checks: Check[];
  publications_24h: number;
  publications_7j: number;
  derniere_publication: string | null;
}

const PLATFORM_NOTES: Record<string, string> = {
  linkedin:
    "LinkedIn bloque le scraping anonyme : pages publiques renvoient un mur de connexion. Firecrawl ne peut pas extraire les posts sans session authentifiée.",
  facebook:
    "Facebook bloque la plupart des scrapers anonymes (mur de connexion, JS-only). Privilégier l'API Graph avec un Page Access Token ou un export Meta Business Suite.",
  twitter:
    "X/Twitter exige le Bearer Token de l'API v2 pour lister les posts d'un compte. Le scraping HTML public ne renvoie quasiment rien.",
  x:
    "X/Twitter exige le Bearer Token de l'API v2 pour lister les posts d'un compte.",
  site_web:
    "Le site institutionnel doit exposer une page publique d'actualités lisible (HTML statique ou flux RSS).",
  website: "Le site institutionnel doit exposer une page publique d'actualités lisible.",
};

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t0 = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t0 };
}

async function probeAccount(
  supabase: any,
  account: any,
  firecrawlKey: string | undefined,
): Promise<AccountDiag> {
  const checks: Check[] = [];
  const url = account.url_profil || "";

  // 1. URL configured
  checks.push({
    step: "Configuration",
    status: url ? "ok" : "fail",
    detail: url ? `URL : ${url}` : "Aucune URL de profil renseignée",
  });

  // 2. Reachability (HEAD then GET fallback)
  let reachable = false;
  let httpStatus = 0;
  if (url) {
    try {
      const r = await timed(async () => {
        let res = await fetch(url, { method: "HEAD", redirect: "follow" });
        if (res.status === 405 || res.status === 403) {
          res = await fetch(url, { method: "GET", redirect: "follow" });
        }
        return res;
      });
      httpStatus = r.value.status;
      reachable = r.value.ok || r.value.status === 999; // 999 = LinkedIn block but URL exists
      checks.push({
        step: "Accessibilité HTTP",
        status: reachable ? "ok" : "fail",
        detail: `HTTP ${httpStatus}${
          httpStatus === 999 ? " (LinkedIn bloque les bots)" : ""
        }`,
        durationMs: r.ms,
      });
    } catch (e) {
      checks.push({
        step: "Accessibilité HTTP",
        status: "fail",
        detail: `Erreur réseau : ${(e as Error).message}`,
      });
    }
  }

  // 3. Firecrawl scrape (only meaningful for LinkedIn/FB/web)
  let scrapeChars = 0;
  let scrapeOk = false;
  const platform = String(account.plateforme || "").toLowerCase();
  const canScrape = ["linkedin", "facebook", "site_web", "website"].includes(platform);
  if (!firecrawlKey) {
    checks.push({
      step: "Scraping (Firecrawl)",
      status: "skip",
      detail: "FIRECRAWL_API_KEY non configurée",
    });
  } else if (!url) {
    checks.push({ step: "Scraping (Firecrawl)", status: "skip", detail: "Pas d'URL" });
  } else if (!canScrape) {
    checks.push({
      step: "Scraping (Firecrawl)",
      status: "skip",
      detail: `Non applicable pour ${platform} — utiliser l'API officielle`,
    });
  } else {
    try {
      const r = await timed(async () => {
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        });
        const j = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, body: j };
      });
      const md = r.value.body?.data?.markdown || r.value.body?.markdown || "";
      scrapeChars = md.length;
      scrapeOk = r.value.ok && scrapeChars > 200;
      const hasLoginWall = /sign in|connectez-vous|log in|inscrivez-vous|create account/i.test(
        md.slice(0, 2000),
      );
      checks.push({
        step: "Scraping (Firecrawl)",
        status: scrapeOk && !hasLoginWall ? "ok" : "fail",
        detail: !r.value.ok
          ? `HTTP ${r.value.status} — ${r.value.body?.error || "échec"}`
          : hasLoginWall
            ? `Mur de connexion détecté (${scrapeChars} car. extraits, contenu non utilisable)`
            : scrapeChars < 200
              ? `Contenu trop court (${scrapeChars} caractères)`
              : `${scrapeChars} caractères extraits`,
        durationMs: r.value ? r.ms : undefined,
      });
    } catch (e) {
      checks.push({
        step: "Scraping (Firecrawl)",
        status: "fail",
        detail: `Erreur : ${(e as Error).message}`,
      });
    }
  }

  // 4. API officielle (Twitter/X uniquement actuellement)
  if (platform === "twitter" || platform === "x") {
    const bearer = Deno.env.get("TWITTER_BEARER_TOKEN");
    if (!bearer) {
      checks.push({
        step: "API X (v2)",
        status: "fail",
        detail: "TWITTER_BEARER_TOKEN non configuré",
      });
    } else {
      try {
        const r = await timed(async () => {
          const u = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(
            account.identifiant,
          )}`;
          const res = await fetch(u, { headers: { Authorization: `Bearer ${bearer}` } });
          const j = await res.json().catch(() => ({}));
          return { ok: res.ok, status: res.status, body: j };
        });
        checks.push({
          step: "API X (v2)",
          status: r.value.ok ? "ok" : "fail",
          detail: r.value.ok
            ? `Compte trouvé : @${r.value.body?.data?.username} (id ${r.value.body?.data?.id})`
            : `HTTP ${r.value.status} — ${
                r.value.body?.title || r.value.body?.detail || "échec"
              }`,
          durationMs: r.ms,
        });
      } catch (e) {
        checks.push({
          step: "API X (v2)",
          status: "fail",
          detail: `Erreur : ${(e as Error).message}`,
        });
      }
    }
  }

  // 5. Données déjà collectées en base
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const since7j = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { count: c24 } = await supabase
    .from("publications_institutionnelles")
    .select("id", { count: "exact", head: true })
    .eq("vip_compte_id", account.id)
    .gte("date_publication", since24h);
  const { count: c7j } = await supabase
    .from("publications_institutionnelles")
    .select("id", { count: "exact", head: true })
    .eq("vip_compte_id", account.id)
    .gte("date_publication", since7j);
  const { data: lastPub } = await supabase
    .from("publications_institutionnelles")
    .select("date_publication")
    .eq("vip_compte_id", account.id)
    .order("date_publication", { ascending: false })
    .limit(1)
    .maybeSingle();

  checks.push({
    step: "Données en base",
    status: (c7j ?? 0) > 0 ? "ok" : "warn",
    detail: `${c24 ?? 0} pub/24h · ${c7j ?? 0} pub/7j${
      lastPub?.date_publication
        ? ` · dernière le ${new Date(lastPub.date_publication).toLocaleString("fr-FR")}`
        : " · aucune publication enregistrée"
    }`,
  });

  // Diagnosis synthesis
  const failed = checks.filter((c) => c.status === "fail");
  const note = PLATFORM_NOTES[platform] || "";
  let globalStatus: AccountDiag["globalStatus"];
  let diagnosis = "";
  let recommendation = "";

  if (failed.some((c) => c.step === "Configuration")) {
    globalStatus = "blocked";
    diagnosis = "Compte non exploitable : configuration incomplète.";
    recommendation = "Renseigner l'URL de profil dans /admin/comptes-vip.";
  } else if (failed.some((c) => c.step === "Accessibilité HTTP" && !c.detail.includes("999"))) {
    globalStatus = "blocked";
    diagnosis = "Le profil ne répond pas (URL invalide ou hors ligne).";
    recommendation = "Vérifier l'URL et la disponibilité du compte.";
  } else if (
    platform === "linkedin" ||
    platform === "facebook" ||
    (failed.some((c) => c.step === "Scraping (Firecrawl)") && canScrape)
  ) {
    globalStatus = "blocked";
    diagnosis = `Collecte impossible sans accès authentifié à ${platform}.`;
    recommendation =
      platform === "linkedin"
        ? "Connecter LinkedIn via OAuth (LINKEDIN_CLIENT_ID/SECRET déjà présents) et utiliser l'API Pages, ou exporter manuellement les posts hebdomadaires."
        : platform === "facebook"
          ? "Configurer l'API Graph avec un Page Access Token sur la Page ANSUT."
          : "Ajuster la stratégie de collecte (API officielle requise).";
  } else if ((platform === "twitter" || platform === "x") && failed.some((c) => c.step === "API X (v2)")) {
    globalStatus = "blocked";
    diagnosis = "L'API X ne renvoie pas le compte (handle inexistant ou token invalide).";
    recommendation = `Vérifier le handle '@${account.identifiant}' et la validité de TWITTER_BEARER_TOKEN.`;
  } else if ((c7j ?? 0) === 0) {
    globalStatus = "no_data";
    diagnosis = "Accès technique OK mais aucune publication des 7 derniers jours.";
    recommendation = "Lancer une collecte manuelle, vérifier la fréquence du cron et la cible.";
  } else {
    globalStatus = "healthy";
    diagnosis = "Compte opérationnel : données récentes disponibles.";
    recommendation = "Aucune action requise.";
  }

  if (note && globalStatus === "blocked") {
    diagnosis += ` ${note}`;
  }

  return {
    id: account.id,
    nom: account.nom,
    plateforme: account.plateforme,
    identifiant: account.identifiant,
    url_profil: account.url_profil,
    globalStatus,
    diagnosis,
    recommendation,
    checks,
    publications_24h: c24 ?? 0,
    publications_7j: c7j ?? 0,
    derniere_publication: lastPub?.date_publication ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    const { data: comptes, error } = await supabase
      .from("vip_comptes")
      .select("*")
      .eq("actif", true);
    if (error) throw error;

    const results: AccountDiag[] = [];
    for (const c of comptes || []) {
      results.push(await probeAccount(supabase, c, firecrawlKey));
    }

    const summary = {
      total: results.length,
      healthy: results.filter((r) => r.globalStatus === "healthy").length,
      blocked: results.filter((r) => r.globalStatus === "blocked").length,
      no_data: results.filter((r) => r.globalStatus === "no_data").length,
      degraded: results.filter((r) => r.globalStatus === "degraded").length,
      firecrawl_configured: !!firecrawlKey,
      twitter_api_configured: !!Deno.env.get("TWITTER_BEARER_TOKEN"),
      linkedin_oauth_configured: !!Deno.env.get("LINKEDIN_CLIENT_ID"),
    };

    return new Response(JSON.stringify({ summary, results, generated_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diagnostic-comptes-ansut error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
