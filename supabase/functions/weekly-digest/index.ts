import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const resend = new Resend(resendApiKey);

    // 1. Get digest config
    const { data: config, error: configError } = await supabase
      .from("weekly_digest_config")
      .select("*")
      .limit(1)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "Configuration digest introuvable" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.actif) {
      return new Response(
        JSON.stringify({ success: true, message: "Digest désactivé", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipients: string[] = config.recipients || [];
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun destinataire", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch top stories from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: topStories } = await supabase
      .from("actualites")
      .select("titre, resume, source_nom, source_url, importance, sentiment, categorie, date_publication")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("importance", { ascending: false })
      .limit(config.nb_top_stories || 10);

    // 3. Compute sentiment distribution
    const { data: allArticles } = await supabase
      .from("actualites")
      .select("sentiment, categorie")
      .gte("created_at", sevenDaysAgo.toISOString());

    const articles = allArticles || [];
    const enriched = articles.filter((a: any) => a.sentiment != null);
    const positive = enriched.filter((a: any) => a.sentiment > 0.2).length;
    const negative = enriched.filter((a: any) => a.sentiment < -0.2).length;
    const neutral = enriched.length - positive - negative;
    const avgSentiment = enriched.length > 0
      ? enriched.reduce((s: number, a: any) => s + (a.sentiment ?? 0), 0) / enriched.length
      : 0;

    // Per-category sentiment
    const catMap = new Map<string, { sum: number; count: number }>();
    enriched.forEach((a: any) => {
      const cat = a.categorie || "Autres";
      const e = catMap.get(cat) || { sum: 0, count: 0 };
      e.sum += a.sentiment ?? 0;
      e.count++;
      catMap.set(cat, e);
    });

    const categories = Array.from(catMap.entries())
      .map(([name, { sum, count }]) => ({
        name,
        avg: Math.round((sum / count) * 100) / 100,
        count,
        alert: (sum / count) < (config.sentiment_alert_threshold ?? -0.2),
      }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 6);

    // Alert categories
    const alertCategories = categories.filter(c => c.alert);
    const hasAlert = negative / Math.max(enriched.length, 1) > 0.4 || alertCategories.length > 0;

    // 4. Top sources
    const sourceCount = new Map<string, number>();
    (topStories || []).forEach((a: any) => {
      if (a.source_nom) sourceCount.set(a.source_nom, (sourceCount.get(a.source_nom) || 0) + 1);
    });
    const topSources = Array.from(sourceCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 5. Generate HTML
    const html = generateDigestHtml({
      stories: topStories || [],
      sentiment: { positive, neutral, negative, avg: Math.round(avgSentiment * 100) / 100, total: enriched.length },
      categories,
      topSources,
      hasAlert,
      alertCategories,
      includeChart: config.include_sentiment_chart ?? true,
      includeSources: config.include_top_sources ?? true,
      totalArticles: articles.length,
    });

    // 6. Send emails
    const now = new Date();
    const weekStr = `S${getISOWeek(now)}`;
    const subject = `${hasAlert ? "🔴" : "📊"} Digest Hebdo ${weekStr} — ANSUT Radar`;

    let sent = 0;
    const errors: string[] = [];

    for (const email of recipients) {
      try {
        const { error } = await resend.emails.send({
          from: "ANSUT RADAR <no-reply@notifications.ansut.ci>",
          to: [email],
          subject,
          html,
        });
        if (error) {
          errors.push(`${email}: ${error.message}`);
        } else {
          sent++;
        }
      } catch (e) {
        errors.push(`${email}: ${String(e)}`);
      }
    }

    // 7. Update last execution
    await supabase
      .from("weekly_digest_config")
      .update({ derniere_execution: now.toISOString() })
      .eq("id", config.id);

    console.log(`Weekly digest sent to ${sent}/${recipients.length} recipients`);

    return new Response(
      JSON.stringify({ success: true, sent, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Weekly digest error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

interface DigestData {
  stories: any[];
  sentiment: { positive: number; neutral: number; negative: number; avg: number; total: number };
  categories: Array<{ name: string; avg: number; count: number; alert: boolean }>;
  topSources: Array<[string, number]>;
  hasAlert: boolean;
  alertCategories: Array<{ name: string; avg: number }>;
  includeChart: boolean;
  includeSources: boolean;
  totalArticles: number;
}

function generateDigestHtml(data: DigestData): string {
  const { stories, sentiment, categories, topSources, hasAlert, alertCategories, includeChart, includeSources, totalArticles } = data;

  const sentimentColor = sentiment.avg > 0.1 ? "#22c55e" : sentiment.avg < -0.1 ? "#ef4444" : "#f59e0b";
  const now = new Date();
  const dateRange = `${new Date(now.getTime() - 7 * 86400000).toLocaleDateString("fr-FR")} — ${now.toLocaleDateString("fr-FR")}`;

  // Stories HTML
  const storiesHtml = stories.map((s: any, i: number) => {
    const imp = s.importance || 50;
    const impColor = imp >= 70 ? "#ef4444" : imp >= 50 ? "#f59e0b" : "#22c55e";
    const sentEmoji = s.sentiment != null
      ? (s.sentiment > 0.2 ? "😊" : s.sentiment < -0.2 ? "😟" : "😐")
      : "⏳";
    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="background:${impColor};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${imp}%</span>
            <span style="font-size:12px;color:#6b7280;">${s.source_nom || "—"}</span>
            <span style="font-size:12px;">${sentEmoji}</span>
          </div>
          <a href="${s.source_url || "#"}" style="color:#1e40af;text-decoration:none;font-weight:600;font-size:15px;line-height:1.4;">
            ${i + 1}. ${s.titre}
          </a>
          ${s.resume ? `<p style="color:#4b5563;font-size:13px;margin:6px 0 0;line-height:1.5;">${s.resume.substring(0, 180)}…</p>` : ""}
        </td>
      </tr>`;
  }).join("");

  // Sentiment chart (bar-based)
  const chartHtml = includeChart ? `
    <div style="margin:20px 0;padding:20px;background:#f8fafc;border-radius:12px;">
      <h3 style="margin:0 0 16px;font-size:16px;color:#111827;">📊 Tendances Sentiment</h3>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <span style="font-size:28px;font-weight:800;color:${sentimentColor};">${sentiment.avg > 0 ? "+" : ""}${sentiment.avg.toFixed(2)}</span>
        <span style="font-size:13px;color:#6b7280;">Score moyen sur ${sentiment.total} articles analysés</span>
      </div>
      <div style="display:flex;height:24px;border-radius:12px;overflow:hidden;margin-bottom:8px;">
        <div style="width:${Math.round(sentiment.positive / Math.max(sentiment.total, 1) * 100)}%;background:#22c55e;"></div>
        <div style="width:${Math.round(sentiment.neutral / Math.max(sentiment.total, 1) * 100)}%;background:#f59e0b;"></div>
        <div style="width:${Math.round(sentiment.negative / Math.max(sentiment.total, 1) * 100)}%;background:#ef4444;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;">
        <span>😊 Positif: ${sentiment.positive}</span>
        <span>😐 Neutre: ${sentiment.neutral}</span>
        <span>😟 Négatif: ${sentiment.negative}</span>
      </div>
      ${categories.length > 0 ? `
        <div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">
          <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 8px;">Par catégorie</p>
          ${categories.map(c => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px;">
              <span style="width:8px;height:8px;border-radius:2px;background:${c.alert ? "#ef4444" : c.avg > 0.1 ? "#22c55e" : "#94a3b8"};display:inline-block;"></span>
              <span style="flex:1;color:#374151;">${c.name}</span>
              <span style="color:#6b7280;">(${c.count})</span>
              <span style="font-weight:700;color:${c.alert ? "#ef4444" : c.avg > 0.1 ? "#22c55e" : "#6b7280"};">${c.avg > 0 ? "+" : ""}${c.avg.toFixed(2)}</span>
              ${c.alert ? '<span style="color:#ef4444;">⚠️</span>' : ""}
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  ` : "";

  // Alert banner
  const alertHtml = hasAlert ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
      <strong style="color:#dc2626;">🔴 Alerte sentiment</strong>
      <p style="margin:4px 0 0;color:#991b1b;font-size:13px;">
        ${alertCategories.length > 0
          ? `Catégories en alerte : ${alertCategories.map(c => `${c.name} (${c.avg.toFixed(2)})`).join(", ")}`
          : "Plus de 40% des articles ont un sentiment négatif cette semaine."}
      </p>
    </div>
  ` : "";

  // Sources
  const sourcesHtml = includeSources && topSources.length > 0 ? `
    <div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#111827;">🏆 Top Sources</h3>
      ${topSources.map(([name, count]) => `
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;color:#374151;">
          <span>${name}</span><span style="font-weight:600;">${count} article${count > 1 ? "s" : ""}</span>
        </div>
      `).join("")}
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:640px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);border-radius:12px 12px 0 0;padding:28px;text-align:center;">
      <img src="https://lpkfwxisranmetbtgxrv.supabase.co/storage/v1/object/public/avatars/logo-ansut.png" alt="ANSUT" style="width:64px;height:64px;border-radius:10px;margin-bottom:12px;object-fit:contain;background:white;padding:6px;" />
      <h1 style="margin:0;color:white;font-size:22px;">Digest Hebdomadaire</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${dateRange} • ${totalArticles} articles collectés</p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:24px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      ${alertHtml}
      ${chartHtml}

      <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">🏅 Top ${stories.length} Stories</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${storiesHtml}
      </table>

      ${sourcesHtml}

      <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;">
        <a href="https://ansut-lens.lovable.app/actualites" style="display:inline-block;padding:12px 28px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Explorer le Centre de Veille</a>
      </div>

      <p style="color:#9ca3af;font-size:11px;margin:20px 0 0;text-align:center;">
        Digest hebdomadaire automatique — ANSUT Radar<br/>Pour modifier vos préférences, contactez votre administrateur.
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top:20px;padding:20px;background:#1f2937;border-radius:12px;text-align:center;">
      <h3 style="margin:0 0 6px;color:white;font-size:13px;">Agence Nationale du Service Universel des Télécommunications</h3>
      <p style="margin:0;color:#9ca3af;font-size:12px;">📍 Marcory, Abidjan • 📞 +225 27 22 52 95 05 • <a href="https://www.ansut.ci" style="color:#60a5fa;text-decoration:none;">www.ansut.ci</a></p>
      <p style="margin:12px 0 0;color:#6b7280;font-size:10px;">© 2025 ANSUT — Tous droits réservés</p>
    </div>
  </div>
</body></html>`;
}
