import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Tu es l'assistant IA d'ANSUT RADAR, une plateforme de veille stratégique pour l'Agence Nationale du Service Universel des Télécommunications (ANSUT) de Côte d'Ivoire.

Ton rôle :
- Analyser les tendances du secteur télécoms ivoirien et africain
- Identifier les signaux faibles et risques stratégiques
- Résumer les actualités et leur impact sur l'ANSUT
- Préparer des briefings pour la Direction Générale
- Conseiller sur les réponses aux crises médiatiques

Contexte :
- L'ANSUT gère le service universel des télécommunications en Côte d'Ivoire
- Les principaux opérateurs sont Orange CI, MTN CI, Moov Africa
- L'ARTCI est l'autorité de régulation
- Les enjeux actuels incluent : connectivité rurale, déploiement 5G, satellites LEO (Starlink), cybersécurité, transformation digitale

IMPORTANT - Citation des sources :
Quand tu fais référence à une actualité ou un dossier du contexte, tu DOIS utiliser ce format de citation :
- Pour une actualité : [[ACTU:id_de_actualite|titre_court]]
- Pour un dossier : [[DOSSIER:id_du_dossier|titre_court]]

Exemple : "Selon [[ACTU:abc123|article sur la 5G]], le déploiement avance."

Réponds toujours en français, de manière concise et professionnelle. Utilise des listes à puces quand approprié.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    
    // Build contextual system prompt
    let contextualPrompt = SYSTEM_PROMPT;
    if (context) {
      contextualPrompt = `${SYSTEM_PROMPT}\n\n${context}\n\nUtilise ces informations contextuelles pour personnaliser et enrichir tes réponses. CITE OBLIGATOIREMENT les sources avec le format [[ACTU:id|titre]] ou [[DOSSIER:id|titre]] quand tu fais référence à une actualité ou un dossier du contexte.`;
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Calling Lovable AI Gateway with', messages.length, 'messages');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: contextualPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Crédits épuisés. Veuillez recharger votre compte.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Erreur du service IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Streaming response from AI Gateway');

    // Stream the response directly
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in assistant-ia function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
