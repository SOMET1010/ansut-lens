import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  qualifierContenu,
  contentKey,
  RULES_VERSION,
} from "../_shared/qualification.ts";

/**
 * Étage 2 du pipeline éditorial — écrit la qualification UNIQUE et persistée.
 *
 * Rôle : pour chaque contenu (publications_institutionnelles + actualites),
 * calculer UNE fois les FAITS éditoriaux (via le qualifieur portable partagé,
 * identique au frontend) et les upserter dans `editorial_qualifications`, clé
 * `content_key` — un contenu présent dans les deux tables n'est qualifié qu'une
 * fois. Aucune éligibilité n'est écrite (Option B : dérivées par politique).
 *
 * NON destructif : n'INSÈRE/UPDATE que `editorial_qualifications`. Ne touche
 * jamais aux tables de contenu. Idempotent (rejouable). Modes :
 *   - "diagnostic" : compte sans écrire (dry-run).
 *   - "backfill"   : (dé)faut, upsert de tout l'historique.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Facts = ReturnType<typeof qualifierContenu>;

function ligneQualif(
  key: string,
  refs: { publication_id?: string; actualite_id?: string },
  f: Facts,
) {
  return {
    content_key: key,
    publication_id: refs.publication_id ?? null,
    actualite_id: refs.actualite_id ?? null,
    editorial_date: f.editorial_date,
    date_verified: f.date_verified,
    date_source: f.date_source,
    category: f.category,
    primary_theme: f.primary_theme,
    secondary_themes: f.secondary_themes,
    is_institutional: f.is_institutional,
    is_ansut_voice: f.is_ansut_voice,
    evidence: f.evidence,
    limitations: f.limitations,
    qualification_method: "deterministic",
    rules_version: RULES_VERSION,
    qualified_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { mode = "backfill" } = await req.json().catch(() => ({ mode: "backfill" }));
    const nowMs = Date.now();

    // 1) Publications ANSUT — provenance de date fiable déjà en base.
    const { data: pubs, error: ePub } = await supabase
      .from("publications_institutionnelles")
      .select(
        "id, contenu, url_original, date_publication, publication_date_verified, publication_date_source",
      );
    if (ePub) throw ePub;

    // 2) Actualités — pas de provenance dédiée : une date présente est traitée
    //    comme vérifiée (parité avec le qualifieur frontend), provenance inconnue.
    const { data: actus, error: eActu } = await supabase
      .from("actualites")
      .select("id, titre, resume, contenu, source_url, source_type, categorie, date_publication");
    if (eActu) throw eActu;

    // Construire les qualifications des publications (clé de contenu).
    const parCle = new Map<string, ReturnType<typeof ligneQualif>>();
    for (const p of pubs ?? []) {
      const texte = p.contenu ?? "";
      if (!texte && !p.url_original) continue;
      const key = contentKey(p.url_original, texte);
      const f = qualifierContenu({
        texte,
        publishedAt: p.date_publication,
        dateVerified: !!p.publication_date_verified,
        dateSource: p.publication_date_source || "unknown",
        isAnsutVoice: true,
        nowMs,
      });
      // La publication fait autorité sur la datation → écrase une éventuelle
      // entrée plus faible portant la même clé.
      parCle.set(key, ligneQualif(key, { publication_id: p.id }, f));
    }

    // Rattacher / créer depuis les actualités.
    let actusLiees = 0;
    let actusCreees = 0;
    for (const a of actus ?? []) {
      const texte = [a.titre, a.resume, a.contenu].filter(Boolean).join(" ").trim();
      if (!texte && !a.source_url) continue;
      const key = contentKey(a.source_url, texte);
      const estVoixAnsut =
        (a.source_type ?? "").toLowerCase() === "institutionnel" ||
        (a.categorie ?? "").toLowerCase() === "institutionnel";

      const existante = parCle.get(key);
      if (existante) {
        // Même contenu qu'une publication : on ne fait que rattacher l'actualité,
        // sans écraser les faits (la provenance de la publication prime).
        if (!existante.actualite_id) existante.actualite_id = a.id;
        actusLiees++;
        continue;
      }
      // Actualité externe (presse) : provenance de date inconnue.
      const f = qualifierContenu({
        texte,
        publishedAt: a.date_publication,
        dateVerified: !!a.date_publication,
        dateSource: "unknown",
        isAnsutVoice: estVoixAnsut,
        nowMs,
      });
      parCle.set(key, ligneQualif(key, { actualite_id: a.id }, f));
      actusCreees++;
    }

    const lignes = [...parCle.values()];

    if (mode === "diagnostic") {
      return new Response(
        JSON.stringify({
          mode,
          publications: pubs?.length ?? 0,
          actualites: actus?.length ?? 0,
          content_keys_distinctes: lignes.length,
          datees_verifiees: lignes.filter((l) => l.date_verified).length,
          voix_ansut: lignes.filter((l) => l.is_ansut_voice).length,
          institutionnelles: lignes.filter((l) => l.is_institutional).length,
          actualites_liees: actusLiees,
          actualites_creees: actusCreees,
          rules_version: RULES_VERSION,
          note: "diagnostic (dry-run) — aucune écriture",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert par lots sur la clé métier content_key.
    let upsertees = 0;
    for (let i = 0; i < lignes.length; i += 500) {
      const lot = lignes.slice(i, i + 500);
      const { error } = await supabase
        .from("editorial_qualifications")
        .upsert(lot, { onConflict: "content_key" });
      if (error) throw error;
      upsertees += lot.length;
    }

    return new Response(
      JSON.stringify({
        mode: "backfill",
        upsertees,
        actualites_liees: actusLiees,
        actualites_creees: actusCreees,
        rules_version: RULES_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("requalifier-contenus error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
