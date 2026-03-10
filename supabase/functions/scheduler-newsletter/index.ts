// Using native Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendViaGateway(to: string | string[], subject: string, htmlContent: string) {
  const baseUrl = Deno.env.get('AZURE_SMS_URL')!;
  const username = Deno.env.get('AZURE_SMS_USERNAME')!;
  const password = Deno.env.get('AZURE_SMS_PASSWORD')!;
  const unifiedUrl = baseUrl.replace(/\/api\/SendSMS\/?$/i, '') + '/api/message/send';

  const toField = Array.isArray(to) ? to.join(',') : to;
  const response = await fetch(unifiedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: toField, subject, content: htmlContent, ishtml: true, username, password, channel: 'Email' }),
  });
  return response;
}

interface NewsletterProgrammation {
  id: string;
  frequence: 'hebdo' | 'mensuel' | 'desactive';
  jour_envoi: number;
  heure_envoi: string;
  ton_defaut: string;
  cible_defaut: string;
  delai_rappel_heures: number;
  emails_rappel: string[];
  actif: boolean;
  derniere_generation: string | null;
  prochain_envoi: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('📅 Scheduler newsletter démarré');

    const { data: config, error: configError } = await supabase
      .from('newsletter_programmation')
      .select('*')
      .limit(1)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ message: 'Pas de configuration' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const programmation = config as NewsletterProgrammation;

    if (!programmation.actif || programmation.frequence === 'desactive') {
      return new Response(JSON.stringify({ message: 'Programmation désactivée' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const todayDay = now.getDate();
    const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    const actions: string[] = [];

    let shouldGenerate = false;
    if (programmation.frequence === 'mensuel') {
      shouldGenerate = todayDay === programmation.jour_envoi;
    } else if (programmation.frequence === 'hebdo') {
      shouldGenerate = todayDayOfWeek === programmation.jour_envoi;
    }

    if (shouldGenerate && programmation.derniere_generation) {
      const lastGen = new Date(programmation.derniere_generation);
      if (lastGen.toDateString() === now.toDateString()) shouldGenerate = false;
    }

    if (shouldGenerate) {
      console.log('🚀 Génération automatique de newsletter...');
      const dateDebut = new Date(now);
      const dateFin = new Date(now);

      if (programmation.frequence === 'mensuel') {
        dateDebut.setMonth(dateDebut.getMonth() - 1);
        dateDebut.setDate(1);
        dateFin.setDate(0);
      } else {
        dateDebut.setDate(dateDebut.getDate() - 7);
      }

      const genResponse = await supabase.functions.invoke('generer-newsletter', {
        body: {
          periode: programmation.frequence,
          ton: programmation.ton_defaut,
          cible: programmation.cible_defaut,
          date_debut: dateDebut.toISOString().split('T')[0],
          date_fin: dateFin.toISOString().split('T')[0],
        },
      });

      if (genResponse.error) throw new Error(`Erreur génération: ${genResponse.error.message}`);

      const newsletter = genResponse.data?.newsletter;

      if (newsletter) {
        const dateEnvoiProgramme = new Date(now);
        dateEnvoiProgramme.setDate(dateEnvoiProgramme.getDate() + 3);
        const [hours, minutes] = programmation.heure_envoi.split(':').map(Number);
        dateEnvoiProgramme.setHours(hours, minutes, 0, 0);

        await supabase.from('newsletters').update({
          programmation_active: true,
          date_envoi_programme: dateEnvoiProgramme.toISOString(),
          rappel_envoye: false,
        }).eq('id', newsletter.id);

        await supabase.from('newsletter_programmation').update({
          derniere_generation: now.toISOString(),
          prochain_envoi: dateEnvoiProgramme.toISOString(),
        }).eq('id', programmation.id);

        actions.push(`Newsletter #${newsletter.numero} générée`);

        if (programmation.emails_rappel?.length > 0) {
          await sendNotificationEmail(programmation.emails_rappel, 'generation', newsletter, dateEnvoiProgramme);
          actions.push('Email de génération envoyé');
        }
      }
    }

    // Check reminders
    const delaiMs = programmation.delai_rappel_heures * 60 * 60 * 1000;
    const rappelThreshold = new Date(now.getTime() + delaiMs);

    const { data: newslettersNeedingReminder } = await supabase
      .from('newsletters')
      .select('*')
      .eq('programmation_active', true)
      .eq('rappel_envoye', false)
      .eq('statut', 'brouillon')
      .not('date_envoi_programme', 'is', null)
      .lte('date_envoi_programme', rappelThreshold.toISOString());

    if (newslettersNeedingReminder?.length) {
      for (const newsletter of newslettersNeedingReminder) {
        console.log(`⏰ Envoi rappel pour newsletter #${newsletter.numero}`);
        if (programmation.emails_rappel?.length > 0) {
          await sendNotificationEmail(programmation.emails_rappel, 'rappel', newsletter, new Date(newsletter.date_envoi_programme));
        }
        await supabase.from('newsletters').update({ rappel_envoye: true, date_rappel: now.toISOString() }).eq('id', newsletter.id);
        actions.push(`Rappel envoyé pour newsletter #${newsletter.numero}`);
      }
    }

    // Send validated newsletters
    const { data: newslettersToSend } = await supabase
      .from('newsletters')
      .select('*')
      .eq('programmation_active', true)
      .eq('statut', 'valide')
      .not('date_envoi_programme', 'is', null)
      .lte('date_envoi_programme', now.toISOString());

    if (newslettersToSend?.length) {
      for (const newsletter of newslettersToSend) {
        console.log(`📤 Envoi automatique newsletter #${newsletter.numero}`);
        const sendResponse = await supabase.functions.invoke('envoyer-newsletter', {
          body: { newsletter_id: newsletter.id },
        });
        if (sendResponse.error) {
          actions.push(`Erreur envoi newsletter #${newsletter.numero}`);
        } else {
          actions.push(`Newsletter #${newsletter.numero} envoyée`);
        }
      }
    }

    console.log('✅ Scheduler terminé. Actions:', actions);

    return new Response(JSON.stringify({
      success: true, timestamp: now.toISOString(), actions,
      config: { frequence: programmation.frequence, actif: programmation.actif },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('❌ Erreur scheduler:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erreur interne' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

async function sendNotificationEmail(
  emails: string[],
  type: 'generation' | 'rappel',
  newsletter: any,
  dateEnvoi: Date
): Promise<void> {
  const newsletterUrl = 'https://ansut-lens.lovable.app/admin/newsletters';

  const formattedDate = dateEnvoi.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const hoursRemaining = Math.round((dateEnvoi.getTime() - Date.now()) / (1000 * 60 * 60));

  let subject: string;
  let html: string;

  if (type === 'generation') {
    subject = `📰 Nouvelle newsletter ANSUT RADAR #${newsletter.numero} générée - Action requise`;
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0;">📰 Newsletter générée</h1>
      <p style="margin: 10px 0 0; opacity: 0.9;">ANSUT RADAR #${newsletter.numero}</p>
    </div>
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
      <p>Bonjour,</p>
      <p>Une nouvelle newsletter a été <strong>générée automatiquement</strong> et attend votre validation.</p>
      <div style="background: white; border-left: 4px solid #1e3a5f; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>📅 Période :</strong> ${newsletter.periode === 'hebdo' ? 'Hebdomadaire' : 'Mensuelle'}</p>
        <p style="margin: 10px 0 0;"><strong>📤 Envoi programmé :</strong> ${formattedDate}</p>
        <p style="margin: 10px 0 0;"><strong>⏰ Temps restant :</strong> ${hoursRemaining} heures</p>
      </div>
      <p>👉 <strong>La newsletter ne sera pas envoyée sans votre validation.</strong></p>
      <a href="${newsletterUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Prévisualiser et valider →</a>
      <p style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">ANSUT RADAR - Système de veille stratégique</p>
    </div>
  </div>
</body></html>`;
  } else {
    subject = `⚠️ RAPPEL - Newsletter ANSUT RADAR #${newsletter.numero} en attente (envoi dans ${hoursRemaining}h)`;
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0;">⚠️ RAPPEL URGENT</h1>
      <p style="margin: 10px 0 0; opacity: 0.9;">Newsletter en attente de validation</p>
    </div>
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
      <p>Bonjour,</p>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>⏰ Temps restant avant envoi : ${hoursRemaining} heures</strong></p>
      </div>
      <p>La newsletter ANSUT RADAR <strong>#${newsletter.numero}</strong> est toujours en attente de votre validation.</p>
      <div style="background: white; border-left: 4px solid #1e3a5f; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>📤 Envoi programmé :</strong> ${formattedDate}</p>
      </div>
      <p>⚠️ <strong>Sans validation, la newsletter NE SERA PAS envoyée.</strong></p>
      <a href="${newsletterUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Valider maintenant →</a>
      <p style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">ANSUT RADAR - Système de veille stratégique</p>
    </div>
  </div>
</body></html>`;
  }

  try {
    for (const email of emails) {
      const res = await sendViaGateway(email, subject, html);
      if (res.ok) {
        await res.text();
        console.log(`✉️ Email ${type} envoyé à: ${email}`);
      } else {
        console.error(`❌ Erreur envoi email ${type} à ${email}:`, await res.text());
      }
    }
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
  }
}

Deno.serve(handler);
