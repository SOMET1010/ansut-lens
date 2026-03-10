import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BRIEFING_PROMPT = `Tu es l'analyste stratégique de l'ANSUT (Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire).

RÈGLES ABSOLUES — INTÉGRITÉ DES FAITS :
1. INTERDICTION FORMELLE d'inventer des faits, des chiffres ou des événements.
2. Ne cite QUE les actualités fournies dans le contexte ci-dessous. Ne reformule JAMAIS une info en ajoutant des détails non présents.
3. Si le contexte ne contient pas assez d'actualités pour un briefing complet, dis-le clairement : "Peu d'actualités disponibles ce matin."
4. N'utilise JAMAIS de verbes affirmatifs ("a inauguré", "a annoncé") sauf si l'actualité source le dit explicitement.
5. CHAQUE fait mentionné DOIT être suivi d'une référence [1], [2], etc. correspondant à l'index de l'actualité dans la liste fournie (commençant à 1).

FILTRAGE PAR PERTINENCE DÉCIDEUR :
- PRIORITÉ 1 (toujours inclure) : Projets Service Universel, Inclusion Numérique, Impact social, décisions gouvernementales CI.
- PRIORITÉ 2 (inclure si pertinent) : Mouvements des opérateurs (Orange CI, MTN CI, Moov Africa), nouvelles régulations ARTCI, partenariats stratégiques.
- REJETER SYSTÉMATIQUEMENT : Failles techniques de routeurs/CVE, mises à jour logicielles mineures, alertes cyber génériques (sauf impact direct sur l'ANSUT ou continuité du service national), actualités hors Afrique de l'Ouest sans lien avec le secteur télécom ivoirien.

FORMAT :
- Commence par "Ce matin" ou "Aujourd'hui" selon l'heure.
- 3-4 phrases maximum, 150 mots max.
- Si des alertes critiques PERTINENTES sont présentes, mentionne-les avec ⚠️.
- Texte brut uniquement, pas de liste à puces ni de markdown (sauf les références [1], [2]).
- Ton professionnel, direct et stratégique.
- Pas de formule de politesse.`;

serve(async (req) => {
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
    const userId = claimsData.claims.sub as string;
    // --- End Authentication ---

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration error: AI service not available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user profile + preferences + rejected feedback in parallel
    const [actualitesRes, signauxRes, profileRes, prefsRes, roleRes, feedbackRes] = await Promise.all([
      supabase
        .from('actualites')
        .select('titre, resume, importance, categorie, source_url, source_nom, date_publication')
        .order('date_publication', { ascending: false })
        .limit(10),
      supabase
        .from('signaux')
        .select('titre, niveau, description')
        .eq('actif', true)
        .eq('niveau', 'critical'),
      supabase.from('profiles').select('full_name, department').eq('id', userId).single(),
      supabase.from('user_preferences_ia').select('sujets_favoris, sujets_ignores, portrait_ia').eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).single(),
      supabase.from('actualites_feedback').select('actualite_id, raison').eq('user_id', userId).eq('feedback', 'not_relevant').limit(50),
    ]);

    const actualites = actualitesRes.data || [];
    const signaux = signauxRes.data || [];
    const userName = profileRes.data?.full_name || 'utilisateur';
    const userDept = profileRes.data?.department;
    const userRole = roleRes.data?.role || 'user';
    const userPrefs = prefsRes.data;
    const rejectedIds = new Set((feedbackRes.data || []).map(f => f.actualite_id));

    // Filter out previously rejected articles
    const filteredActualites = actualites.filter(a => !rejectedIds.has((a as any).id));

    // Only include articles with valid source URLs (anti-hallucination)
    const verifiedActualites = filteredActualites.filter(a => {
      if (!a.source_url) return true; // Allow articles without URL but flag them
      try {
        new URL(a.source_url);
        return true;
      } catch {
        return false;
      }
    });

    // Build context
    const actualitesList = verifiedActualites.slice(0, 7).map(a => 
      `- ${a.titre}${a.resume ? ` : ${a.resume.substring(0, 120)}` : ''} (importance: ${a.importance || 50}/100, catégorie: ${a.categorie || 'non classé'}, source: ${a.source_nom || 'inconnue'}${a.source_url ? `, url: ${a.source_url}` : ', PAS DE LIEN SOURCE'})`
    ).join('\n');

    const alertesCritiques = signaux.length;
    const alertesDetails = alertesCritiques > 0 
      ? `\n\nAlertes critiques actives (${alertesCritiques}):\n${signaux.map(s => `- ${s.titre}: ${s.description || 'Pas de détails'}`).join('\n')}`
      : '\n\nAucune alerte critique en cours.';

    // Personalization context
    let personalization = `\n\nDESTINATAIRE : ${userName}`;
    if (userDept) personalization += `, département ${userDept}`;
    personalization += ` (rôle: ${userRole}).`;
    if (userPrefs?.sujets_favoris?.length) {
      personalization += `\nSujets d'intérêt prioritaires : ${userPrefs.sujets_favoris.join(', ')}.`;
    }
    if (userPrefs?.sujets_ignores?.length) {
      personalization += `\nSujets explicitement rejetés (NE PAS inclure) : ${userPrefs.sujets_ignores.join(', ')}.`;
    }

    const rejectedReasons = (feedbackRes.data || []).filter(f => f.raison).map(f => f.raison);
    if (rejectedReasons.length > 0) {
      personalization += `\nRaisons de rejets passés par cet utilisateur : ${[...new Set(rejectedReasons)].slice(0, 5).join('; ')}.`;
    }

    const context = verifiedActualites.length > 0
      ? `Actualités vérifiées du jour:\n${actualitesList}${alertesDetails}${personalization}`
      : `Aucune actualité récente disponible.${alertesDetails}${personalization}`;

    console.log('Generating briefing with context length:', context.length, 'for user:', userName);

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
        temperature: 0.3, // Lower temperature for more factual output
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

    console.log('Briefing generated successfully for', userName);

    return new Response(
      JSON.stringify({
        briefing: briefing.trim(),
        generated_at: new Date().toISOString(),
        sources_count: verifiedActualites.length,
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
