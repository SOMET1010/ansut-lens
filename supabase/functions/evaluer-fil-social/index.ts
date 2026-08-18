/**
 * Évaluation d'un fil social signalé manuellement (option A du document
 * `docs/PROCEDURE_ACCES_SOCIAUX.md`).
 *
 * Aucune API sociale n'est requise : la COM colle l'URL d'un post (y compris
 * chez un tiers, cas SIKA Finance) et saisit les commentaires observés. Cette
 * fonction :
 *   1. note la tonalité de chaque commentaire non encore noté (Lovable AI) ;
 *   2. applique une règle d'alerte EXPLICABLE (charte de crédibilité) ;
 *   3. crée une alerte listant les commentaires réels qui la déclenchent.
 *
 * Règle d'alerte (documentée et affichée dans l'interface) :
 *   - 3 commentaires négatifs (sentiment <= -0.3) ou plus sur les dernières 24 h ;
 *   - OU 1 commentaire négatif d'un auteur marqué « compte influent ».
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { refuserSiNonAutorise, enTetesInternes } from "../_shared/habilitation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": enTetesInternes,
};

const SEUIL_NEGATIF = -0.3;
const SEUIL_NB_NEGATIFS_24H = 3;

interface Commentaire {
  id: string;
  auteur: string | null;
  contenu: string;
  auteur_influent: boolean;
  sentiment: number | null;
  date_commentaire: string;
}

/** Note la tonalité des commentaires non encore notés. -1 (hostile) → +1 (favorable). */
async function noterTonalites(
  commentaires: Commentaire[],
  cle: string,
): Promise<Record<string, number>> {
  const aNoter = commentaires.filter((c) => c.sentiment === null || c.sentiment === undefined);
  if (aNoter.length === 0) return {};

  const liste = aNoter
    .map((c, i) => `${i + 1}. ${(c.auteur ?? "anonyme")}: ${c.contenu.slice(0, 500)}`)
    .join("\n");

  const reponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Tu notes la tonalité de commentaires publics à l'égard de l'ANSUT (Agence Nationale du Service Universel des Télécommunications, Côte d'Ivoire). " +
            "Réponds UNIQUEMENT par un JSON {\"notes\":[{\"n\":1,\"sentiment\":-0.8}]} où sentiment est un nombre entre -1 (hostile) et 1 (favorable). Aucun texte hors JSON.",
        },
        { role: "user", content: liste },
      ],
    }),
  });

  if (!reponse.ok) {
    console.error("[evaluer-fil-social] AI gateway", reponse.status, await reponse.text());
    return {};
  }

  const brut = await reponse.json();
  const texte: string = brut?.choices?.[0]?.message?.content ?? "";
  const bloc = texte.match(/\{[\s\S]*\}/);
  if (!bloc) return {};

  const resultats: Record<string, number> = {};
  try {
    const parse = JSON.parse(bloc[0]);
    for (const note of parse?.notes ?? []) {
      const index = Number(note?.n) - 1;
      const valeur = Number(note?.sentiment);
      if (aNoter[index] && Number.isFinite(valeur)) {
        resultats[aNoter[index].id] = Math.max(-1, Math.min(1, valeur));
      }
    }
  } catch (erreur) {
    console.error("[evaluer-fil-social] JSON illisible", erreur);
  }
  return resultats;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const refus = await refuserSiNonAutorise(req, { cors: corsHeaders });
  if (refus) return refus;

  try {
    const { fil_id } = await req.json();
    if (!fil_id) {
      return new Response(JSON.stringify({ error: "fil_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: fil, error: erreurFil } = await supabase
      .from("fils_sociaux")
      .select("*")
      .eq("id", fil_id)
      .maybeSingle();
    if (erreurFil) throw erreurFil;
    if (!fil) {
      return new Response(JSON.stringify({ error: "Fil introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: commentairesBruts, error: erreurCom } = await supabase
      .from("commentaires_fil")
      .select("id, auteur, contenu, auteur_influent, sentiment, date_commentaire")
      .eq("fil_id", fil_id)
      .order("date_commentaire", { ascending: false });
    if (erreurCom) throw erreurCom;

    const commentaires = (commentairesBruts ?? []) as Commentaire[];
    if (commentaires.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Aucun commentaire saisi pour ce fil.", alerte: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cle = Deno.env.get("LOVABLE_API_KEY");
    const nouvellesNotes = cle ? await noterTonalites(commentaires, cle) : {};

    for (const [id, sentiment] of Object.entries(nouvellesNotes)) {
      await supabase.from("commentaires_fil").update({ sentiment }).eq("id", id);
    }

    const notes = commentaires.map((c) => ({
      ...c,
      sentiment: nouvellesNotes[c.id] ?? c.sentiment,
    }));

    const notesConnues = notes.filter((c) => typeof c.sentiment === "number");
    const tonaliteGlobale = notesConnues.length
      ? notesConnues.reduce((s, c) => s + (c.sentiment as number), 0) / notesConnues.length
      : null;

    const depuis24h = Date.now() - 24 * 3600 * 1000;
    const negatifs24h = notes.filter(
      (c) =>
        typeof c.sentiment === "number" &&
        (c.sentiment as number) <= SEUIL_NEGATIF &&
        new Date(c.date_commentaire).getTime() >= depuis24h,
    );
    const negatifInfluent = notes.find(
      (c) => c.auteur_influent && typeof c.sentiment === "number" && (c.sentiment as number) <= SEUIL_NEGATIF,
    );

    const motifs: string[] = [];
    if (negatifs24h.length >= SEUIL_NB_NEGATIFS_24H) {
      motifs.push(`${negatifs24h.length} commentaires négatifs en moins de 24 h`);
    }
    if (negatifInfluent) {
      motifs.push(`commentaire négatif d'un compte influent (${negatifInfluent.auteur ?? "auteur non nommé"})`);
    }

    const doitAlerter = motifs.length > 0;
    let alerteCreee = false;

    if (doitAlerter && !fil.alerte_generee) {
      const preuves = (negatifs24h.length ? negatifs24h : notes)
        .slice(0, 3)
        .map((c) => `« ${c.contenu.slice(0, 160)} » — ${c.auteur ?? "anonyme"}`)
        .join("\n");

      const { error: erreurAlerte } = await supabase.from("alertes").insert({
        type: "reaction_sociale",
        niveau: negatifInfluent ? "critique" : "eleve",
        titre: `Réactions négatives sur un fil ${fil.plateforme}`,
        message:
          `Motif : ${motifs.join(" ; ")}.\n` +
          `Publication : ${fil.titre ?? fil.url}\n${fil.url}\n\nCommentaires déclencheurs :\n${preuves}`,
        reference_type: "fil_social",
        reference_id: fil.id,
        user_id: fil.signale_par,
      });
      if (erreurAlerte) console.error("[evaluer-fil-social] alerte", erreurAlerte);
      else alerteCreee = true;
    }

    await supabase
      .from("fils_sociaux")
      .update({
        tonalite_globale: tonaliteGlobale,
        derniere_evaluation: new Date().toISOString(),
        alerte_generee: fil.alerte_generee || alerteCreee,
        statut: doitAlerter ? "alerte" : fil.statut === "alerte" ? "alerte" : "a_suivre",
      })
      .eq("id", fil_id);

    return new Response(
      JSON.stringify({
        ok: true,
        commentaires_notes: Object.keys(nouvellesNotes).length,
        tonalite_globale: tonaliteGlobale,
        negatifs_24h: negatifs24h.length,
        alerte: doitAlerter,
        alerte_creee: alerteCreee,
        motifs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (erreur) {
    console.error("[evaluer-fil-social]", erreur);
    return new Response(
      JSON.stringify({ error: erreur instanceof Error ? erreur.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
