// Using native Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveModeleGateway } from "../_shared/modeles.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Alignement stratégique des actualités.
 *
 * La veille de l'ANSUT ne demande pas « cette information est-elle importante ? »
 * mais « touche-t-elle une priorité actuelle de l'ANSUT ? ». Cette fonction lit
 * le référentiel des piliers (Feuille de route MTNIT 2026-2028, table
 * `piliers_strategiques`) et, pour chaque article, demande au modèle :
 *   - le pilier stratégique principal impacté (ou aucun) ;
 *   - un score d'alignement 0-100 ;
 *   - pourquoi c'est important pour l'ANSUT ;
 *   - une action suggérée ;
 *   - un niveau de confiance 0-100.
 *
 * Ces résultats sont persistés (`pilier_id`, `piliers`, `score_pertinence`,
 * `importance`, `pourquoi_important`, `action_suggeree`, `confiance_ia`).
 *
 * Découplée de la collecte : appelable pour de nouveaux articles comme pour un
 * rattrapage (backfill), via { ids?: string[], limit?: number }.
 */

interface Pilier {
  id: string;
  code: string;
  nom: string;
  objectif: string | null;
  projets_ansut: string[] | null;
}

interface ArticleAAligner {
  id: string;
  titre: string;
  resume: string | null;
}

interface AlignementIA {
  index: number;
  pilier_id: string | null;
  alignement: number;
  pourquoi_important?: string;
  action_suggeree?: string;
  confiance?: number;
}

const clamp = (n: unknown, min: number, max: number, fallback: number): number => {
  const v = Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
};

async function alignerLot(
  lot: ArticleAAligner[],
  piliers: Pilier[],
  offset: number,
  apiKey: string,
  modele: string,
): Promise<AlignementIA[]> {
  const referentiel = piliers
    .map((p) => {
      const projets = (p.projets_ansut || []).length
        ? ` Projets ANSUT : ${(p.projets_ansut || []).join(' ; ')}.`
        : '';
      return `- ${p.id} (${p.code} — ${p.nom}) : ${p.objectif || ''}${projets}`;
    })
    .join('\n');

  const liste = lot
    .map((a, i) => `[${offset + i}] "${a.titre}" — ${(a.resume || '').substring(0, 200)}`)
    .join('\n');

  const systeme = `Tu es l'analyste stratégique de l'ANSUT (Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire), qui met en œuvre la Feuille de route Transition Numérique et Innovation Technologique 2026-2028 du Ministère (MTNIT).

Piliers stratégiques (identifiant, code, objectif) :
${referentiel}

Pour chaque article, détermine s'il a un impact sur une PRIORITÉ ACTUELLE de l'ANSUT — pas son importance générale. Un fait divers international sans lien avec les missions de l'ANSUT a un alignement faible, même s'il est spectaculaire.

Pour chaque article, renvoie :
- "pilier_id" : l'identifiant EXACT du pilier principal impacté (dans la liste ci-dessus), ou null si aucun ;
- "alignement" : 0-100 (0 = aucun rapport, 100 = au cœur d'une priorité ANSUT) ;
- "pourquoi_important" : une phrase courte expliquant l'impact pour l'ANSUT (vide si alignement faible) ;
- "action_suggeree" : une action concrète (ex. « Préparer une note d'analyse », « Surveiller », « Partager à la Direction concernée »), ou vide ;
- "confiance" : 0-100, ta confiance dans cette analyse.

Réponds UNIQUEMENT par un tableau JSON : [{"index":0,"pilier_id":"...","alignement":85,"pourquoi_important":"...","action_suggeree":"...","confiance":90}]. Utilise l'index exact fourni entre crochets.`;

  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modele,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systeme },
        { role: 'user', content: liste },
      ],
    }),
  });

  if (!resp.ok) {
    console.error('[aligner-actualites] Erreur LLM:', resp.status, await resp.text());
    return [];
  }

  const data = await resp.json();
  const texte = data.choices?.[0]?.message?.content || '';
  const match = texte.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]) as AlignementIA[];
  } catch (e) {
    console.error('[aligner-actualites] JSON illisible:', e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Configuration Supabase manquante' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY non configurée' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;
    const limit: number = Math.min(Math.max(Number(body?.limit) || 30, 1), 100);
    // Modèle : celui demandé (registre), sinon le modèle par défaut du registre.
    const modele = resolveModeleGateway(body?.model);

    // Référentiel des piliers actifs.
    const { data: piliersData, error: pErr } = await supabase
      .from('piliers_strategiques')
      .select('id, code, nom, objectif, projets_ansut')
      .eq('actif', true)
      .order('ordre', { ascending: true });
    if (pErr) throw pErr;
    const piliers = (piliersData || []) as Pilier[];
    const idsValides = new Set(piliers.map((p) => p.id));
    if (piliers.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucun pilier stratégique actif' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Articles à aligner : ceux fournis, sinon les récents non encore alignés.
    let query = supabase.from('actualites').select('id, titre, resume');
    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    } else {
      query = query.is('action_suggeree', null).order('created_at', { ascending: false });
    }
    const { data: articles, error: aErr } = await query.limit(limit);
    if (aErr) throw aErr;

    const cibles = (articles || []) as ArticleAAligner[];
    if (cibles.length === 0) {
      return new Response(JSON.stringify({ aligned: 0, message: 'Aucun article à aligner' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let aligned = 0;
    const TAILLE_LOT = 12;
    for (let debut = 0; debut < cibles.length; debut += TAILLE_LOT) {
      const lot = cibles.slice(debut, debut + TAILLE_LOT);
      const resultats = await alignerLot(lot, piliers, debut, LOVABLE_API_KEY, modele);

      for (const r of resultats) {
        const article = cibles[r.index];
        if (!article) continue;
        const pilierId = r.pilier_id && idsValides.has(r.pilier_id) ? r.pilier_id : null;
        const alignement = clamp(r.alignement, 0, 100, 0);

        const { error: upErr } = await supabase
          .from('actualites')
          .update({
            pilier_id: pilierId,
            piliers: pilierId ? [pilierId] : [],
            score_pertinence: alignement,
            importance: alignement,
            pourquoi_important: r.pourquoi_important?.trim() || null,
            action_suggeree: r.action_suggeree?.trim() || null,
            confiance_ia: clamp(r.confiance, 0, 100, 50),
          })
          .eq('id', article.id);

        if (upErr) console.error('[aligner-actualites] MAJ échouée:', article.id, upErr);
        else aligned++;
      }
    }

    console.log(`[aligner-actualites] ${aligned}/${cibles.length} articles alignés.`);
    return new Response(JSON.stringify({ aligned, total: cibles.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[aligner-actualites] Erreur:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
