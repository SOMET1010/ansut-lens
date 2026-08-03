// Using native Deno.serve
import { resolveModeleGateway } from "../_shared/modeles.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Récit éditorial d'un SUJET (nouvelle unité de lecture de RADAR).
 *
 * RADAR est un conseiller éditorial : pour un sujet donné (déjà constitué côté
 * client à partir des contenus collectés), cette fonction produit une lecture
 * courte, argumentée et VÉRIFIABLE. Contrat strict :
 *   - le récit ne s'appuie QUE sur les faits fournis (aucune connaissance externe,
 *     aucune invention) ;
 *   - il ne peut citer que des contenus dont l'identifiant est fourni en entrée
 *     (validation côté serveur : les identifiants inconnus sont retirés) ;
 *   - il EXPLIQUE, il ne décide pas : aucune recommandation, aucune injonction ;
 *   - il expose ses limites (`limitations`) quand les données sont minces.
 *
 * Sortie structurée (jamais du texte libre seul) :
 *   { subject_id, headline, narrative, why_today, evidence_ids,
 *     ansut_content_ids, external_content_ids, limitations }
 */

interface ContenuFait {
  id: string;
  titre?: string;
  source?: string;
  extrait?: string;
  plateforme?: string;
}

interface SujetFaits {
  subject_id: string;
  nom: string;
  code: string;
  periodeJours: number;
  ecart: string;
  compteurs: {
    articles: number;
    publications: number;
    articles24h: number;
    articlesAvant24h: number;
    sources: number;
  };
  external_content: ContenuFait[];
  ansut_content: ContenuFait[];
  partenaires: string[];
}

interface RecitSujet {
  subject_id: string;
  headline: string;
  narrative: string;
  why_today: string;
  evidence_ids: string[];
  ansut_content_ids: string[];
  external_content_ids: string[];
  limitations: string;
}

const SYSTEME = `Tu es le conseiller éditorial de la Direction de la Communication de l'ANSUT (Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire).

Ton rôle : lire un SUJET (un thème) à partir UNIQUEMENT des faits fournis, et le raconter à un Directeur de la Communication en 3 à 5 phrases.

RÈGLES ABSOLUES :
- Tu n'utilises AUCUNE connaissance extérieure. Tu ne t'appuies QUE sur les contenus et compteurs fournis. Si un élément n'est pas dans les faits, il n'existe pas.
- Tu n'INVENTES jamais de chiffre, de partenaire, d'annonce ou de date.
- Tu ne cites que des contenus dont l'identifiant (id) est fourni. Les identifiants que tu renvoies dans evidence_ids/ansut_content_ids/external_content_ids DOIVENT figurer dans les faits.
- Tu EXPLIQUES, tu ne décides pas. AUCUNE recommandation, AUCUNE injonction, AUCun « il faut / vous devriez / il est conseillé ». Tu décris ce qui se passe, pas ce qu'il faut faire.
- Le récit doit couvrir : ce qui se passe ; ce qui a changé (mouvement) ; la place de l'ANSUT ; l'écart éventuel entre la communication de l'ANSUT et celle de l'écosystème.
- Si la matière est mince, dis-le dans "limitations" et reste prudent.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{
  "subject_id": "<repris tel quel>",
  "headline": "<titre court, factuel, 6-10 mots>",
  "narrative": "<3 à 5 phrases, sans injonction>",
  "why_today": "<pourquoi ce sujet ressort, en langage clair, sans score ni pourcentage>",
  "evidence_ids": ["<ids de contenus cités>"],
  "ansut_content_ids": ["<ids de publications ANSUT utilisées>"],
  "external_content_ids": ["<ids d'articles de veille utilisés>"],
  "limitations": "<ce que les données ne permettent pas d'affirmer, ou vide>"
}`;

function faitsUtilisateur(s: SujetFaits): string {
  const ext = s.external_content
    .map((c) => `  - [${c.id}] "${c.titre ?? ''}" — source : ${c.source ?? 'inconnue'}`)
    .join('\n');
  const ans = s.ansut_content
    .map((c) => `  - [${c.id}] (${c.plateforme ?? 'ANSUT'}) ${c.extrait ?? ''}`)
    .join('\n');

  return `SUJET : ${s.nom} (${s.code})
Identifiant du sujet : ${s.subject_id}
Période observée : ${s.periodeJours} derniers jours
Compteurs (à ne pas dépasser) : ${s.compteurs.articles} article(s) de veille (dont ${s.compteurs.articles24h} depuis hier, ${s.compteurs.articlesAvant24h} la veille précédente), ${s.compteurs.publications} publication(s) ANSUT, ${s.compteurs.sources} source(s) distincte(s).
Écart constaté : ${s.ecart}
Partenaires/institutions cités : ${s.partenaires.length ? s.partenaires.join(', ') : 'aucun détecté'}

Articles de veille (écosystème) :
${ext || '  (aucun)'}

Publications ANSUT :
${ans || '  (aucune)'}`;
}

async function genererRecit(
  s: SujetFaits,
  apiKey: string,
  modele: string,
): Promise<RecitSujet | null> {
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
        { role: 'user', content: faitsUtilisateur(s) },
      ],
    }),
  });

  if (!resp.ok) {
    console.error('[recit-sujet] Erreur LLM:', resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  const texte = data.choices?.[0]?.message?.content || '';
  const match = texte.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let brut: Partial<RecitSujet>;
  try {
    brut = JSON.parse(match[0]);
  } catch (e) {
    console.error('[recit-sujet] JSON illisible:', e);
    return null;
  }

  // Validation : on n'autorise QUE les identifiants réellement fournis. Un id
  // cité mais absent des faits est retiré (le récit ne peut prouver que ce qui
  // existe).
  const extIds = new Set(s.external_content.map((c) => c.id));
  const ansIds = new Set(s.ansut_content.map((c) => c.id));
  const tousIds = new Set([...extIds, ...ansIds]);
  const filtrer = (arr: unknown, ref: Set<string>): string[] =>
    Array.isArray(arr) ? (arr as unknown[]).map(String).filter((x) => ref.has(x)) : [];

  return {
    subject_id: s.subject_id,
    headline: String(brut.headline ?? '').trim(),
    narrative: String(brut.narrative ?? '').trim(),
    why_today: String(brut.why_today ?? '').trim(),
    evidence_ids: filtrer(brut.evidence_ids, tousIds),
    ansut_content_ids: filtrer(brut.ansut_content_ids, ansIds),
    external_content_ids: filtrer(brut.external_content_ids, extIds),
    limitations: String(brut.limitations ?? '').trim(),
  };
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
    const sujets: SujetFaits[] = Array.isArray(body?.sujets) ? body.sujets.slice(0, 5) : [];
    const modele = resolveModeleGateway(body?.model);

    if (sujets.length === 0) {
      return new Response(JSON.stringify({ recits: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recits: RecitSujet[] = [];
    for (const s of sujets) {
      const r = await genererRecit(s, LOVABLE_API_KEY, modele);
      if (r && r.narrative) recits.push(r);
    }

    return new Response(JSON.stringify({ recits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[recit-sujet] Erreur:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
