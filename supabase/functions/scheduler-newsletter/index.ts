import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface Newsletter {
  id: string;
  numero: number;
  periode: string;
  statut: string;
  date_envoi_programme: string | null;
  rappel_envoye: boolean;
  programmation_active: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('📅 Scheduler newsletter démarré');

    // 1. Récupérer la configuration de programmation
    const { data: config, error: configError } = await supabase
      .from('newsletter_programmation')
      .select('*')
      .limit(1)
      .single();

    if (configError || !config) {
      console.log('⚠️ Pas de configuration de programmation trouvée');
      return new Response(JSON.stringify({ message: 'Pas de configuration' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const programmation = config as NewsletterProgrammation;

    if (!programmation.actif || programmation.frequence === 'desactive') {
      console.log('⏸️ Programmation désactivée');
      return new Response(JSON.stringify({ message: 'Programmation désactivée' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const todayDay = now.getDate();
    const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=lundi, 7=dimanche

    const actions: string[] = [];

    // 2. Vérifier si c'est le jour de génération
    let shouldGenerate = false;
    
    if (programmation.frequence === 'mensuel') {
      // Générer le 1er du mois (ou jour configuré)
      shouldGenerate = todayDay === programmation.jour_envoi;
    } else if (programmation.frequence === 'hebdo') {
      // Générer le jour configuré (1=lundi)
      shouldGenerate = todayDayOfWeek === programmation.jour_envoi;
    }

    // Vérifier si on n'a pas déjà généré aujourd'hui
    if (shouldGenerate && programmation.derniere_generation) {
      const lastGen = new Date(programmation.derniere_generation);
      const isSameDay = lastGen.toDateString() === now.toDateString();
      if (isSameDay) {
        console.log('📋 Newsletter déjà générée aujourd\'hui');
        shouldGenerate = false;
      }
    }

    if (shouldGenerate) {
      console.log('🚀 Génération automatique de newsletter...');
      
      // Calculer les dates de période
      const dateDebut = new Date(now);
      const dateFin = new Date(now);
      
      if (programmation.frequence === 'mensuel') {
        dateDebut.setMonth(dateDebut.getMonth() - 1);
        dateDebut.setDate(1);
        dateFin.setDate(0); // Dernier jour du mois précédent
      } else {
        dateDebut.setDate(dateDebut.getDate() - 7);
      }

      // Appeler generer-newsletter
      const genResponse = await supabase.functions.invoke('generer-newsletter', {
        body: {
          periode: programmation.frequence,
          ton: programmation.ton_defaut,
          cible: programmation.cible_defaut,
          date_debut: dateDebut.toISOString().split('T')[0],
          date_fin: dateFin.toISOString().split('T')[0],
        },
      });

      if (genResponse.error) {
        console.error('❌ Erreur génération:', genResponse.error);
        throw new Error(`Erreur génération: ${genResponse.error.message}`);
      }

      const newsletter = genResponse.data?.newsletter;
      
      if (newsletter) {
        // Calculer la date d'envoi programmée (3 jours après génération à l'heure configurée)
        const dateEnvoiProgramme = new Date(now);
        dateEnvoiProgramme.setDate(dateEnvoiProgramme.getDate() + 3);
        const [hours, minutes] = programmation.heure_envoi.split(':').map(Number);
        dateEnvoiProgramme.setHours(hours, minutes, 0, 0);

        // Mettre à jour la newsletter avec les infos de programmation
        await supabase
          .from('newsletters')
          .update({
            programmation_active: true,
            date_envoi_programme: dateEnvoiProgramme.toISOString(),
            rappel_envoye: false,
          })
          .eq('id', newsletter.id);

        // Mettre à jour la configuration
        await supabase
          .from('newsletter_programmation')
          .update({
            derniere_generation: now.toISOString(),
            prochain_envoi: dateEnvoiProgramme.toISOString(),
          })
          .eq('id', programmation.id);

        actions.push(`Newsletter #${newsletter.numero} générée`);

        // Envoyer email de notification aux admins
        if (programmation.emails_rappel?.length > 0 && resendApiKey) {
          await sendNotificationEmail(
            resendApiKey,
            programmation.emails_rappel,
            'generation',
            newsletter,
            dateEnvoiProgramme
          );
          actions.push('Email de génération envoyé');
        }
      }
    }

    // 3. Vérifier les newsletters nécessitant un rappel 48h
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

        if (programmation.emails_rappel?.length > 0 && resendApiKey) {
          await sendNotificationEmail(
            resendApiKey,
            programmation.emails_rappel,
            'rappel',
            newsletter,
            new Date(newsletter.date_envoi_programme)
          );
        }

        // Marquer le rappel comme envoyé
        await supabase
          .from('newsletters')
          .update({
            rappel_envoye: true,
            date_rappel: now.toISOString(),
          })
          .eq('id', newsletter.id);

        actions.push(`Rappel envoyé pour newsletter #${newsletter.numero}`);
      }
    }

    // 4. Envoyer les newsletters validées dont la date d'envoi est passée
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
          console.error(`❌ Erreur envoi newsletter #${newsletter.numero}:`, sendResponse.error);
          actions.push(`Erreur envoi newsletter #${newsletter.numero}`);
        } else {
          actions.push(`Newsletter #${newsletter.numero} envoyée`);
        }
      }
    }

    console.log('✅ Scheduler terminé. Actions:', actions);

    return new Response(JSON.stringify({
      success: true,
      timestamp: now.toISOString(),
      actions,
      config: {
        frequence: programmation.frequence,
        actif: programmation.actif,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erreur scheduler:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erreur interne' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

async function sendNotificationEmail(
  apiKey: string,
  emails: string[],
  type: 'generation' | 'rappel',
  newsletter: any,
  dateEnvoi: Date
): Promise<void> {
  const Resend = (await import("https://esm.sh/resend@2.0.0")).Resend;
  const resend = new Resend(apiKey);

  const appUrl = Deno.env.get('APP_URL') || 'https://lovable.dev';
  const newsletterUrl = `${appUrl}/admin/newsletters`;

  const formattedDate = dateEnvoi.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const hoursRemaining = Math.round((dateEnvoi.getTime() - Date.now()) / (1000 * 60 * 60));

  let subject: string;
  let html: string;

  if (type === 'generation') {
    subject = `📰 Nouvelle newsletter ANSUT RADAR #${newsletter.numero} générée - Action requise`;
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
          .info-box { background: white; border-left: 4px solid #1e3a5f; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📰 Newsletter générée</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">ANSUT RADAR #${newsletter.numero}</p>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Une nouvelle newsletter ANSUT RADAR a été <strong>générée automatiquement</strong> et attend votre validation.</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>📅 Période :</strong> ${newsletter.periode === 'hebdo' ? 'Hebdomadaire' : 'Mensuelle'}</p>
              <p style="margin: 10px 0 0;"><strong>📤 Envoi programmé :</strong> ${formattedDate}</p>
              <p style="margin: 10px 0 0;"><strong>⏰ Temps restant :</strong> ${hoursRemaining} heures</p>
            </div>
            
            <p>👉 <strong>La newsletter ne sera pas envoyée sans votre validation.</strong></p>
            
            <a href="${newsletterUrl}" class="button">Prévisualiser et valider →</a>
            
            <div class="footer">
              <p>ANSUT RADAR - Système de veille stratégique</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  } else {
    subject = `⚠️ RAPPEL - Newsletter ANSUT RADAR #${newsletter.numero} en attente (envoi dans ${hoursRemaining}h)`;
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
          .warning-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .info-box { background: white; border-left: 4px solid #1e3a5f; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">⚠️ RAPPEL URGENT</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Newsletter en attente de validation</p>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            
            <div class="warning-box">
              <p style="margin: 0;"><strong>⏰ Temps restant avant envoi : ${hoursRemaining} heures</strong></p>
            </div>
            
            <p>La newsletter ANSUT RADAR <strong>#${newsletter.numero}</strong> est toujours en attente de votre validation.</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>📤 Envoi programmé :</strong> ${formattedDate}</p>
            </div>
            
            <p>⚠️ <strong>Sans validation, la newsletter NE SERA PAS envoyée.</strong></p>
            
            <a href="${newsletterUrl}" class="button">Valider maintenant →</a>
            
            <div class="footer">
              <p>ANSUT RADAR - Système de veille stratégique</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  try {
    await resend.emails.send({
      from: 'ANSUT RADAR <no-reply@notifications.ansut.ci>',
      to: emails,
      subject,
      html,
    });
    console.log(`✉️ Email ${type} envoyé à:`, emails);
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
  }
}

serve(handler);
