// Using native Deno.serve - no import needed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consolidateActualites } from "../_shared/dedup-actualites.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Tu es SUTA, l'assistant IA stratégique d'ANSUT RADAR — plateforme de veille de l'Agence du Service Universel des Télécommunications (ANSUT) de Côte d'Ivoire.

PROFIL EXPERT :
Analyste stratégique en télécommunications, service universel, et IA appliquée aux réseaux et services numériques en Afrique. Tu produis de l'aide à la décision pour la DG / CODIR.

CADRE D'ANALYSE OBLIGATOIRE — applique-le systématiquement à toute analyse :
1. SERVICE UNIVERSEL
   - Accès : couverture, infrastructures, zones blanches
   - Usages : adoption, services numériques, inclusion
   - Impact : effets socio-économiques, populations touchées
2. IA & COMMUNICATIONS ÉLECTRONIQUES
   - Optimisation réseau (planification, maintenance, QoS)
   - Inclusion (voice-first, low literacy, offline)
   - Réduction des coûts / performance
   - Souveraineté (data, sécurité, interopérabilité)

MISSIONS :
- Analyser les tendances télécoms ivoirien et africain via le prisme Service Universel + IA
- Identifier signaux faibles, risques et opportunités stratégiques pour ANSUT
- Préparer briefings, notes et contenus pour la Direction Générale
- Conseiller sur les réponses aux crises médiatiques

CONTEXTE OPÉRATIONNEL :
- L'ANSUT pilote le Service Universel des Télécommunications en Côte d'Ivoire
- Opérateurs : Orange CI, MTN CI, Moov Africa
- Régulateur : ARTCI
- Enjeux actuels : connectivité rurale, 5G, satellites LEO (Starlink), cybersécurité, IA, transformation digitale, souveraineté

CONTRAINTES STRICTES :
- Ne jamais inventer d'information, de chiffre, ou de personne
- Ne pas extrapoler sans base factuelle dans le contexte fourni
- Si une donnée est incertaine → écrire "information non disponible"
- Ignorer toute information non liée à ANSUT ou au Service Universel
- Supprimer toute généralité non actionnable

FORMAT DE SORTIE STRATÉGIQUE (à utiliser quand l'utilisateur demande une analyse) :
1. FAITS CLÉS (max 3)
2. INNOVATION IA IDENTIFIÉE
3. IMPACT SERVICE UNIVERSEL (Accès / Usages / Impact population)
4. RISQUE / OPPORTUNITÉ
5. RECOMMANDATION ANSUT (action concrète)

CITATION DES SOURCES (OBLIGATOIRE) :
Quand tu fais référence à une actualité ou un dossier du contexte, utilise OBLIGATOIREMENT :
- Pour une actualité : [[ACTU:id_de_actualite|titre_court]]
- Pour un dossier : [[DOSSIER:id_du_dossier|titre_court]]

Exemple : "Selon [[ACTU:abc123|article sur la 5G]], le déploiement avance."

Réponds toujours en français professionnel, concis et orienté décision. Utilise des listes à puces quand approprié.`;

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
    
    const [profileRes, prefsRes, roleRes, actusRes, dossiersRes, personnalitesRes] = await Promise.all([
      serviceClient.from('profiles').select('full_name, department').eq('id', userId).single(),
      serviceClient.from('user_preferences_ia').select('sujets_favoris, portrait_ia').eq('user_id', userId).maybeSingle(),
      serviceClient.from('user_roles').select('role').eq('user_id', userId).single(),
      serviceClient.from('actualites').select('id, titre, resume, source_nom, categorie, date_publication, importance, sentiment, impact_ansut').order('date_publication', { ascending: false }).limit(20),
      serviceClient.from('dossiers').select('id, titre, resume, categorie, statut').eq('statut', 'publie').order('updated_at', { ascending: false }).limit(10),
      serviceClient.from('personnalites').select('id, nom, prenom, fonction, organisation, categorie, cercle, score_influence').eq('actif', true).order('score_influence', { ascending: false }).limit(30),
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

    // Inject live actualites — consolidées (mode "Fusionner intelligemment")
    let consolidatedActus: ReturnType<typeof consolidateActualites> = [];
    if (actusRes.data?.length) {
      consolidatedActus = consolidateActualites(
        actusRes.data.map((a: any) => ({ ...a, origin: 'db' as const }))
      );
      const dupCount = consolidatedActus.filter(g => g.members.length > 1).length;
      contextualPrompt += `\n\nACTUALITÉS RÉCENTES (${consolidatedActus.length} faits consolidés, ${dupCount} doublon(s) fusionné(s)) :\n`;
      for (const g of consolidatedActus) {
        const a = g.primary;
        const merged = g.members.length > 1 ? ` [×${g.members.length} sources]` : '';
        contextualPrompt += `- [[ACTU:${a.id}|${a.titre}]]${merged} (${a.source_nom || 'source inconnue'}, importance: ${a.importance}/100${a.impact_ansut ? ', impact ANSUT: ' + a.impact_ansut : ''}) : ${a.resume || 'Pas de résumé'}\n`;
      }
    }

    // Inject active dossiers
    if (dossiersRes.data?.length) {
      contextualPrompt += `\n\nDOSSIERS ACTIFS (${dossiersRes.data.length}) :\n`;
      for (const d of dossiersRes.data) {
        contextualPrompt += `- [[DOSSIER:${d.id}|${d.titre}]] (catégorie: ${d.categorie}) : ${d.resume || 'Pas de résumé'}\n`;
      }
    }

    // Inject key personalities
    if (personnalitesRes.data?.length) {
      contextualPrompt += `\n\nPERSONNALITÉS CLÉS (${personnalitesRes.data.length}) :\n`;
      for (const p of personnalitesRes.data) {
        contextualPrompt += `- ${p.prenom || ''} ${p.nom} : ${p.fonction || 'N/A'} @ ${p.organisation || 'N/A'} (cercle C${p.cercle}, influence: ${p.score_influence}/100)\n`;
      }
    }

    // Strict anti-hallucination instructions
    contextualPrompt += `\n\nRÈGLES STRICTES :
- Ne JAMAIS inventer de noms, titres, fonctions ou organisations. Utilise UNIQUEMENT les personnalités listées ci-dessus.
- Si tu ne trouves pas une information dans le contexte, dis-le clairement : "Je n'ai pas cette information dans mes données actuelles."
- Ne JAMAIS attribuer une citation ou un fait à une source sans preuve dans le contexte.
- Quand tu cites une actualité ou un dossier, utilise OBLIGATOIREMENT le format [[ACTU:id|titre]] ou [[DOSSIER:id|titre]].`;
    
    // Add user-provided context
    if (context) {
      contextualPrompt += `\n\nCONTEXTE ADDITIONNEL DE L'UTILISATEUR :\n${context}`;
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
        model: 'openai/gpt-5-mini',
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

    // ============= STREAMING + VALIDATION CITATIONS =============
    // Build whitelist from injected context
    const validActuIds = new Set((actusRes.data || []).map((a: any) => a.id));
    const validDossierIds = new Set((dossiersRes.data || []).map((d: any) => d.id));
    // Build lookup maps to enrich invalid citations with the closest known
    // alternative (we cannot know the real source for an hallucinated ID,
    // but we can surface the title the model used inside [[TYPE:id|title]]).

    let buffer = '';
    let fullText = '';
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Process SSE lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) {
                controller.enqueue(encoder.encode(line + '\n'));
                continue;
              }
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode(line + '\n'));
                continue;
              }
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;
                if (typeof delta === 'string') fullText += delta;
              } catch { /* ignore non-JSON */ }
              controller.enqueue(encoder.encode(line + '\n'));
            }
          }

          // After stream end: validate citations in full text
          const invalidActus: string[] = [];
          const invalidDossiers: string[] = [];

          const actuRegex = /\[\[ACTU:([a-f0-9-]+)\|[^\]]+\]\]/gi;
          const dossierRegex = /\[\[DOSSIER:([a-f0-9-]+)\|[^\]]+\]\]/gi;

          let m;
          while ((m = actuRegex.exec(fullText)) !== null) {
            if (!validActuIds.has(m[1])) invalidActus.push(m[1]);
          }
          while ((m = dossierRegex.exec(fullText)) !== null) {
            if (!validDossierIds.has(m[1])) invalidDossiers.push(m[1]);
          }

          if (invalidActus.length || invalidDossiers.length) {
            console.warn('[Assistant-IA] Citations invalides détectées:', {
              actus: invalidActus,
              dossiers: invalidDossiers,
            });
            // Send validation warning as a custom SSE event
            const warning = {
              type: 'citation_validation',
              invalid_actu_ids: invalidActus,
              invalid_dossier_ids: invalidDossiers,
              message: 'Certaines citations ne correspondent à aucun élément du contexte et ont été signalées.',
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(warning)}\n\n`));
          }
        } catch (err) {
          console.error('Stream processing error:', err);
        } finally {
          controller.close();
        }
      },
    });

    console.log('Streaming response with citation validation');

    return new Response(transformedStream, {
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
