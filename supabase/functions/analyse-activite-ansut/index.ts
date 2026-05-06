import { corsHeaders } from '@supabase/supabase-js/cors';

interface AnalysisRequest {
  visibilityScore: number;
  totalPubs: number;
  totalPubs7j: number;
  variationGlobale: number;
  networks: any[];
  sentimentBreakdown: { positif: number; neutre: number; negatif: number; total: number };
  formatCounts: Record<string, number>;
  piliers: { pilier: string; count: number; pct: number }[];
  alerts: { niveau: string; message: string }[];
  accounts: { nom: string; plateforme: string; publications_24h: number; publications_7j: number; taux_engagement: number; statut_activite: string }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY manquant');

    const payload: AnalysisRequest = await req.json();

    const systemPrompt = `Tu es un analyste senior en stratégie de communication numérique institutionnelle pour l'Agence Nationale du Service Universel des Télécommunications (ANSUT) de Côte d'Ivoire.
Ta mission : produire une analyse exécutive courte, concrète et actionnable destinée au CODIR ANSUT, à partir de KPIs sur l'activité des comptes ANSUT.
Pas de remplissage. Pas de paraphrase des chiffres. Tu dois EXTRAIRE du sens.

Contexte stratégique ANSUT :
- Mission : connectivité, inclusion numérique, service universel, zones blanches, eServices
- Concurrents/comparatifs : MTN, Orange, Moov, ARTCI
- Le DG attend : verdict, risques réputation, opportunités, recommandations claires.

Tu réponds STRICTEMENT en JSON via tool call.`;

    const userPrompt = `KPIs activité numérique ANSUT (24h + 7j) :
${JSON.stringify(payload, null, 2)}

Produis l'analyse exécutive.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyse_activite_ansut',
            description: 'Analyse exécutive activité numérique ANSUT',
            parameters: {
              type: 'object',
              properties: {
                verdict_global: { type: 'string', description: 'Verdict en 1-2 phrases (ex: "Présence faible, dominée par contenu institutionnel statique").' },
                niveau_alerte: { type: 'string', enum: ['vert', 'orange', 'rouge'] },
                ce_qui_fonctionne: { type: 'array', items: { type: 'string' }, description: '2-4 points concrets' },
                ce_qui_echoue: { type: 'array', items: { type: 'string' }, description: '2-4 points concrets' },
                manques_critiques: { type: 'array', items: { type: 'string' }, description: 'Sujets/formats absents (ex: zones blanches, vidéo terrain)' },
                risques_reputation: { type: 'array', items: { type: 'string' } },
                recommandations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      action: { type: 'string' },
                      priorite: { type: 'string', enum: ['haute', 'moyenne', 'basse'] },
                      delai: { type: 'string' },
                    },
                    required: ['action', 'priorite', 'delai'],
                  },
                },
                campagne_prioritaire: { type: 'string', description: 'Une campagne à lancer immédiatement (titre + format conseillé)' },
              },
              required: ['verdict_global', 'niveau_alerte', 'ce_qui_fonctionne', 'ce_qui_echoue', 'manques_critiques', 'risques_reputation', 'recommandations', 'campagne_prioritaire'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'analyse_activite_ansut' } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Trop de requêtes, réessayez plus tard.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'Crédits Lovable AI épuisés.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error('AI gateway error', response.status, t);
      return new Response(JSON.stringify({ error: 'Erreur AI Gateway' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    const analysis = args ? JSON.parse(args) : null;

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('analyse-activite-ansut error', e);
    return new Response(JSON.stringify({ error: e.message || 'Erreur interne' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
