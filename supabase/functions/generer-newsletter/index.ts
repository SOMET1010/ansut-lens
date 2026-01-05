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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request
    const { periode, ton, cible, date_debut, date_fin }: GenerateRequest = await req.json();

    // Calculate date range
    const endDate = date_fin ? new Date(date_fin) : new Date();
    const startDate = date_debut 
      ? new Date(date_debut) 
      : new Date(endDate.getTime() - (periode === 'hebdo' ? 7 : 30) * 24 * 60 * 60 * 1000);

    console.log(`Generating ${periode} newsletter from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get next newsletter number
    const { data: lastNewsletter } = await adminClient
      .from('newsletters')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumero = (lastNewsletter?.numero || 0) + 1;

    // Fetch actualités for the period
    const { data: actualites, error: actualitesError } = await adminClient
      .from('actualites')
      .select('id, titre, resume, categorie, importance, date_publication, source_nom')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('importance', { ascending: false })
      .limit(20);

    if (actualitesError) {
      console.error('Error fetching actualites:', actualitesError);
    }

    // Fetch recent dossiers
    const { data: dossiers } = await adminClient
      .from('dossiers')
      .select('titre, resume, categorie')
      .eq('statut', 'publie')
      .gte('updated_at', startDate.toISOString())
      .limit(5);

    // Classify actualités
    const actualitesAnsut = actualites?.filter(a => 
      a.categorie?.includes('ANSUT') || a.categorie?.includes('institutionnel')
    ) || [];
    
    const actualitesTech = actualites?.filter(a => 
      a.categorie?.includes('Technologies') || 
      a.categorie?.includes('IA') || 
      a.categorie?.includes('Cloud') ||
      a.categorie?.includes('Télécoms')
    ) || [];

    // Build context for AI
    const contexte = {
      periode,
      ton,
      cible,
      date_debut: startDate.toISOString().split('T')[0],
      date_fin: endDate.toISOString().split('T')[0],
      actualites_ansut: actualitesAnsut.slice(0, 5).map(a => ({
        titre: a.titre,
        resume: a.resume,
        importance: a.importance
      })),
      actualites_tech: actualitesTech.slice(0, 5).map(a => ({
        titre: a.titre,
        resume: a.resume
      })),
      dossiers_recents: dossiers?.map(d => ({
        titre: d.titre,
        resume: d.resume
      })) || []
    };

    // Define tone instructions
    const tonInstructions = {
      pedagogique: "Un ton accessible, moderne et vulgarisateur. Pas de jargon administratif. Des phrases courtes.",
      institutionnel: "Un ton formel et officiel, adapté aux communications institutionnelles.",
      strategique: "Un ton analytique orienté décision, avec des insights stratégiques."
    };

    // Generate content with Lovable AI
    const aiPrompt = `Tu es le rédacteur en chef de la newsletter ANSUT RADAR, la plateforme de veille stratégique de l'Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire.

Génère le contenu complet d'une newsletter ${periode === 'hebdo' ? 'hebdomadaire' : 'mensuelle'} pour la période du ${contexte.date_debut} au ${contexte.date_fin}.

**TON ATTENDU:** ${tonInstructions[ton]}

**CIBLE:** ${cible === 'dg_ca' ? 'Direction Générale et Conseil d\'Administration' : cible === 'partenaires' ? 'Partenaires institutionnels' : 'Grand public et collaborateurs'}

**ACTUALITÉS ANSUT DISPONIBLES:**
${JSON.stringify(contexte.actualites_ansut, null, 2)}

**ACTUALITÉS TECH DISPONIBLES:**
${JSON.stringify(contexte.actualites_tech, null, 2)}

**DOSSIERS RÉCENTS:**
${JSON.stringify(contexte.dossiers_recents, null, 2)}

Génère un JSON avec cette structure exacte :
{
  "edito": {
    "texte": "3-4 lignes maximum situant le mois dans le contexte numérique ivoirien",
    "genere_par_ia": true
  },
  "essentiel_ansut": [
    {
      "titre": "Titre orienté impact",
      "pourquoi": "Pourquoi c'est important (1-2 phrases)",
      "impact": "Ce que ça change concrètement (1-2 phrases)"
    }
  ],
  "tendance_tech": {
    "titre": "Pourquoi tout le monde parle de... / Ce que cette techno change pour...",
    "contenu": "Explication de la tendance (3-4 phrases)",
    "lien_ansut": "Comment ça concerne l'ANSUT et le Service Universel (2 phrases)"
  },
  "decryptage": {
    "titre": "En 2 minutes : c'est quoi vraiment [concept] ?",
    "contenu": "Explication simple avec des usages concrets (école, santé, PME)"
  },
  "chiffre_marquant": {
    "valeur": "nombre",
    "unite": "unité (localités, formations, projets...)",
    "contexte": "Contexte du chiffre (1 phrase)"
  },
  "a_venir": [
    {
      "type": "evenement|appel_projets|deploiement|decision",
      "titre": "Titre de l'événement à venir",
      "date": "Date prévue si connue"
    }
  ]
}

IMPORTANT:
- Maximum 3 éléments dans essentiel_ansut
- Maximum 3 éléments dans a_venir
- Toujours relier les tendances tech à la Côte d'Ivoire et au Service Universel
- Pas de jargon technique sans explication
- Chaque paragraphe = une seule idée`;

    console.log('Calling Lovable AI for content generation...');

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { 
            role: "system", 
            content: "Tu es un expert en communication institutionnelle et veille stratégique. Tu génères du contenu de newsletter structuré en JSON valide uniquement." 
          },
          { role: "user", content: aiPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = JSON.parse(aiData.choices[0].message.content);

    console.log('AI content generated successfully');

    // Generate HTML versions
    const htmlCourt = generateShortHtml(generatedContent, nextNumero, startDate, endDate);

    // Get current user
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();

    // Save newsletter
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
      console.error('Error saving newsletter:', insertError);
      throw insertError;
    }

    console.log(`Newsletter #${nextNumero} created successfully`);

    return new Response(
      JSON.stringify(newsletter),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Error generating newsletter:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateShortHtml(content: Record<string, unknown>, numero: number, startDate: Date, endDate: Date): string {
  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  
  const edito = content.edito as { texte: string } || { texte: '' };
  const essentielAnsut = content.essentiel_ansut as Array<{ titre: string; pourquoi: string; impact: string }> || [];
  const tendanceTech = content.tendance_tech as { titre: string; contenu: string; lien_ansut: string } || { titre: '', contenu: '', lien_ansut: '' };
  const decryptage = content.decryptage as { titre: string; contenu: string } || { titre: '', contenu: '' };
  const chiffreMarquant = content.chiffre_marquant as { valeur: string; unite: string; contexte: string } || { valeur: '', unite: '', contexte: '' };
  const aVenir = content.a_venir as Array<{ type: string; titre: string; date?: string }> || [];

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter ANSUT RADAR #${numero}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header .numero { opacity: 0.8; font-size: 14px; margin-top: 5px; }
    .section { padding: 25px 30px; border-bottom: 1px solid #eee; }
    .section-title { color: #e94560; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
    .edito { font-style: italic; color: #555; font-size: 16px; }
    .essentiel-item { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #e94560; }
    .essentiel-item h3 { margin: 0 0 10px 0; color: #1a1a2e; font-size: 16px; }
    .essentiel-item .pourquoi { color: #666; font-size: 14px; margin-bottom: 8px; }
    .essentiel-item .impact { color: #16a34a; font-size: 14px; font-weight: 500; }
    .tendance { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 8px; }
    .tendance h3 { color: #0369a1; margin: 0 0 15px 0; }
    .decryptage { background: #fef3c7; padding: 20px; border-radius: 8px; }
    .decryptage h3 { color: #b45309; margin: 0 0 15px 0; }
    .chiffre { text-align: center; padding: 30px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; }
    .chiffre .valeur { font-size: 48px; font-weight: 700; color: #e94560; }
    .chiffre .unite { font-size: 18px; margin-top: 5px; }
    .chiffre .contexte { font-size: 14px; opacity: 0.8; margin-top: 10px; }
    .avenir-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; }
    .avenir-item:last-child { border-bottom: none; }
    .avenir-icon { width: 30px; height: 30px; background: #e94560; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 12px; }
    .footer { background: #1a1a2e; color: white; padding: 30px; text-align: center; }
    .footer a { color: #e94560; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📰 NEWSLETTER ANSUT RADAR</h1>
      <div class="numero">${formatDate(startDate)} - Numéro ${numero}</div>
    </div>
    
    <div class="section">
      <div class="section-title">📝 Édito</div>
      <p class="edito">${edito.texte}</p>
    </div>
    
    <div class="section">
      <div class="section-title">🎯 L'essentiel ANSUT</div>
      ${essentielAnsut.map(item => `
        <div class="essentiel-item">
          <h3>✅ ${item.titre}</h3>
          <p class="pourquoi"><strong>Pourquoi c'est important :</strong> ${item.pourquoi}</p>
          <p class="impact"><strong>Impact :</strong> ${item.impact}</p>
        </div>
      `).join('')}
    </div>
    
    <div class="section">
      <div class="section-title">🔬 Tendance tech du mois</div>
      <div class="tendance">
        <h3>${tendanceTech.titre}</h3>
        <p>${tendanceTech.contenu}</p>
        <p><strong>👉 Pour l'ANSUT :</strong> ${tendanceTech.lien_ansut}</p>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">📚 En 2 minutes</div>
      <div class="decryptage">
        <h3>${decryptage.titre}</h3>
        <p>${decryptage.contenu}</p>
      </div>
    </div>
    
    <div class="chiffre">
      <div class="section-title" style="color: white;">📊 Le chiffre</div>
      <div class="valeur">${chiffreMarquant.valeur}</div>
      <div class="unite">${chiffreMarquant.unite}</div>
      <div class="contexte">${chiffreMarquant.contexte}</div>
    </div>
    
    <div class="section">
      <div class="section-title">📅 À venir</div>
      ${aVenir.map(item => `
        <div class="avenir-item">
          <div class="avenir-icon">${item.type === 'evenement' ? '📆' : item.type === 'appel_projets' ? '📢' : item.type === 'deploiement' ? '🚀' : '⚖️'}</div>
          <div>
            <strong>${item.titre}</strong>
            ${item.date ? `<br><small style="color: #666;">${item.date}</small>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="footer">
      <p><strong>ANSUT</strong> - Service Universel des Télécommunications</p>
      <p>Côte d'Ivoire | <a href="https://www.ansut.ci">www.ansut.ci</a></p>
      <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
        Cette newsletter est générée par la plateforme ANSUT RADAR
      </p>
    </div>
  </div>
</body>
</html>`;
}
