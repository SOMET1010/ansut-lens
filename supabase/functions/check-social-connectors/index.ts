import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Returns presence-only status of social connector secrets and basic
 * authorization checks. NEVER returns secret values.
 *
 * Admin-only — verified via has_role RPC.
 */
type SecretSpec = {
  name: string;
  label: string;
  required: boolean;
};

type ConnectorReport = {
  id: string;
  name: string;
  category: 'social' | 'messaging';
  scope: string;
  secrets: Array<{ name: string; label: string; present: boolean; required: boolean }>;
  status: 'ok' | 'partial' | 'missing';
  missing: string[];
  notes: string;
  docs: string;
};

const CONNECTORS: Array<{
  id: string;
  name: string;
  category: 'social' | 'messaging';
  scope: string;
  notes: string;
  docs: string;
  secrets: SecretSpec[];
}> = [
  {
    id: 'x',
    name: 'X (Twitter)',
    category: 'social',
    scope: 'API v2 — lecture/écriture timeline ANSUT',
    notes: "Endpoint api.x.com (pas api.twitter.com). Plan Basic minimum.",
    docs: 'https://developer.x.com/en/portal/dashboard',
    secrets: [
      { name: 'TWITTER_CONSUMER_KEY', label: 'API Key', required: true },
      { name: 'TWITTER_CONSUMER_SECRET', label: 'API Secret', required: true },
      { name: 'TWITTER_BEARER_TOKEN', label: 'Bearer Token', required: true },
      { name: 'TWITTER_ACCESS_TOKEN', label: 'Access Token', required: false },
      { name: 'TWITTER_ACCESS_TOKEN_SECRET', label: 'Access Token Secret', required: false },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social',
    scope: 'OAuth Page entreprise ANSUT',
    notes: 'Scopes minimum : r_organization_social, w_organization_social.',
    docs: 'https://www.linkedin.com/developers/apps',
    secrets: [
      { name: 'LINKEDIN_CLIENT_ID', label: 'Client ID', required: true },
      { name: 'LINKEDIN_CLIENT_SECRET', label: 'Client Secret', required: true },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook / Instagram',
    category: 'social',
    scope: 'Graph API + Firecrawl (scraping public)',
    notes:
      'Aujourd\'hui couvert par Firecrawl (scraping). Pour l\'API officielle, ajouter App Meta + Page Token longue durée.',
    docs: 'https://developers.facebook.com/apps',
    secrets: [
      { name: 'FACEBOOK_APP_ID', label: 'App ID', required: false },
      { name: 'FACEBOOK_APP_SECRET', label: 'App Secret', required: false },
      { name: 'FACEBOOK_PAGE_TOKEN', label: 'Page Access Token', required: false },
      { name: 'FIRECRAWL_API_KEY', label: 'Firecrawl (fallback)', required: true },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'messaging',
    scope: 'Bot API — diffusion canal officiel',
    notes:
      'Token obtenu via @BotFather. Diffusion via Unified Gateway ANSUT.',
    docs: 'https://core.telegram.org/bots/api',
    secrets: [
      { name: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', required: true },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'social',
    scope: 'Data API v3 — lecture chaîne ANSUT',
    notes: 'API Key suffit pour la lecture publique. OAuth pour gestion de chaîne.',
    docs: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    secrets: [
      { name: 'YOUTUBE_API_KEY', label: 'API Key', required: true },
      { name: 'YOUTUBE_CLIENT_ID', label: 'OAuth Client ID', required: false },
      { name: 'YOUTUBE_CLIENT_SECRET', label: 'OAuth Client Secret', required: false },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'social',
    scope: 'Display API — analytics chaîne',
    notes: "Soumission à review TikTok requise (~3-7 jours).",
    docs: 'https://developers.tiktok.com/apps',
    secrets: [
      { name: 'TIKTOK_CLIENT_KEY', label: 'Client Key', required: true },
      { name: 'TIKTOK_CLIENT_SECRET', label: 'Client Secret', required: true },
    ],
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller is admin (RPC has_role with service role for safety)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin, error: roleErr } = await adminClient.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build presence-only report. We never return values.
    const report: ConnectorReport[] = CONNECTORS.map((c) => {
      const secrets = c.secrets.map((s) => ({
        name: s.name,
        label: s.label,
        required: s.required,
        present: !!Deno.env.get(s.name),
      }));
      const missing = secrets.filter((s) => s.required && !s.present).map((s) => s.name);
      const allRequiredPresent = missing.length === 0;
      const anyOptionalPresent = secrets.some((s) => !s.required && s.present);
      const status: ConnectorReport['status'] = allRequiredPresent
        ? secrets.every((s) => s.present)
          ? 'ok'
          : anyOptionalPresent || secrets.some((s) => s.required && s.present)
            ? 'ok'
            : 'partial'
        : secrets.some((s) => s.present)
          ? 'partial'
          : 'missing';

      return {
        id: c.id,
        name: c.name,
        category: c.category,
        scope: c.scope,
        secrets,
        status,
        missing,
        notes: c.notes,
        docs: c.docs,
      };
    });

    return new Response(
      JSON.stringify({
        generated_at: new Date().toISOString(),
        connectors: report,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
