import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * import-publications — point d'entrée pour un AGENT externe.
 *
 * L'agent (navigateur connecté, où la lecture des posts est légitime) extrait
 * les publications ANSUT et les POSTe ici, déjà normalisées. RADAR les insère
 * dans le pipeline commun. La partie fragile (session connectée) reste DANS
 * l'agent ; RADAR ne reçoit que des données propres.
 *
 * Sécurité : protégé par un jeton partagé (en-tête `x-import-token` == secret
 * `IMPORT_PUBLICATIONS_TOKEN`). Aucun secret plateforme ici.
 *
 * Contrat d'entrée (JSON) :
 *   { "publications": [ {
 *       "plateforme": "linkedin",           // requis
 *       "date": "2026-07-31",               // ou date_publication / date_publication_estimee
 *       "texte": "…",                        // ou contenu
 *       "type": "post|article|image|video",  // ou type_contenu (facultatif)
 *       "url": "https://…",                  // ou url_original (facultatif, PAS url de flux)
 *       "auteur": "ANSUT",                   // facultatif
 *       "likes": 11, "comments": 0, "shares": 1, "vues": null,  // ou *_count (facultatif)
 *       "hashtags": ["ANSUT"]                // facultatif ; sinon extraits du texte
 *   } ] }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-import-token",
};

const PLATEFORMES = new Set(["facebook", "linkedin", "x", "youtube", "instagram", "website"]);

function normaliserDate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  return null;
}

function dateOk(d: string | null, nowMs: number): boolean {
  if (!d) return false;
  const t = new Date(`${d}T12:00:00Z`).getTime();
  return !Number.isNaN(t) && t <= nowMs + 24 * 3600 * 1000;
}

function nombreOuNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function hashtags(texte: string, fournis: unknown): string[] {
  if (Array.isArray(fournis) && fournis.length) return fournis.map((h) => String(h).replace(/^#/, ""));
  const out = new Set<string>();
  for (const m of (texte || "").matchAll(/#([\p{L}\p{N}_]+)/gu)) out.add(m[1]);
  return [...out];
}

function typeDepuis(brut: unknown): string {
  const t = String(brut ?? "").toLowerCase();
  if (/image|carrousel|photo/.test(t)) return "image";
  if (/video|vidéo/.test(t)) return "video";
  if (/article|communiqu/.test(t)) return "article";
  return "post";
}

/** Première valeur non vide parmi plusieurs clés possibles. */
function pick(o: Record<string, unknown>, cles: string[]): unknown {
  for (const c of cles) if (o[c] != null && o[c] !== "") return o[c];
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const attendu = Deno.env.get("IMPORT_PUBLICATIONS_TOKEN");
    if (!attendu) return json({ error: "IMPORT_PUBLICATIONS_TOKEN non configuré côté serveur." }, 500);
    if (req.headers.get("x-import-token") !== attendu) {
      return json({ error: "Jeton d'import invalide ou absent (en-tête x-import-token)." }, 401);
    }

    const body = await req.json().catch(() => null);
    const liste: unknown = body?.publications;
    if (!Array.isArray(liste)) return json({ error: "Corps attendu : { publications: [...] }" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const nowMs = Date.now();

    let inseres = 0;
    let ignores = 0;
    const erreurs: string[] = [];

    for (let i = 0; i < liste.length; i++) {
      const p = (liste[i] ?? {}) as Record<string, unknown>;
      const idx = i + 1;
      const plateforme = String(pick(p, ["plateforme", "platform", "reseau"]) ?? "").toLowerCase();
      const texte = String(pick(p, ["texte", "contenu", "content", "message"]) ?? "").trim();
      const dNorm = normaliserDate(pick(p, ["date", "date_publication", "date_publication_estimee"]));
      const url = String(pick(p, ["url", "url_original", "lien", "permalien"]) ?? "").trim() || null;

      if (!PLATEFORMES.has(plateforme)) { erreurs.push(`#${idx} : plateforme « ${plateforme} » inconnue.`); continue; }
      if (!texte) { erreurs.push(`#${idx} : texte/contenu vide.`); continue; }

      const verifiee = dateOk(dNorm, nowMs);

      // Dédoublonnage : par URL propre si fournie, sinon par empreinte de contenu.
      let existe = false;
      if (url) {
        const { data } = await supabase.from("publications_institutionnelles").select("id").eq("url_original", url).limit(1);
        existe = !!(data && data.length);
      } else {
        const { data } = await supabase.from("publications_institutionnelles").select("id").ilike("contenu", `%${texte.substring(0, 100)}%`).limit(1);
        existe = !!(data && data.length);
      }
      if (existe) { ignores++; continue; }

      const pub = {
        plateforme,
        type_contenu: typeDepuis(pick(p, ["type", "type_contenu", "format"])),
        contenu: texte,
        url_original: url,
        date_publication: verifiee ? new Date(`${dNorm}T12:00:00Z`).toISOString() : null,
        publication_date_source: verifiee ? "absolute_source" : "unknown",
        publication_date_verified: verifiee,
        auteur: String(pick(p, ["auteur", "author"]) ?? "ANSUT"),
        est_officiel: true,
        hashtags: hashtags(texte, p.hashtags),
        likes_count: nombreOuNull(pick(p, ["likes", "reactions", "reactions_count", "likes_count"])),
        comments_count: nombreOuNull(pick(p, ["comments", "commentaires", "comments_count"])),
        shares_count: nombreOuNull(pick(p, ["shares", "partages", "shares_count", "republications"])),
        vues_count: nombreOuNull(pick(p, ["vues", "views", "vues_count", "impressions"])),
      };

      const { error } = await supabase.from("publications_institutionnelles").insert(pub);
      if (error) { erreurs.push(`#${idx} : ${error.message}`); continue; }
      inseres++;
    }

    return json({
      success: true,
      recues: liste.length,
      inserees: inseres,
      ignorees_doublons: ignores,
      erreurs,
      note: "Publications ajoutées au pipeline. Elles apparaissent dans Insights ; lancez le Backfill pour la qualification persistée.",
    });
  } catch (e) {
    console.error("import-publications error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
