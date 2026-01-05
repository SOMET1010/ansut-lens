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
  edito: { texte: string; genere_par_ia: boolean };
  essentiel_ansut: Array<{ titre: string; pourquoi: string; impact: string }>;
  tendance_tech: { titre: string; contenu: string; lien_ansut: string };
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
  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const formatShortDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  
  const edito = content.edito || { texte: '' };
  const essentielAnsut = content.essentiel_ansut || [];
  const tendanceTech = content.tendance_tech || { titre: '', contenu: '', lien_ansut: '' };
  const decryptage = content.decryptage || { titre: '', contenu: '' };
  const chiffreMarquant = content.chiffre_marquant || { valeur: '', unite: '', contexte: '' };
  const aVenir = content.a_venir || [];

  const tonLabel = ton === 'pedagogique' ? 'Pédagogique' : ton === 'institutionnel' ? 'Institutionnel' : 'Stratégique';
  const cibleLabel = cible === 'dg_ca' ? 'Direction' : cible === 'partenaires' ? 'Partenaires' : 'Grand Public';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ANSUT RADAR #${numero} - ${formatDate(startDate)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; 
      line-height: 1.6; 
      color: #1a1a2e; 
      background: #f8fafc; 
    }
    .container { 
      max-width: 680px; 
      margin: 0 auto; 
      background: #ffffff; 
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    
    /* Header moderne */
    .header { 
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); 
      color: white; 
      padding: 40px 32px; 
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .header-content { position: relative; z-index: 1; }
    .logo-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
    }
    .header h1 { 
      font-size: 28px; 
      font-weight: 800; 
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .header .subtitle { 
      font-size: 14px; 
      opacity: 0.85; 
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .header-meta {
      margin-top: 20px;
      display: flex;
      justify-content: center;
      gap: 24px;
      font-size: 13px;
      opacity: 0.9;
    }
    .header-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-badge {
      background: rgba(255,255,255,0.15);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    /* Sections */
    .section { 
      padding: 32px; 
      border-bottom: 1px solid #e2e8f0; 
    }
    .section:last-child { border-bottom: none; }
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .section-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .section-title { 
      font-size: 13px; 
      font-weight: 700; 
      text-transform: uppercase; 
      letter-spacing: 1.5px;
      color: #64748b;
    }

    /* Édito */
    .edito-section .section-icon { background: #fef3c7; }
    .edito-content {
      font-size: 17px;
      color: #475569;
      font-style: italic;
      line-height: 1.8;
      padding-left: 20px;
      border-left: 3px solid #f97316;
    }
    .edito-signature {
      margin-top: 16px;
      text-align: right;
      font-size: 13px;
      color: #94a3b8;
      font-weight: 500;
    }

    /* Essentiel */
    .essentiel-section .section-icon { background: #fee2e2; color: #dc2626; }
    .essentiel-grid { display: flex; flex-direction: column; gap: 16px; }
    .essentiel-card {
      background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid #f97316;
      transition: transform 0.2s;
    }
    .essentiel-card h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .essentiel-card h3::before {
      content: '✓';
      background: #22c55e;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .essentiel-pourquoi {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 8px;
      padding-left: 28px;
    }
    .essentiel-impact {
      font-size: 14px;
      color: #059669;
      font-weight: 600;
      padding-left: 28px;
    }

    /* Tech & Decryptage - Grid */
    .dual-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    @media (max-width: 600px) {
      .dual-section { grid-template-columns: 1fr; }
    }
    .tech-card, .decrypt-card {
      padding: 28px;
    }
    .tech-card {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-bottom: 1px solid #bfdbfe;
    }
    .tech-card .section-icon { background: #3b82f6; color: white; }
    .tech-card h3 {
      font-size: 15px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 12px;
    }
    .tech-card p { font-size: 14px; color: #334155; margin-bottom: 12px; }
    .tech-ansut {
      background: white;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      color: #1e40af;
      margin-top: 12px;
    }
    .tech-ansut strong { color: #f97316; }

    .decrypt-card {
      background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
      border-bottom: 1px solid #fde047;
    }
    .decrypt-card .section-icon { background: #eab308; color: white; }
    .decrypt-card h3 {
      font-size: 15px;
      font-weight: 700;
      color: #854d0e;
      margin-bottom: 12px;
    }
    .decrypt-card p { font-size: 14px; color: #422006; }

    /* Chiffre marquant */
    .chiffre-section {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      text-align: center;
      padding: 48px 32px;
      position: relative;
    }
    .chiffre-section::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at 30% 50%, rgba(249, 115, 22, 0.15) 0%, transparent 50%);
    }
    .chiffre-content { position: relative; z-index: 1; }
    .chiffre-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 3px;
      opacity: 0.7;
      margin-bottom: 16px;
    }
    .chiffre-valeur {
      font-size: 72px;
      font-weight: 800;
      background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      margin-bottom: 8px;
    }
    .chiffre-unite {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .chiffre-contexte {
      font-size: 14px;
      opacity: 0.8;
      max-width: 400px;
      margin: 0 auto;
    }

    /* À venir */
    .avenir-section .section-icon { background: #f3e8ff; color: #9333ea; }
    .avenir-list { display: flex; flex-direction: column; gap: 12px; }
    .avenir-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #fafafa;
      border-radius: 10px;
      transition: background 0.2s;
    }
    .avenir-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .avenir-icon.evenement { background: #dbeafe; }
    .avenir-icon.appel_projets { background: #dcfce7; }
    .avenir-icon.deploiement { background: #fef3c7; }
    .avenir-icon.decision { background: #f3e8ff; }
    .avenir-content { flex: 1; }
    .avenir-titre { font-weight: 600; color: #1e293b; font-size: 14px; }
    .avenir-date { font-size: 12px; color: #64748b; margin-top: 2px; }

    /* Footer */
    .footer {
      background: #0f172a;
      color: white;
      padding: 32px;
      text-align: center;
    }
    .footer-logo {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .footer-org {
      font-size: 13px;
      opacity: 0.8;
      margin-bottom: 16px;
    }
    .footer-link {
      color: #f97316;
      text-decoration: none;
      font-weight: 500;
    }
    .footer-credits {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: 11px;
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo-row">
          <div class="logo-icon">📡</div>
        </div>
        <h1>ANSUT RADAR</h1>
        <div class="subtitle">Veille Stratégique Numérique</div>
        <div class="header-meta">
          <div class="header-meta-item">
            <span>📅</span>
            <span>${formatDate(startDate)}</span>
          </div>
          <div class="header-meta-item">
            <span class="header-badge">N°${numero}</span>
          </div>
          <div class="header-meta-item">
            <span class="header-badge">${tonLabel}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Édito -->
    <div class="section edito-section">
      <div class="section-header">
        <div class="section-icon">📝</div>
        <span class="section-title">Édito</span>
      </div>
      <div class="edito-content">${edito.texte}</div>
      <div class="edito-signature">— La Rédaction ANSUT RADAR</div>
    </div>

    <!-- L'essentiel ANSUT -->
    <div class="section essentiel-section">
      <div class="section-header">
        <div class="section-icon">🎯</div>
        <span class="section-title">L'essentiel ANSUT</span>
      </div>
      <div class="essentiel-grid">
        ${essentielAnsut.map(item => `
          <div class="essentiel-card">
            <h3>${item.titre}</h3>
            <p class="essentiel-pourquoi"><strong>Pourquoi :</strong> ${item.pourquoi}</p>
            <p class="essentiel-impact">→ ${item.impact}</p>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Tech & Décryptage -->
    <div class="dual-section">
      <div class="tech-card">
        <div class="section-header">
          <div class="section-icon">🔬</div>
          <span class="section-title">Tendance Tech</span>
        </div>
        <h3>${tendanceTech.titre}</h3>
        <p>${tendanceTech.contenu}</p>
        <div class="tech-ansut"><strong>👉 Pour l'ANSUT :</strong> ${tendanceTech.lien_ansut}</div>
      </div>
      <div class="decrypt-card">
        <div class="section-header">
          <div class="section-icon">📚</div>
          <span class="section-title">En 2 Minutes</span>
        </div>
        <h3>${decryptage.titre}</h3>
        <p>${decryptage.contenu}</p>
      </div>
    </div>

    <!-- Le Chiffre -->
    <div class="chiffre-section">
      <div class="chiffre-content">
        <div class="chiffre-label">📊 Le Chiffre Marquant</div>
        <div class="chiffre-valeur">${chiffreMarquant.valeur}</div>
        <div class="chiffre-unite">${chiffreMarquant.unite}</div>
        <div class="chiffre-contexte">${chiffreMarquant.contexte}</div>
      </div>
    </div>

    <!-- À venir -->
    <div class="section avenir-section">
      <div class="section-header">
        <div class="section-icon">📅</div>
        <span class="section-title">À Venir</span>
      </div>
      <div class="avenir-list">
        ${aVenir.map(item => `
          <div class="avenir-item">
            <div class="avenir-icon ${item.type}">
              ${item.type === 'evenement' ? '📆' : item.type === 'appel_projets' ? '📢' : item.type === 'deploiement' ? '🚀' : '⚖️'}
            </div>
            <div class="avenir-content">
              <div class="avenir-titre">${item.titre}</div>
              ${item.date ? `<div class="avenir-date">${item.date}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-logo">ANSUT</div>
      <div class="footer-org">Agence Nationale du Service Universel des Télécommunications</div>
      <a href="https://www.ansut.ci" class="footer-link">www.ansut.ci</a>
      <div class="footer-credits">
        Newsletter générée par ANSUT RADAR · ${formatShortDate(startDate)} - ${formatShortDate(endDate)}
      </div>
    </div>
  </div>
</body>
</html>`;
}
