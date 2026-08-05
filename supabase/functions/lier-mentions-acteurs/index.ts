import { refuserSiNonAutorise } from "../_shared/habilitation.ts";
// Using native Deno.serve
//
// lier-mentions-acteurs
// ---------------------
// Job central qui relie les acteurs suivis aux contenus déjà collectés
// (actualites + social_insights) en écrivant les tables `mentions` et
// `personnalites_mentions`, puis en mettant à jour `personnalites.derniere_activite`.
//
// Pourquoi : le schéma prévoyait ce lien acteur↔contenu, mais AUCUN code ne
// l'écrivait. Résultat, l'écran Acteurs ne pouvait afficher ni « nombre de
// mentions », ni « dernière mention » sans les inventer (interdit par la
// Charte de crédibilité). Ce job crée la donnée réelle, traçable à la source.
//
// Méthode explicable : appariement du nom complet de l'acteur par FRONTIÈRE DE
// MOT (pas de sous-chaîne), sur le titre/résumé/contenu et sur les entités
// personnes déjà extraites. Une « mention » = l'acteur est nommé dans un
// contenu sourcé — ce n'est PAS une « prise de parole » (l'acteur n'a pas
// nécessairement parlé). Le vocabulaire côté écran doit rester « mention ».
//
// Idempotent : un couple (acteur, source_url) déjà relié sur la fenêtre n'est
// jamais dupliqué. Rejouable et backfillable sans effet de bord.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-token",
};

/** Minuscule + sans accents, pour un appariement robuste. */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Échappe une chaîne pour usage dans une regex. */
function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Vrai si `nomNormalise` apparaît dans `texteNormalise` en frontière de mot
 * (borné par un non-caractère-de-lettre ou une extrémité). Évite les faux
 * positifs par sous-chaîne (ex. « Ba » dans « Bamba »).
 */
function contientNom(texteNormalise: string, nomNormalise: string): boolean {
  if (!texteNormalise || !nomNormalise) return false;
  const re = new RegExp(
    `(?:^|[^\\p{L}])${echapper(nomNormalise)}(?:[^\\p{L}]|$)`,
    "u",
  );
  return re.test(texteNormalise);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Habilitation (audit P0 #1) : cron interne (x-internal-token) ou utilisateur connecté.
  const refus = await refuserSiNonAutorise(req, { cors: corsHeaders });
  if (refus) return refus;


  const startTime = Date.now();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const sinceDays: number = Number(body?.sinceDays) > 0 ? Number(body.sinceDays) : 30;
    const windowISO = new Date(Date.now() - sinceDays * 86400000).toISOString();

    // 1. Acteurs actifs (nom complet exploitable).
    const { data: acteurs, error: errActeurs } = await supabase
      .from("personnalites")
      .select("id, nom, prenom, derniere_activite")
      .eq("actif", true);
    if (errActeurs) throw errActeurs;

    // Nom complet normalisé, borné aux acteurs réellement identifiables.
    const cibles = (acteurs || [])
      .map((a) => {
        const complet = `${a.prenom || ""} ${a.nom || ""}`.trim();
        return { ...a, recherche: normaliser(complet), tokens: complet.split(/\s+/).filter(Boolean) };
      })
      // Exiger au moins un nom + prénom (2 tokens) OU un nom d'au moins 5 lettres,
      // pour éviter d'apparier des noms trop courts/génériques.
      .filter((a) => a.tokens.length >= 2 || (a.recherche.length >= 5));

    if (cibles.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, acteurs: 0, mentions_creees: 0, message: "Aucun acteur identifiable." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Contenus récents, chargés une seule fois.
    const { data: articles } = await supabase
      .from("actualites")
      .select("id, titre, resume, contenu, source_nom, source_url, date_publication, sentiment, importance, entites_personnes")
      .gte("date_publication", windowISO)
      .order("date_publication", { ascending: false })
      .limit(3000);

    const { data: socials } = await supabase
      .from("social_insights")
      .select("id, contenu, auteur, plateforme, url_original, date_publication, sentiment, est_critique, entites_detectees")
      .gte("date_publication", windowISO)
      .order("date_publication", { ascending: false })
      .limit(3000);

    // Pré-normalisation des contenus (une fois).
    const articlesN = (articles || []).map((a) => ({
      ...a,
      _txt: normaliser(`${a.titre || ""} ${a.resume || ""} ${a.contenu || ""}`),
      _ent: normaliser((a.entites_personnes || []).join(" ")),
    }));
    const socialsN = (socials || []).map((s) => ({
      ...s,
      _txt: normaliser(`${s.contenu || ""} ${s.auteur || ""}`),
      _ent: normaliser((s.entites_detectees || []).join(" ")),
    }));

    // 3. Liens déjà existants sur la fenêtre → set de source_url par acteur (idempotence).
    const dejaLie = new Map<string, Set<string>>();
    const { data: liensExistants } = await supabase
      .from("personnalites_mentions")
      .select("personnalite_id, mentions!inner(source_url, date_mention)")
      .gte("mentions.date_mention", windowISO);
    for (const l of (liensExistants || []) as any[]) {
      const url = l.mentions?.source_url;
      if (!url) continue;
      if (!dejaLie.has(l.personnalite_id)) dejaLie.set(l.personnalite_id, new Set());
      dejaLie.get(l.personnalite_id)!.add(url);
    }

    // 4. Appariement en mémoire → mentions à créer.
    type ARemplir = {
      personnalite_id: string;
      contenu: string;
      source: string | null;
      source_url: string | null;
      date_mention: string | null;
      sentiment: number | null;
      est_critique: boolean;
    };
    const aCreer: ARemplir[] = [];
    const derniereParActeur = new Map<string, string>();

    for (const acteur of cibles) {
      const vus = dejaLie.get(acteur.id) || new Set<string>();
      const vusRun = new Set<string>(vus);

      const enregistrer = (m: ARemplir) => {
        const url = m.source_url || "";
        if (url && vusRun.has(url)) return;
        if (url) vusRun.add(url);
        aCreer.push(m);
        const d = m.date_mention;
        if (d) {
          const cur = derniereParActeur.get(acteur.id);
          if (!cur || d > cur) derniereParActeur.set(acteur.id, d);
        }
      };

      for (const a of articlesN) {
        if (contientNom(a._txt, acteur.recherche) || contientNom(a._ent, acteur.recherche)) {
          enregistrer({
            personnalite_id: acteur.id,
            contenu: (a.titre || a.resume || "").slice(0, 2000),
            source: a.source_nom || "presse",
            source_url: a.source_url,
            date_mention: a.date_publication,
            sentiment: a.sentiment ?? null,
            est_critique: (a.importance ?? 0) >= 8,
          });
        }
      }
      for (const s of socialsN) {
        if (contientNom(s._txt, acteur.recherche) || contientNom(s._ent, acteur.recherche)) {
          enregistrer({
            personnalite_id: acteur.id,
            contenu: (s.contenu || "").slice(0, 2000),
            source: s.plateforme || "social",
            source_url: s.url_original,
            date_mention: s.date_publication,
            sentiment: s.sentiment ?? null,
            est_critique: s.est_critique ?? false,
          });
        }
      }
    }

    // 5. Insertion des mentions puis des liens (par lots), en préservant l'ordre.
    let mentionsCreees = 0;
    const CHUNK = 200;
    for (let i = 0; i < aCreer.length; i += CHUNK) {
      const lot = aCreer.slice(i, i + CHUNK);
      const { data: inserted, error: errM } = await supabase
        .from("mentions")
        .insert(
          lot.map((m) => ({
            contenu: m.contenu,
            source: m.source,
            source_url: m.source_url,
            date_mention: m.date_mention,
            sentiment: m.sentiment,
            est_critique: m.est_critique,
          })),
        )
        .select("id");
      if (errM) throw errM;
      const ids = (inserted || []).map((r) => r.id);
      const liens = ids.map((mention_id, idx) => ({
        mention_id,
        personnalite_id: lot[idx].personnalite_id,
      }));
      if (liens.length > 0) {
        const { error: errL } = await supabase.from("personnalites_mentions").insert(liens);
        if (errL) throw errL;
      }
      mentionsCreees += ids.length;
    }

    // 6. Mise à jour de la dernière activité (date de la mention la plus récente).
    let acteursMaj = 0;
    for (const acteur of cibles) {
      const nouvelle = derniereParActeur.get(acteur.id);
      if (!nouvelle) continue;
      const actuelle = acteur.derniere_activite as string | null;
      if (!actuelle || nouvelle > actuelle) {
        const { error } = await supabase
          .from("personnalites")
          .update({ derniere_activite: nouvelle })
          .eq("id", acteur.id);
        if (!error) acteursMaj++;
      }
    }

    const durationMs = Date.now() - startTime;

    // 7. Journalisation (déclenche les notifications temps réel comme les collectes).
    await supabase.from("collectes_log").insert({
      type: "lier-mentions-acteurs",
      statut: "success",
      nb_resultats: mentionsCreees,
      duree_ms: durationMs,
      mots_cles_utilises: ["mentions", "acteurs", `${sinceDays}j`],
    });

    console.log(
      `[lier-mentions-acteurs] ${cibles.length} acteurs, ${mentionsCreees} mentions créées, ${acteursMaj} dates mises à jour en ${durationMs}ms`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        acteurs: cibles.length,
        mentions_creees: mentionsCreees,
        acteurs_dates_maj: acteursMaj,
        fenetre_jours: sinceDays,
        duree_ms: durationMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("[lier-mentions-acteurs] échec:", message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
