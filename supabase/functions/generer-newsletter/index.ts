import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  periode: "hebdo" | "mensuel";
  ton: "institutionnel" | "pedagogique" | "strategique";
  cible: "dg_ca" | "partenaires" | "general";
  date_debut?: string;
  date_fin?: string;
}

interface NewsletterContenu {
  header?: { image_url?: string; image_alt?: string };
  edito: { texte: string; genere_par_ia: boolean };
  essentiel_ansut: Array<{ titre: string; pourquoi: string; impact: string; image_url?: string; image_alt?: string }>;
  tendance_tech: { titre: string; contenu: string; lien_ansut: string; image_url?: string; image_alt?: string };
  decryptage: { titre: string; contenu: string };
  chiffre_marquant: { valeur: string; unite: string; contexte: string };
  a_venir: Array<{ type: string; titre: string; date?: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🚀 [generer-newsletter] Démarrage de la génération...");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ [generer-newsletter] Pas d'autorisation");
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Vérification des variables d'environnement
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ [generer-newsletter] Variables Supabase manquantes");
      throw new Error("Configuration Supabase manquante");
    }

    if (!lovableApiKey) {
      console.error("❌ [generer-newsletter] LOVABLE_API_KEY manquante");
      throw new Error("Clé API IA manquante");
    }

    console.log("✅ [generer-newsletter] Variables d'environnement OK");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request
    const { periode, ton, cible, date_debut, date_fin }: GenerateRequest = await req.json();
    console.log(`📋 [generer-newsletter] Paramètres: periode=${periode}, ton=${ton}, cible=${cible}`);

    // Calculate date range
    const endDate = date_fin ? new Date(date_fin) : new Date();
    const startDate = date_debut 
      ? new Date(date_debut) 
      : new Date(endDate.getTime() - (periode === 'hebdo' ? 7 : 30) * 24 * 60 * 60 * 1000);

    console.log(`📅 [generer-newsletter] Période: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`);

    // Get next newsletter number
    const { data: lastNewsletter, error: lastError } = await adminClient
      .from('newsletters')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) {
      console.error("⚠️ [generer-newsletter] Erreur récupération dernier numéro:", lastError);
    }

    const nextNumero = (lastNewsletter?.numero || 0) + 1;
    console.log(`🔢 [generer-newsletter] Prochain numéro: ${nextNumero}`);

    // Fetch actualités for the period
    console.log("📰 [generer-newsletter] Récupération des actualités...");
    const { data: actualites, error: actualitesError } = await adminClient
      .from('actualites')
      .select('id, titre, resume, categorie, importance, date_publication, source_nom, pourquoi_important')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('importance', { ascending: false })
      .limit(30);

    if (actualitesError) {
      console.error('⚠️ [generer-newsletter] Erreur actualités:', actualitesError);
    } else {
      console.log(`✅ [generer-newsletter] ${actualites?.length || 0} actualités trouvées`);
    }

    // Fetch recent dossiers
    console.log("📁 [generer-newsletter] Récupération des dossiers...");
    const { data: dossiers, error: dossiersError } = await adminClient
      .from('dossiers')
      .select('titre, resume, categorie')
      .eq('statut', 'publie')
      .gte('updated_at', startDate.toISOString())
      .limit(5);

    if (dossiersError) {
      console.error('⚠️ [generer-newsletter] Erreur dossiers:', dossiersError);
    } else {
      console.log(`✅ [generer-newsletter] ${dossiers?.length || 0} dossiers trouvés`);
    }

    // Classify actualités
    const actualitesAnsut = actualites?.filter(a => 
      a.categorie?.toLowerCase().includes('ansut') || 
      a.categorie?.toLowerCase().includes('institutionnel') ||
      a.categorie?.toLowerCase().includes('service universel')
    ) || [];
    
    const actualitesTech = actualites?.filter(a => 
      a.categorie?.toLowerCase().includes('technolog') || 
      a.categorie?.toLowerCase().includes('ia') || 
      a.categorie?.toLowerCase().includes('cloud') ||
      a.categorie?.toLowerCase().includes('télécom') ||
      a.categorie?.toLowerCase().includes('digital') ||
      a.categorie?.toLowerCase().includes('numér')
    ) || [];

    console.log(`📊 [generer-newsletter] Classification: ${actualitesAnsut.length} ANSUT, ${actualitesTech.length} Tech`);

    // Build context for AI
    const contexte = {
      periode,
      ton,
      cible,
      date_debut: startDate.toISOString().split('T')[0],
      date_fin: endDate.toISOString().split('T')[0],
      actualites_ansut: actualitesAnsut.slice(0, 6).map(a => ({
        titre: a.titre,
        resume: a.resume || '',
        importance: a.importance,
        pourquoi: a.pourquoi_important || ''
      })),
      actualites_tech: actualitesTech.slice(0, 6).map(a => ({
        titre: a.titre,
        resume: a.resume || ''
      })),
      dossiers_recents: dossiers?.map(d => ({
        titre: d.titre,
        resume: d.resume || ''
      })) || [],
      toutes_actualites: actualites?.slice(0, 10).map(a => ({
        titre: a.titre,
        categorie: a.categorie,
        importance: a.importance
      })) || []
    };

    // Define tone instructions
    const tonInstructions: Record<string, string> = {
      pedagogique: "Un ton accessible, moderne et vulgarisateur. Pas de jargon administratif. Des phrases courtes et claires. Utilise des exemples concrets.",
      institutionnel: "Un ton formel et officiel, adapté aux communications institutionnelles de haut niveau. Vocabulaire précis et professionnel.",
      strategique: "Un ton analytique orienté décision, avec des insights stratégiques, des tendances et des recommandations d'action."
    };

    const cibleInstructions: Record<string, string> = {
      dg_ca: "Pour la Direction Générale et le Conseil d'Administration : focus sur les indicateurs clés, les enjeux stratégiques et les décisions à prendre.",
      partenaires: "Pour les partenaires institutionnels : accent sur l'impact des projets, les opportunités de collaboration et les résultats tangibles.",
      general: "Pour le grand public et les collaborateurs : vulgarisation, focus sur le bénéfice citoyen et les avancées concrètes du numérique en Côte d'Ivoire."
    };

    // Generate content with Lovable AI using Gemini 2.5 Flash (plus stable)
    const aiPrompt = `Tu es le rédacteur en chef de la newsletter ANSUT RADAR, la plateforme de veille stratégique de l'Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire.

Génère le contenu complet d'une newsletter ${periode === 'hebdo' ? 'hebdomadaire' : 'mensuelle'} pour la période du ${contexte.date_debut} au ${contexte.date_fin}.

## TON ATTENDU
${tonInstructions[ton]}

## CIBLE
${cibleInstructions[cible]}

## ACTUALITÉS ANSUT DISPONIBLES (priorité haute)
${JSON.stringify(contexte.actualites_ansut, null, 2)}

## ACTUALITÉS TECH DISPONIBLES
${JSON.stringify(contexte.actualites_tech, null, 2)}

## DOSSIERS RÉCENTS
${JSON.stringify(contexte.dossiers_recents, null, 2)}

## TOUTES LES ACTUALITÉS DE LA PÉRIODE
${JSON.stringify(contexte.toutes_actualites, null, 2)}

## INSTRUCTIONS DE GÉNÉRATION

Tu DOIS générer un JSON valide avec cette structure EXACTE:

{
  "edito": {
    "texte": "Un paragraphe de 3-4 lignes maximum situant le mois/semaine dans le contexte numérique ivoirien. Commence par une accroche forte.",
    "genere_par_ia": true
  },
  "essentiel_ansut": [
    {
      "titre": "Titre court et percutant orienté impact (max 10 mots)",
      "pourquoi": "Pourquoi c'est important en 1-2 phrases",
      "impact": "Ce que ça change concrètement pour les citoyens/entreprises en 1-2 phrases"
    }
  ],
  "tendance_tech": {
    "titre": "Pourquoi tout le monde parle de [sujet] ou Ce que [techno] change pour...",
    "contenu": "Explication de la tendance en 3-4 phrases accessibles",
    "lien_ansut": "Comment ça concerne l'ANSUT et le Service Universel en 2 phrases"
  },
  "decryptage": {
    "titre": "En 2 minutes : c'est quoi vraiment [concept technique] ?",
    "contenu": "Explication simple avec des exemples concrets (école, santé, PME, agriculture). 4-5 phrases."
  },
  "chiffre_marquant": {
    "valeur": "Nombre impressionnant (ex: 1247, 85%, 12)",
    "unite": "Unité claire (localités connectées, formations, projets lancés...)",
    "contexte": "Contexte du chiffre en 1 phrase percutante"
  },
  "a_venir": [
    {
      "type": "evenement|appel_projets|deploiement|decision",
      "titre": "Titre de l'événement/action à venir",
      "date": "Date prévue si connue ou période approximative"
    }
  ]
}

## RÈGLES IMPORTANTES
- Maximum 3 éléments dans essentiel_ansut
- Maximum 3 éléments dans a_venir  
- Toujours relier les tendances tech à la Côte d'Ivoire et au Service Universel
- Pas de jargon technique sans explication
- Chaque paragraphe = une seule idée
- Utilise les actualités fournies comme base, ne les invente pas
- Si peu d'actualités disponibles, concentre-toi sur les plus importantes
- Le JSON doit être parfaitement valide et parsable`;

    console.log('🤖 [generer-newsletter] Appel à l\'API Lovable AI (google/gemini-2.5-flash)...');

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Tu es un expert en communication institutionnelle et veille stratégique pour le secteur des télécommunications en Afrique. Tu génères du contenu de newsletter structuré en JSON valide uniquement. Tu réponds TOUJOURS avec un JSON valide, sans texte avant ou après." 
          },
          { role: "user", content: aiPrompt }
        ]
      })
    });

    console.log(`📡 [generer-newsletter] Réponse API: status=${aiResponse.status}`);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ [generer-newsletter] Erreur API IA:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Limite de requêtes IA atteinte. Veuillez réessayer dans quelques minutes.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Crédits IA insuffisants. Veuillez recharger votre compte.");
      }
      throw new Error(`Erreur API IA: ${aiResponse.status} - ${errorText.substring(0, 100)}`);
    }

    const aiData = await aiResponse.json();
    console.log('✅ [generer-newsletter] Réponse IA reçue');

    // Extract and parse content
    let generatedContent: NewsletterContenu;
    const rawContent = aiData.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      console.error('❌ [generer-newsletter] Pas de contenu dans la réponse IA');
      throw new Error("L'IA n'a pas généré de contenu");
    }

    console.log('📝 [generer-newsletter] Parsing du contenu JSON...');
    
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonString = rawContent;
      
      // Remove markdown code blocks if present
      if (jsonString.includes('```json')) {
        jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (jsonString.includes('```')) {
        jsonString = jsonString.replace(/```\s*/g, '');
      }
      
      jsonString = jsonString.trim();
      generatedContent = JSON.parse(jsonString);
      
    } catch (parseError) {
      console.error('❌ [generer-newsletter] Erreur parsing JSON:', parseError);
      console.error('📄 [generer-newsletter] Contenu brut:', rawContent.substring(0, 500));
      throw new Error("Format de réponse IA invalide. Veuillez réessayer.");
    }

    // Validate content structure
    console.log('🔍 [generer-newsletter] Validation de la structure...');
    
    if (!generatedContent.edito || !generatedContent.edito.texte) {
      console.error('❌ [generer-newsletter] Structure invalide: edito manquant');
      throw new Error("Structure de newsletter incomplète: édito manquant");
    }
    
    if (!generatedContent.essentiel_ansut || !Array.isArray(generatedContent.essentiel_ansut)) {
      console.error('❌ [generer-newsletter] Structure invalide: essentiel_ansut manquant');
      generatedContent.essentiel_ansut = [];
    }
    
    if (!generatedContent.tendance_tech) {
      generatedContent.tendance_tech = { titre: "Tendance à venir", contenu: "À définir", lien_ansut: "À définir" };
    }
    
    if (!generatedContent.decryptage) {
      generatedContent.decryptage = { titre: "Décryptage", contenu: "À définir" };
    }
    
    if (!generatedContent.chiffre_marquant) {
      generatedContent.chiffre_marquant = { valeur: "-", unite: "", contexte: "Données à venir" };
    }
    
    if (!generatedContent.a_venir || !Array.isArray(generatedContent.a_venir)) {
      generatedContent.a_venir = [];
    }

    console.log('✅ [generer-newsletter] Contenu validé');

    // Generate HTML versions
    console.log('🎨 [generer-newsletter] Génération du HTML...');
    const htmlCourt = generateProfessionalHtml(generatedContent, nextNumero, startDate, endDate, ton, cible);

    // Get current user
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseAnonKey) {
      console.error('⚠️ [generer-newsletter] Clé anon non trouvée');
    }
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    console.log(`👤 [generer-newsletter] Utilisateur: ${user?.id || 'anonyme'}`);

    // Save newsletter
    console.log('💾 [generer-newsletter] Sauvegarde en base...');
    const { data: newsletter, error: insertError } = await adminClient
      .from('newsletters')
      .insert({
        numero: nextNumero,
        periode,
        date_debut: startDate.toISOString().split('T')[0],
        date_fin: endDate.toISOString().split('T')[0],
        ton,
        cible,
        contenu: generatedContent,
        html_court: htmlCourt,
        statut: 'brouillon',
        genere_par: user?.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [generer-newsletter] Erreur sauvegarde:', insertError);
      throw new Error(`Erreur de sauvegarde: ${insertError.message}`);
    }

    console.log(`🎉 [generer-newsletter] Newsletter #${nextNumero} créée avec succès! ID: ${newsletter.id}`);

    return new Response(
      JSON.stringify(newsletter),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ [generer-newsletter] ERREUR FINALE:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateProfessionalHtml(
  content: NewsletterContenu, 
  numero: number, 
  startDate: Date, 
  endDate: Date,
  ton: string,
  cible: string
): string {
  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatMonthYear = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  
  const header = content.header || {};
  const edito = content.edito || { texte: '' };
  const essentielAnsut = content.essentiel_ansut || [];
  const tendanceTech = content.tendance_tech || { titre: '', contenu: '', lien_ansut: '' };
  const decryptage = content.decryptage || { titre: '', contenu: '' };
  const chiffreMarquant = content.chiffre_marquant || { valeur: '', unite: '', contexte: '' };
  const aVenir = content.a_venir || [];

  const tonLabel = ton === 'pedagogique' ? 'Pédagogique' : ton === 'institutionnel' ? 'Institutionnel' : 'Stratégique';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>INNOV'ACTU #${numero} - ${formatMonthYear(startDate)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <!-- Main Container -->
        <table width="700" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
          
          <!-- HEADER INNOV'ACTU -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 24px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- Logo ANSUT -->
                        <td width="80" valign="middle">
                          <div style="width: 60px; height: 60px; background: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                            <span style="font-size: 32px;">📡</span>
                          </div>
                        </td>
                        <!-- Title -->
                        <td valign="middle" style="padding-left: 16px;">
                          <div style="font-size: 42px; font-weight: 800; color: #e65100; letter-spacing: -1px; line-height: 1;">INNOV'ACTU</div>
                          <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-top: 6px; letter-spacing: 1px;">NEWSLETTER ANSUT</div>
                        </td>
                        <!-- Numero & Date -->
                        <td align="right" valign="middle">
                          <div style="background: #e65100; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 18px;">N°${numero}</div>
                          <div style="color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 8px;">${formatDate(startDate)}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Wave decoration -->
                <tr>
                  <td style="height: 6px; background: linear-gradient(90deg, #e65100 0%, #ff8a00 50%, #e65100 100%);"></td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- HEADER IMAGE (if available) -->
          ${header.image_url ? `
          <tr>
            <td style="padding: 0;">
              <img src="${header.image_url}" alt="${header.image_alt || 'Image newsletter'}" style="width: 100%; height: auto; display: block;" />
            </td>
          </tr>
          ` : ''}
          
          <!-- CONTENT AREA: SOMMAIRE + MAIN -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- SOMMAIRE (Left Sidebar) -->
                  <td width="180" valign="top" style="background: #e65100;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 24px 20px;">
                          <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 18px;">≡</span> Sommaire
                          </div>
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <a href="#edito" style="color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 500;">📝 Édito</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <a href="#ansut-news" style="color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 500;">🎯 ANSUT News</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <a href="#technologie" style="color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 500;">🔬 Technologie</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <a href="#en-2-minutes" style="color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 500;">📚 En 2 Minutes</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <a href="#chiffre" style="color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 500;">📊 Le Chiffre</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0;">
                                <a href="#avenir" style="color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 500;">📅 À Venir</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- MAIN CONTENT (Right) -->
                  <td valign="top" style="background: #ffffff;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      
                      <!-- ÉDITO -->
                      <tr id="edito">
                        <td style="padding: 28px 28px 24px 28px; border-bottom: 1px solid #e5e7eb;">
                          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                            <div style="width: 32px; height: 32px; background: #fef3c7; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px;">📝</div>
                            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #e65100;">Édito</span>
                          </div>
                          <div style="font-size: 15px; color: #475569; font-style: italic; line-height: 1.7; padding-left: 16px; border-left: 3px solid #e65100;">${edito.texte}</div>
                          <div style="text-align: right; font-size: 12px; color: #94a3b8; margin-top: 12px; font-weight: 500;">— La Rédaction ANSUT</div>
                        </td>
                      </tr>
                      
                      <!-- ANSUT NEWS -->
                      <tr id="ansut-news">
                        <td style="padding: 28px 28px 24px 28px; border-bottom: 1px solid #e5e7eb;">
                          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                            <div style="width: 32px; height: 32px; background: #fee2e2; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px;">🎯</div>
                            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #e65100;">ANSUT News</span>
                          </div>
                          ${essentielAnsut.map((item, index) => `
                            <div style="margin-bottom: 16px; padding: 16px; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 10px; border-left: 4px solid #e65100;">
                              ${item.image_url ? `
                                <img src="${item.image_url}" alt="${item.image_alt || item.titre}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;" />
                              ` : ''}
                              <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 10px; display: flex; align-items: flex-start; gap: 8px;">
                                <span style="background: #e65100; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0;">${index + 1}</span>
                                ${item.titre}
                              </div>
                              <div style="font-size: 13px; color: #64748b; margin-bottom: 6px; padding-left: 28px;"><strong style="color: #475569;">Pourquoi :</strong> ${item.pourquoi}</div>
                              <div style="font-size: 13px; color: #059669; font-weight: 600; padding-left: 28px;">→ ${item.impact}</div>
                            </div>
                          `).join('')}
                        </td>
                      </tr>
                      
                      <!-- TECHNOLOGIE -->
                      <tr id="technologie">
                        <td style="padding: 28px 28px 24px 28px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-bottom: 1px solid #bfdbfe;">
                          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                            <div style="width: 32px; height: 32px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white;">🔬</div>
                            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1e40af;">Technologie</span>
                          </div>
                          ${tendanceTech.image_url ? `
                            <img src="${tendanceTech.image_url}" alt="${tendanceTech.image_alt || tendanceTech.titre}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 12px; margin-bottom: 16px;" />
                          ` : ''}
                          <div style="font-size: 15px; font-weight: 700; color: #1e40af; margin-bottom: 12px;">${tendanceTech.titre}</div>
                          <div style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 16px;">${tendanceTech.contenu}</div>
                          <div style="background: white; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #1e40af;">
                            <strong style="color: #e65100;">👉 Pour l'ANSUT :</strong> ${tendanceTech.lien_ansut}
                          </div>
                        </td>
                      </tr>
                      
                      <!-- EN 2 MINUTES -->
                      <tr id="en-2-minutes">
                        <td style="padding: 28px 28px 24px 28px; background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border-bottom: 1px solid #fde047;">
                          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                            <div style="width: 32px; height: 32px; background: #eab308; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white;">📚</div>
                            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #854d0e;">En 2 Minutes</span>
                          </div>
                          <div style="font-size: 15px; font-weight: 700; color: #854d0e; margin-bottom: 12px;">${decryptage.titre}</div>
                          <div style="font-size: 14px; color: #422006; line-height: 1.6;">${decryptage.contenu}</div>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- LE CHIFFRE MARQUANT (Full Width) -->
          <tr id="chiffre">
            <td style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); text-align: center; padding: 48px 32px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.7); margin-bottom: 16px;">📊 Le Chiffre Marquant</div>
              <div style="font-size: 72px; font-weight: 800; color: #e65100; line-height: 1; margin-bottom: 8px;">${chiffreMarquant.valeur}</div>
              <div style="font-size: 20px; font-weight: 600; color: #ffffff; margin-bottom: 12px;">${chiffreMarquant.unite}</div>
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); max-width: 400px; margin: 0 auto;">${chiffreMarquant.contexte}</div>
            </td>
          </tr>
          
          <!-- À VENIR -->
          <tr id="avenir">
            <td style="padding: 28px 32px; background: #ffffff; border-top: 4px solid #e65100;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                <div style="width: 32px; height: 32px; background: #f3e8ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px;">📅</div>
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #e65100;">À Venir</span>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${aVenir.map(item => `
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="40" valign="top">
                            <div style="width: 36px; height: 36px; background: ${item.type === 'evenement' ? '#dbeafe' : item.type === 'appel_projets' ? '#dcfce7' : item.type === 'deploiement' ? '#fef3c7' : '#f3e8ff'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                              ${item.type === 'evenement' ? '📆' : item.type === 'appel_projets' ? '📢' : item.type === 'deploiement' ? '🚀' : '⚖️'}
                            </div>
                          </td>
                          <td style="padding-left: 12px;" valign="middle">
                            <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${item.titre}</div>
                            ${item.date ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${item.date}</div>` : ''}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="background: #1a237e; padding: 32px; text-align: center;">
              <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">ANSUT</div>
              <div style="font-size: 13px; color: rgba(255,255,255,0.8); margin-bottom: 16px;">Agence Nationale du Service Universel des Télécommunications</div>
              <a href="https://www.ansut.ci" style="color: #e65100; text-decoration: none; font-weight: 600; font-size: 14px;">www.ansut.ci</a>
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.15); font-size: 11px; color: rgba(255,255,255,0.5);">
                INNOV'ACTU Newsletter · ${formatMonthYear(startDate)} · ${tonLabel}
              </div>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
