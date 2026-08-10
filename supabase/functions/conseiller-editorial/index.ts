// Using native Deno.serve
import { resolveModeleGateway } from "../_shared/modeles.ts";
import { validerConseil, type ConseilBrutIA } from "../_shared/conseiller.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Conseiller éditorial IA (Étage 4 du pipeline).
 *
 * RADAR est un conseiller éditorial. Cette fonction lit une OPPORTUNITÉ déjà
 * détectée de façon DÉTERMINISTE côté front (un thème stratégique dont
 * l'écosystème parle et sur lequel l'ANSUT n'a rien publié — « terrain vacant »),
 * et produit une lecture éditoriale courte de cette opportunité.
 *
 * Contrat strict (identique à `recit-sujet`, cf. PIPELINE_EDITORIAL.md §7) :
 *   - entrée = contenu DÉJÀ QUALIFIÉ (l'opportunité et ses articles de preuve),
 *     jamais des articles bruts non filtrés ;
 *   - sortie STRUCTURÉE (JSON contraint), jamais de prose libre ;
 *   - l'IA ne cite QUE des identifiants fournis en entrée (validation serveur :
 *     un id inventé est retiré) ;
 *   - l'IA EXPLIQUE, elle ne DÉCIDE pas : toute injonction invalide le conseil
 *     (garde `contientInjonction`), qui retombe alors sur la version déterministe ;
 *   - un conseil sans preuve valide est rejeté (non traçable → non affiché).
 *
 * L'ancrage factuel (le comptage réel, les preuves) reste calculé côté front de
 * façon déterministe : l'IA n'enrichit QUE la formulation de l'opportunité. Si
 * elle échoue ou est indisponible, le front conserve le conseil déterministe —
 * donc aucune régression.
 */

interface ArticleFait {
  id: string;
  titre?: string;
  source?: string;
  extrait?: string;
}

interface OpportuniteFaits {
  subject_id: string;
  nom: string;
  code: string;
  periodeJours: number;
  nbArticles: number;
  external_content: ArticleFait[];
}

const SYSTEME = `Tu es le conseiller éditorial de la Direction de la Communication de l'ANSUT (Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire).

On te confie une OPPORTUNITÉ ÉDITORIALE déjà repérée : un thème stratégique dont l'écosystème (presse, acteurs) parle, et sur lequel l'ANSUT n'a rien publié sur la période — un « terrain vacant ». Ta tâche : décrire cette opportunité à un Directeur de la Communication, en 2 à 3 phrases, à partir UNIQUEMENT des articles fournis.

RÈGLES ABSOLUES :
- Tu n'utilises AUCUNE connaissance extérieure. Tu ne t'appuies QUE sur les articles fournis. Si un élément n'y figure pas, il n'existe pas.
- Tu n'INVENTES jamais de chiffre, de partenaire, d'annonce ou de date.
- Tu ne cites que des articles dont l'identifiant (id) est fourni. Les ids que tu renvoies dans evidence_ids DOIVENT figurer dans les articles fournis.
- Tu DÉCRIS l'opportunité (de quoi parle l'écosystème, sous quel angle, ce que le silence de l'ANSUT laisse ouvert). Tu n'écris JAMAIS ce qu'il faut faire.
- INTERDIT ABSOLU : toute injonction ou recommandation d'action. Bannis « il faut », « vous devriez », « il est recommandé », « l'ANSUT doit/devrait », les impératifs (« publiez », « prenez la parole »). Tu exposes un fait éditorial (le terrain est vacant), pas une consigne.
- Si la matière est mince, dis-le dans "limitations" et reste prudent.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{
  "texte": "<2 à 3 phrases décrivant l'opportunité, sans aucune injonction>",
  "evidence_ids": ["<ids des articles sur lesquels tu t'appuies>"],
  "limitations": "<ce que les données ne permettent pas d'affirmer, ou vide>"
}`;

function faitsUtilisateur(o: OpportuniteFaits): string {
  const arts = o.external_content
    .map((c) => `  - [${c.id}] "${c.titre ?? ''}" — source : ${c.source ?? 'inconnue'}${c.extrait ? ` — ${c.extrait}` : ''}`)
    .join('\n');

  return `OPPORTUNITÉ : le thème « ${o.nom} » (${o.code}) — pilier stratégique de l'ANSUT.
Constat déterministe : sur les ${o.periodeJours} derniers jours, ${o.nbArticles} contenu(s) de l'écosystème traitent ce thème, et l'ANSUT n'a publié AUCUN contenu dessus. Le terrain est éditorialement vacant.

Articles de l'écosystème (les seules preuves autorisées) :
${arts || '  (aucun)'}`;
}

async function genererConseil(
  o: OpportuniteFaits,
  apiKey: string,
  modele: string,
): Promise<ReturnType<typeof validerConseil>> {
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modele,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEME },
        { role: 'user', content: faitsUtilisateur(o) },
      ],
    }),
  });

  if (!resp.ok) {
    console.error('[conseiller-editorial] Erreur LLM:', resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  const texte = data.choices?.[0]?.message?.content || '';
  const match = texte.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let brut: ConseilBrutIA;
  try {
    brut = JSON.parse(match[0]);
  } catch (e) {
    console.error('[conseiller-editorial] JSON illisible:', e);
    return null;
  }

  // Gardes charte (liste blanche d'ids + anti-injonction), logique portable.
  const idsAutorises = new Set(o.external_content.map((c) => c.id));
  return validerConseil(brut, idsAutorises);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY non configurée' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const o: OpportuniteFaits | null = body?.opportunite ?? null;
    const modele = resolveModeleGateway(body?.model);

    // Pas d'opportunité ou pas de preuve → pas de conseil IA (le front garde le
    // conseil déterministe, ou aucun).
    if (!o || !Array.isArray(o.external_content) || o.external_content.length === 0) {
      return new Response(JSON.stringify({ conseil: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const conseil = await genererConseil(o, LOVABLE_API_KEY, modele);

    return new Response(JSON.stringify({ conseil }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[conseiller-editorial] Erreur:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
