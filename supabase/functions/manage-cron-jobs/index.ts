import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Vérifier l'authentification et le rôle admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le rôle admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - Admin requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET - Liste des jobs et historique
    if (req.method === 'GET') {
      console.log('[manage-cron-jobs] Récupération des jobs et historique');
      
      const { data: jobs, error: jobsError } = await supabaseAdmin.rpc('get_cron_jobs');
      if (jobsError) {
        console.error('[manage-cron-jobs] Erreur get_cron_jobs:', jobsError);
        throw jobsError;
      }

      const { data: history, error: historyError } = await supabaseAdmin.rpc('get_cron_history', {
        limit_count: 100
      });
      if (historyError) {
        console.error('[manage-cron-jobs] Erreur get_cron_history:', historyError);
        throw historyError;
      }

      console.log(`[manage-cron-jobs] ${jobs?.length || 0} jobs, ${history?.length || 0} entrées historique`);
      
      return new Response(
        JSON.stringify({ jobs: jobs || [], history: history || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Actions sur les jobs
    if (req.method === 'POST') {
      const body = await req.json();
      const { action, jobId, schedule } = body;

      console.log(`[manage-cron-jobs] Action: ${action}, JobId: ${jobId}`);

      if (action === 'toggle') {
        const { error } = await supabaseAdmin.rpc('toggle_cron_job', { job_id: jobId });
        if (error) {
          console.error('[manage-cron-jobs] Erreur toggle_cron_job:', error);
          throw error;
        }
        console.log(`[manage-cron-jobs] Job ${jobId} toggled`);
        return new Response(
          JSON.stringify({ success: true, message: 'Job toggled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'update_schedule') {
        if (!schedule) {
          return new Response(
            JSON.stringify({ error: 'Schedule requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error } = await supabaseAdmin.rpc('update_cron_schedule', { 
          job_id: jobId, 
          new_schedule: schedule 
        });
        if (error) {
          console.error('[manage-cron-jobs] Erreur update_cron_schedule:', error);
          throw error;
        }
        console.log(`[manage-cron-jobs] Job ${jobId} schedule updated to: ${schedule}`);
        return new Response(
          JSON.stringify({ success: true, message: 'Schedule updated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'run_now') {
        // Récupérer le job pour obtenir la commande
        const { data: jobs } = await supabaseAdmin.rpc('get_cron_jobs');
        const job = jobs?.find((j: { jobid: number }) => j.jobid === jobId);
        
        if (!job) {
          return new Response(
            JSON.stringify({ error: 'Job non trouvé' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Extraire le nom de la fonction depuis la commande
        // Format typique: select net.http_post(...functions/v1/FUNCTION_NAME...)
        const functionMatch = job.command.match(/functions\/v1\/([a-z0-9-]+)/i);
        if (functionMatch) {
          const functionName = functionMatch[1];
          console.log(`[manage-cron-jobs] Exécution immédiate de: ${functionName}`);
          
          // Appeler la fonction Edge directement
          const { error: invokeError } = await supabaseAdmin.functions.invoke(functionName, {
            body: { triggered_by: 'manual', user_id: user.id }
          });
          
          if (invokeError) {
            console.error(`[manage-cron-jobs] Erreur invocation ${functionName}:`, invokeError);
            return new Response(
              JSON.stringify({ success: false, error: invokeError.message }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ success: true, message: `Fonction ${functionName} déclenchée` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Impossible d\'extraire la fonction du job' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Action non reconnue' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Méthode non supportée' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne';
    console.error('[manage-cron-jobs] Erreur:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
