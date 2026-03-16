// Using native Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendViaGateway(to: string, subject: string, htmlContent: string) {
  const baseUrl = Deno.env.get('AZURE_SMS_URL')!;
  const username = Deno.env.get('AZURE_SMS_USERNAME')!;
  const password = Deno.env.get('AZURE_SMS_PASSWORD')!;
  const unifiedUrl = baseUrl.replace(/\/api\/SendSMS\/?$/i, '') + '/api/message/send';

  const response = await fetch(unifiedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, content: htmlContent, ishtml: true, username, password, channel: 'Email' }),
  });
  return response;
}

const MATINALE_PROMPT = `Tu es le rédacteur en chef de la communication de l'ANSUT (Agence Nationale du Service Universel des Télécommunications de Côte d'Ivoire).

Génère un briefing matinal "Spécial Communication" structuré en 3 sections EXACTES au format JSON :

1. "flash_info" : Un tableau de 3 objets, chaque objet contient :
   - "titre" : Titre court (max 15 mots)
   - "resume" : Résumé percutant en 20 mots maximum
   - "source" : Nom de la source

2. "veille_reputation" : Un objet contenant :
   - "resume" : 2-3 phrases sur l'image de l'ANSUT/Service Universel aujourd'hui
   - "tonalite" : "positif", "neutre" ou "negatif"
   - "mentions_cles" : Tableau de strings des mentions importantes
   - "preuves" : Un tableau de 2-4 objets, chaque preuve contient :
     * "titre" : Titre de l'article source
     * "source" : Nom du média
     * "url" : URL de l'article (OBLIGATOIRE, prends-la depuis le contexte)
     * "extrait" : Citation exacte ou phrase clé de l'article qui justifie la tonalité (20 mots max)
     * "sentiment_article" : "positif", "neutre" ou "negatif"

3. "pret_a_poster" : Un objet contenant :
   - "linkedin" : Un post LinkedIn professionnel de 3-4 phrases valorisant l'action de l'ANSUT à partir de l'actu du jour (avec emojis professionnels)
   - "x_post" : Un tweet percutant de max 280 caractères avec 2-3 hashtags pertinents (#ANSUT #NumériqueCIV etc.)
   - "angle" : L'angle de communication suggéré en 1 phrase

Règles :
- Écris en français professionnel
- Le contenu doit être directement utilisable sans modification
- Le post LinkedIn doit valoriser l'ANSUT et le numérique en Côte d'Ivoire
- Si aucune mention directe de l'ANSUT n'est trouvée, suggère un angle de rebond`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check (optional for cron, required for manual trigger)
    const authHeader = req.headers.get('Authorization');
    let isAuthenticated = false;

    if (authHeader?.startsWith('Bearer ')) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (!claimsError && claimsData?.claims) {
        isAuthenticated = true;
      }
    }

    // Parse request body
    let sendEmail = true;
    let previewOnly = false;
    let recipients: string[] = [];

    try {
      const body = await req.json();
      previewOnly = body.previewOnly === true;
      if (body.recipients && Array.isArray(body.recipients)) {
        recipients = body.recipients;
      }
    } catch {
      // No body = cron trigger, send to all configured recipients
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch last 24h articles
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: articles } = await supabase
      .from('actualites')
      .select('titre, resume, source_nom, source_url, importance, sentiment, impact_ansut, categorie')
      .gte('created_at', yesterday)
      .order('importance', { ascending: false })
      .limit(20);

    // Fetch critical alerts
    const { data: alertes } = await supabase
      .from('alertes')
      .select('titre, niveau, message')
      .gte('created_at', yesterday)
      .in('niveau', ['critical', 'warning'])
      .limit(5);

    const articlesList = (articles || []).map(a =>
      `- ${a.titre} (source: ${a.source_nom || 'inconnue'}, importance: ${a.importance}/100, sentiment: ${a.sentiment ?? 'N/A'}${a.impact_ansut ? ', IMPACT ANSUT: ' + a.impact_ansut : ''})`
    ).join('\n');

    const alertesList = (alertes || []).length > 0
      ? `\n\nAlertes actives:\n${alertes!.map(a => `⚠️ ${a.titre}: ${a.message || ''}`).join('\n')}`
      : '';

    const context = `Actualités des dernières 24h (${(articles || []).length} articles):\n${articlesList}${alertesList}`;

    console.log('[Matinale] Generating with', (articles || []).length, 'articles');

    // Call AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: MATINALE_PROMPT },
          { role: 'user', content: context },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_matinale',
            description: 'Generate the structured morning briefing for the Com team',
            parameters: {
              type: 'object',
              properties: {
                flash_info: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      titre: { type: 'string' },
                      resume: { type: 'string' },
                      source: { type: 'string' },
                    },
                    required: ['titre', 'resume', 'source'],
                  },
                },
                veille_reputation: {
                  type: 'object',
                  properties: {
                    resume: { type: 'string' },
                    tonalite: { type: 'string', enum: ['positif', 'neutre', 'negatif'] },
                    mentions_cles: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['resume', 'tonalite', 'mentions_cles'],
                },
                pret_a_poster: {
                  type: 'object',
                  properties: {
                    linkedin: { type: 'string' },
                    x_post: { type: 'string', description: 'Tweet max 280 characters with hashtags' },
                    angle: { type: 'string' },
                  },
                  required: ['linkedin', 'x_post', 'angle'],
                },
              },
              required: ['flash_info', 'veille_reputation', 'pret_a_poster'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_matinale' } },
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error('[Matinale] AI error:', status, errText);
      if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('[Matinale] No tool call in response:', JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: 'AI did not return structured data' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const matinale = JSON.parse(toolCall.function.arguments);
    console.log('[Matinale] Generated successfully');

    // Generate HTML email
    const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const tonaliteColor = matinale.veille_reputation.tonalite === 'positif' ? '#10b981'
      : matinale.veille_reputation.tonalite === 'negatif' ? '#ef4444' : '#f59e0b';
    const tonaliteLabel = matinale.veille_reputation.tonalite === 'positif' ? '✅ Positif'
      : matinale.veille_reputation.tonalite === 'negatif' ? '🔴 Négatif' : '🟡 Neutre';

    const htmlEmail = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;text-align:center;">
  <h1 style="color:#ffffff;margin:0;font-size:24px;">📰 La Matinale ANSUT</h1>
  <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">${dateStr}</p>
</td></tr>
<tr><td style="padding:24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid #2563eb;padding-bottom:8px;">⚡ Flash Info</h2>
  ${matinale.flash_info.map((item: any) => `
  <div style="margin-bottom:16px;padding:12px;background-color:#f0f9ff;border-radius:8px;border-left:4px solid #2563eb;">
    <p style="margin:0 0 4px;font-weight:bold;color:#1e3a5f;font-size:14px;">${item.titre}</p>
    <p style="margin:0 0 4px;color:#374151;font-size:13px;">${item.resume}</p>
    <p style="margin:0;color:#6b7280;font-size:11px;">Source : ${item.source}</p>
  </div>`).join('')}
</td></tr>
<tr><td style="padding:0 24px 24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid ${tonaliteColor};padding-bottom:8px;">🎯 Veille Réputation ${tonaliteLabel}</h2>
  <div style="padding:16px;background-color:#fefce8;border-radius:8px;">
    <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">${matinale.veille_reputation.resume}</p>
    ${matinale.veille_reputation.mentions_cles.length > 0 ? `
    <p style="margin:0;font-size:12px;color:#6b7280;">Mentions clés : ${matinale.veille_reputation.mentions_cles.map((m: string) => `<span style="display:inline-block;background:#e5e7eb;padding:2px 8px;border-radius:12px;margin:2px;font-size:11px;">${m}</span>`).join(' ')}</p>` : ''}
  </div>
</td></tr>
<tr><td style="padding:0 24px 24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid #8b5cf6;padding-bottom:8px;">📝 Prêt-à-Poster LinkedIn</h2>
  <div style="padding:16px;background-color:#f5f3ff;border-radius:8px;border:1px dashed #8b5cf6;">
    <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;white-space:pre-line;">${matinale.pret_a_poster.linkedin}</p>
    <p style="margin:0;font-size:12px;color:#7c3aed;font-style:italic;">💡 Angle : ${matinale.pret_a_poster.angle}</p>
  </div>
</td></tr>
<tr><td style="padding:0 24px 24px;">
  <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;border-bottom:2px solid #1d9bf0;padding-bottom:8px;">🐦 Prêt-à-Poster X (Twitter)</h2>
  <div style="padding:16px;background-color:#f0f9ff;border-radius:8px;border:1px dashed #1d9bf0;">
    <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">${matinale.pret_a_poster.x_post || ''}</p>
    <p style="margin:0;font-size:11px;color:#6b7280;">${(matinale.pret_a_poster.x_post || '').length}/280 caractères</p>
  </div>
</td></tr>
<tr><td style="background-color:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="margin:0;color:#9ca3af;font-size:11px;">ANSUT RADAR — Veille Stratégique & Communication</p>
  <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">Généré automatiquement par IA à partir de ${(articles || []).length} articles</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    if (previewOnly) {
      return new Response(JSON.stringify({
        matinale, html: htmlEmail, articles_count: (articles || []).length, generated_at: new Date().toISOString(),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get recipients
    if (recipients.length === 0) {
      const { data: destData } = await supabase
        .from('newsletter_destinataires')
        .select('email')
        .eq('actif', true);
      recipients = (destData || []).map(d => d.email);
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({
        matinale, html: htmlEmail, warning: 'Aucun destinataire configuré', articles_count: (articles || []).length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[Matinale] Sending to ${recipients.length} recipients`);

    const subject = `📰 La Matinale ANSUT — ${dateStr}`;
    let successCount = 0;
    let failCount = 0;

    for (const email of recipients) {
      try {
        const res = await sendViaGateway(email, subject, htmlEmail);
        if (res.ok) {
          await res.text();
          successCount++;
        } else {
          failCount++;
          console.error(`[Matinale] Failed for ${email}:`, await res.text());
        }
      } catch (e) {
        failCount++;
        console.error(`[Matinale] Error for ${email}:`, e);
      }
    }

    // Log the diffusion
    await supabase.from('diffusion_logs').insert({
      canal: 'email', contenu_type: 'matinale', destinataires_count: recipients.length, succes_count: successCount, echec_count: failCount, message: subject,
    });

    console.log(`[Matinale] Sent: ${successCount}, Failed: ${failCount}`);

    return new Response(JSON.stringify({
      matinale, sent: successCount, failed: failCount, articles_count: (articles || []).length, generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[Matinale] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
