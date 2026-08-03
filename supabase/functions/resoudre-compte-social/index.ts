/**
 * « Va sur le compte et donne-moi les paramètres. »
 *
 * Reçoit l'URL de profil déjà analysée côté client (plateforme + url_profil) et
 * VISITE réellement le compte via Firecrawl pour en confirmer l'existence et
 * récupérer le NOM AFFICHÉ officiel. On ne fabrique rien : si la plateforme ne
 * révèle pas d'information, on renvoie `verifie: false` et le client garde les
 * paramètres déduits de l'URL.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nettoyerNom(titre: string): string {
  return (titre ?? "")
    .replace(/\s*[|\-–—]\s*(Facebook|LinkedIn|X|Twitter|YouTube|Instagram|TikTok|Telegram).*$/i, "")
    .replace(/\s*\(@[^)]+\)\s*(•|·|\|).*$/i, "")
    .replace(/\s*•\s*Instagram.*$/i, "")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url_profil } = await req.json().catch(() => ({}));
    if (!url_profil || !/^https?:\/\//i.test(url_profil)) {
      return json({ verifie: false, erreur: "url_profil manquante ou invalide" }, 400);
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return json({ verifie: false, erreur: "Vérification en ligne indisponible (clé Firecrawl absente)." });
    }

    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: url_profil, formats: ["markdown"], onlyMainContent: false }),
    });

    if (!res.ok) {
      return json({ verifie: false, erreur: `Compte injoignable (HTTP ${res.status}).` });
    }

    const data = await res.json();
    const meta = data.data?.metadata ?? data.metadata ?? {};
    const titre = meta.ogTitle || meta.title || meta["og:title"] || "";
    const nom = nettoyerNom(typeof titre === "string" ? titre : "");

    return json({
      verifie: true,
      nom: nom || null,
      description: (meta.description || meta.ogDescription || null) ?? null,
      url_verifiee: url_profil,
    });
  } catch (e) {
    console.error("resoudre-compte-social error:", e);
    return json({ verifie: false, erreur: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
