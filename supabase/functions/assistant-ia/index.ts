// Using native Deno.serve - no import needed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // --- End Authentication ---
    const userId = claimsData.claims.sub as string;

    const { messages, context, mode } = await req.json();
    
    // Validate messages input
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mode-specific prompts
    const modePrompts: Record<string, string> = {
      recherche: `

MODE RECHERCHE ACTIVÉ:
- Réponds de façon synthétique avec des listes à puces
- Cite SYSTÉMATIQUEMENT tes sources avec le format [[ACTU:id|titre]] ou [[DOSSIER:id|titre]]
- Privilégie les faits et les données concrètes
- Structure ta réponse en sections claires`,
      redaction: `

MODE RÉDACTION ACTIVÉ:
- Génère des documents structurés et professionnels
- Utilise un ton formel adapté à la Direction Générale
- Structure avec: OBJET, I. CONTEXTE, II. ANALYSE, III. RECOMMANDATIONS
- Format adapté pour export (notes ministérielles, briefings DG, rapports)
- Cite les sources dans le document avec le format [[ACTU:id|titre]]`,
      analyse: `

MODE ANALYSE ACTIVÉ:
- Fournis des analyses chiffrées et des statistiques
- Utilise des tableaux comparatifs quand pertinent
- Identifie les tendances et signaux faibles
- Évalue les risques et opportunités
- Termine par des recommandations concrètes et priorisées`,
      communication: `

MODE COMMUNICATION ACTIVÉ:
Tu es un directeur de communication stratégique. Pour chaque sujet, structure ta réponse ainsi :

## 📋 RÉSUMÉ DU SUJET
Un paragraphe synthétique du contexte et des enjeux.

## 🎯 MESSAGES CLÉS
3-5 messages clés à retenir et diffuser.

## 📝 PROPOSITIONS DE CONTENUS
### Post LinkedIn (3-4 phrases, ton professionnel, emojis adaptés)
### Post X/Twitter (max 280 caractères, percutant, hashtags)
### Email Direction Générale (format note de service, objet + 3 paragraphes)

## 💡 ANGLES DE COMMUNICATION
2-3 angles éditoriaux possibles avec le public cible pour chaque angle.

Règles :
- Tous les contenus doivent valoriser l'ANSUT et le numérique en Côte d'Ivoire
- Le ton est professionnel mais accessible
- Les contenus doivent être directement utilisables
- Cite les sources du contexte avec [[ACTU:id|titre]] si pertinent`,
    };
    
    // Build contextual system prompt
    let contextualPrompt = SYSTEM_PROMPT;
    
    // Add mode-specific instructions
    if (mode && modePrompts[mode]) {
      contextualPrompt += modePrompts[mode];
    }

    // Fetch user profile for personalization
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    const [profileRes, prefsRes, roleRes] = await Promise.all([
      serviceClient.from('profiles').select('full_name, department').eq('id', userId).single(),
      serviceClient.from('user_preferences_ia').select('sujets_favoris, portrait_ia').eq('user_id', userId).maybeSingle(),
      serviceClient.from('user_roles').select('role').eq('user_id', userId).single(),
    ]);

    const userName = profileRes.data?.full_name || 'utilisateur';
    const userDept = profileRes.data?.department;
    const userPrefs = prefsRes.data;
    const userRole = roleRes.data?.role || 'user';

    contextualPrompt += `\n\nPERSONNALISATION :
- Tu t'adresses à ${userName}${userDept ? ` du département ${userDept}` : ''} (rôle: ${userRole}).
- Salue-le par son prénom de manière chaleureuse.`;

    if (userPrefs?.sujets_favoris?.length) {
      contextualPrompt += `\n- Ses sujets d'intérêt principaux : ${userPrefs.sujets_favoris.join(', ')}.`;
    }
    if (userPrefs?.portrait_ia) {
      contextualPrompt += `\n- Son profil de veille : ${userPrefs.portrait_ia}`;
    }
    
    // Add context
    if (context) {
      contextualPrompt += `\n\n${context}\n\nUtilise ces informations contextuelles pour personnaliser et enrichir tes réponses. CITE OBLIGATOIREMENT les sources avec le format [[ACTU:id|titre]] ou [[DOSSIER:id|titre]] quand tu fais référence à une actualité ou un dossier du contexte.`;
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
      error: 'Erreur du service IA'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
