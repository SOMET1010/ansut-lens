import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * import-pige — point d'entrée générique pour une PIGE DE PRESSE professionnelle.
 *
 * La directrice demande une vraie revue de presse avec les noms des journaux.
 * Plutôt que de dépendre d'un OCR de unes (peu fiable), on ingère les articles
 * fournis par un prestataire de pige (l'Argus/Kantar, Cision, ou une agence
 * ivoirienne) OU saisis manuellement. Chaque article arrive déjà NOMMÉ (journal)
 * et SOURCÉ (date + lien/référence). RADAR l'insère dans le pipeline commun
 * (table `actualites`, `source_type = 'pige'`), d'où il remonte dans la Veille
 * et la Revue de presse avec le vrai nom du titre.
 *
 * Volontairement INDÉPENDANT du prestataire : le contrat d'entrée est un format
 * pivot simple (JSON). Quel que soit le fournisseur retenu, l'intégration se
 * réduit à mapper son export (API/webhook/CSV/e-mail) vers ce format. Voir
 * docs/PIGE_PRO_INGESTION.md pour le cahier des charges à remettre au prestataire.
 *
 * Sécurité : jeton partagé (en-tête `x-import-token` == secret `IMPORT_PIGE_TOKEN`).
 * Aucun secret plateforme ici. Clé service-role uniquement côté serveur.
 *
 * Contrat d'entrée (JSON) :
 *   { "articles": [ {
 *       "journal": "Fraternité Matin",       // REQUIS — nom du journal / média
 *       "titre":   "…",                       // REQUIS — titre de l'article / de la une
 *       "date":    "2026-08-04",              // ou date_parution / date_publication (ISO ou JJ/MM/AAAA)
 *       "extrait": "…",                        // ou resume / chapo / contenu (facultatif)
 *       "url":     "https://…",               // ou lien (facultatif — page article, pas home)
 *       "page":    3,                          // n° de page papier (facultatif)
 *       "rubrique":"Économie",                // ou categorie (facultatif)
 *       "themes":  ["télécom","ANSUT"],       // facultatif
 *       "support": "presse_ecrite"            // presse_ecrite | en_ligne | radio | tv (facultatif)
 *   } ] }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-import-token",
};

// Termes ANSUT/numérique servant à un score de pertinence EXPLICABLE (nb de
// correspondances), jamais un pourcentage de confiance fabriqué. Documenté dans
// analyse_ia.methode pour rester traçable (charte de crédibilité).
const ANSUT_KEYWORDS = [
  "ansut", "service universel", "télécom", "telecom", "fibre", "connectivit",
  "numérique", "numerique", "digital", "5g", "4g", "internet", "cybersécurité",
  "cybersecurite", "data center", "datacenter", "haut débit", "haut debit",
  "inclusion numérique", "transformation digitale", "artci", "opérateur",
];

function pick(o: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (o[k] != null && o[k] !== "") return o[k];
  return undefined;
}

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

// URL canonique (host + chemin, sans query/fragment) pour dédoublonner.
function canonicalUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    return `${url.host}${url.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return null;
  }
}

// Clé de déduplication par titre : minuscules, sans ponctuation ni espaces multiples.
function cleTitre(t: string): string {
  return (t || "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Score de pertinence transparent : nb de thèmes ANSUT distincts détectés dans
// (titre + extrait), borné 0-100. Aucune précision fabriquée — juste un comptage
// explicable, exposé dans analyse_ia.
function scorePertinence(texte: string): { score: number; mots: string[] } {
  const t = (texte || "").toLowerCase();
  const mots = [...new Set(ANSUT_KEYWORDS.filter((k) => t.includes(k)))];
  const score = mots.length === 0 ? 45 : Math.min(100, 55 + mots.length * 10);
  return { score, mots };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST attendu." }, 405);

  try {
    const attendu = Deno.env.get("IMPORT_PIGE_TOKEN");
    if (!attendu) return json({ error: "IMPORT_PIGE_TOKEN non configuré côté serveur." }, 500);
    if (req.headers.get("x-import-token") !== attendu) {
      return json({ error: "Jeton d'import invalide ou absent (en-tête x-import-token)." }, 401);
    }

    const body = await req.json().catch(() => null);
    const liste: unknown = body?.articles ?? body?.pige;
    if (!Array.isArray(liste)) return json({ error: "Corps attendu : { articles: [...] }" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const nowMs = Date.now();

    // Pré-chargement des URLs et titres des 30 derniers jours pour dédoublonner
    // sans une requête par article (même stratégie que collecte-veille).
    const trenteJours = new Date(nowMs - 30 * 24 * 3600 * 1000).toISOString();
    const [{ data: urlRows }, { data: titreRows }] = await Promise.all([
      supabase.from("actualites").select("source_url").gte("created_at", trenteJours).not("source_url", "is", null).limit(5000),
      supabase.from("actualites").select("titre").gte("created_at", trenteJours).limit(5000),
    ]);
    const urlsConnus = new Set<string>();
    for (const r of urlRows || []) { const c = canonicalUrl(r.source_url as string); if (c) urlsConnus.add(c); }
    const titresConnus = new Set<string>((titreRows || []).map((r) => cleTitre(r.titre as string)));

    let inseres = 0;
    let ignores = 0;
    const erreurs: string[] = [];

    for (let i = 0; i < liste.length; i++) {
      const a = (liste[i] ?? {}) as Record<string, unknown>;
      const idx = i + 1;

      const journal = String(pick(a, ["journal", "media", "source", "titre_journal"]) ?? "").trim();
      const titre = String(pick(a, ["titre", "title", "titre_une", "une"]) ?? "").trim();
      const extrait = String(pick(a, ["extrait", "resume", "chapo", "contenu", "content", "sujet"]) ?? "").trim();
      const url = (String(pick(a, ["url", "lien", "permalien", "source_url"]) ?? "").trim() || null);
      const dNorm = normaliserDate(pick(a, ["date", "date_parution", "date_publication"]));
      const rubrique = String(pick(a, ["rubrique", "categorie", "category", "section"]) ?? "").trim();
      const support = String(pick(a, ["support", "type", "media_type"]) ?? "presse_ecrite").trim().toLowerCase();
      const page = pick(a, ["page", "page_numero"]);
      const themesFournis = Array.isArray(a.themes) ? (a.themes as unknown[]).map((t) => String(t)) : [];

      // Le nom du journal est le cœur de la demande : on le REFUSE s'il est vide.
      if (!journal) { erreurs.push(`#${idx} : champ « journal » (nom du média) requis.`); continue; }
      if (!titre) { erreurs.push(`#${idx} : champ « titre » requis.`); continue; }

      // Déduplication : par URL canonique si fournie, sinon par titre normalisé.
      const canon = canonicalUrl(url);
      const cleT = cleTitre(titre);
      if ((canon && urlsConnus.has(canon)) || titresConnus.has(cleT)) { ignores++; continue; }
      if (canon) urlsConnus.add(canon);
      titresConnus.add(cleT);

      const verifiee = dateOk(dNorm, nowMs);
      const { score, mots } = scorePertinence(`${titre} ${extrait}`);
      const tags = [...new Set(["pige", ...themesFournis, ...mots])];

      const row = {
        titre,
        resume: extrait || null,
        contenu: extrait || null,
        // Le nom du journal = la source nommée demandée par la directrice.
        source_nom: journal,
        source_url: url,
        source_type: "pige",
        // Date réelle uniquement : null si non vérifiée (jamais la date du jour fabriquée).
        date_publication: verifiee ? `${dNorm}T12:00:00Z` : null,
        categorie: rubrique || "Revue de presse",
        tags,
        importance: score,
        score_pertinence: score,
        analyse_ia: JSON.stringify({
          provenance: "pige",
          support,                         // presse_ecrite | en_ligne | radio | tv
          page: page != null ? Number(page) || null : null,
          themes_ansut_detectes: mots,
          methode: "score = 55 + 10×(thèmes ANSUT distincts), plancher 45 — comptage explicable, aucune confiance fabriquée",
          date_source: verifiee ? "prestataire_pige" : "inconnue",
          date_verifiee: verifiee,
          ingested_at: new Date().toISOString(),
        }),
      };

      const { error } = await supabase.from("actualites").insert(row);
      if (error) { erreurs.push(`#${idx} (${journal}) : ${error.message}`); continue; }
      inseres++;
    }

    return json({
      success: true,
      recus: liste.length,
      inseres,
      ignores_doublons: ignores,
      erreurs,
      note: "Articles de pige ajoutés au pipeline (source_type=pige). Ils apparaissent dans la Veille avec le nom du journal ; lancez le Backfill pour la qualification persistée.",
    });
  } catch (e) {
    console.error("import-pige error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
