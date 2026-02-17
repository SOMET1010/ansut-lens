import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BRIEFING_PROMPT = `Tu es l'assistant stratégique de l'ANSUT (Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire).
Génère un briefing exécutif de 3-4 phrases maximum résumant la situation du jour.

Règles strictes :
- Commence par "Ce matin" ou "Aujourd'hui" selon l'heure
- Identifie les 2-3 sujets prioritaires parmi les actualités fournies
- Si des alertes critiques sont présentes, mentionne-les avec ⚠️
- Utilise un ton professionnel, direct et stratégique
- Maximum 150 mots
- Texte brut uniquement, pas de liste à puces ni de markdown
- Pas de formule de politesse

Contexte : Tu génères ce briefing pour des décideurs du secteur numérique en Côte d'Ivoire.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // --- End Authentication ---

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration error: AI service not available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for data access
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent actualités
    const { data: actualites, error: actualitesError } = await supabase
      .from('actualites')
      .select('titre, resume, importance, categorie')
      .order('date_publication', { ascending: false })
      .limit(5);

    if (actualitesError) {
      console.error('Error fetching actualites:', actualitesError);
    }

    // Fetch active critical signals
    const { data: signaux, error: signauxError } = await supabase
      .from('signaux')
      .select('titre, niveau, description')
      .eq('actif', true)
      .eq('niveau', 'critical');

    if (signauxError) {
      console.error('Error fetching signaux:', signauxError);
    }

    // Build context for AI
    const actualitesList = (actualites || []).map(a => 
      `- ${a.titre}${a.resume ? ` : ${a.resume.substring(0, 100)}` : ''} (importance: ${a.importance || 50}/100, catégorie: ${a.categorie || 'non classé'})`
    ).join('\n');

    const alertesCritiques = (signaux || []).length;
    const alertesDetails = alertesCritiques > 0 
      ? `\n\nAlertes critiques actives (${alertesCritiques}):\n${signaux!.map(s => `- ${s.titre}: ${s.description || 'Pas de détails'}`).join('\n')}`
      : '\n\nAucune alerte critique en cours.';

    const context = actualitesList.length > 0
      ? `Actualités du jour:\n${actualitesList}${alertesDetails}`
      : `Aucune actualité récente disponible.${alertesDetails}`;

    console.log('Generating briefing with context:', context.substring(0, 500));

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: BRIEFING_PROMPT },
          { role: 'user', content: context }
        ],
        stream: false,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const briefing = aiData.choices?.[0]?.message?.content;

    if (!briefing) {
      console.error('No briefing content in AI response:', aiData);
      return new Response(
        JSON.stringify({ error: 'Failed to generate briefing content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Briefing generated successfully:', briefing.substring(0, 100));

    return new Response(
      JSON.stringify({
        briefing: briefing.trim(),
        generated_at: new Date().toISOString(),
        sources_count: (actualites || []).length,
        alerts_count: alertesCritiques,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in generer-briefing:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
