// ANSUT Unified Notification Gateway
// Canaux supportés : sms | email | telegram | whatsapp
// Tous routés vers le Hub ANSUT (Unified Gateway) : POST {AZURE_SMS_URL}/api/message/send
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Channel = "sms" | "email" | "telegram" | "whatsapp";

interface WhatsAppTemplate {
  name: string;
  languageCode: string;
}

interface NotifyBody {
  channel: Channel;
  to: string;
  // SMS / Telegram / Email
  content?: string;
  // Email
  subject?: string;
  cc?: string | null;
  bcc?: string | null;
  ishtml?: boolean;
  // Telegram / WhatsApp (optionnel, défaut "ANSUT RADAR")
  from?: string;
  // WhatsApp uniquement (template approuvé obligatoire)
  whatsAppTemplate?: WhatsAppTemplate;
}

function jsonError(
  code: string,
  status: number,
  message: string,
  details?: unknown,
) {
  return new Response(
    JSON.stringify({ error: { code, status, message, details } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function jsonSuccess(channel: Channel, to: string, gateway: unknown) {
  return new Response(
    JSON.stringify({ result: { success: true, channel, to, gateway } }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function buildGatewayUrl(baseUrl: string): string {
  // Strip éventuel suffixe historique /api/SendSMS puis ajoute /api/message/send
  return baseUrl.replace(/\/api\/SendSMS\/?$/i, "") + "/api/message/send";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", 405, "Use POST");
  }

  try {
    // ---- Auth admin (Bearer) ----
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    let actorId: string | null = null;
    let isServiceRole = false;

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("UNAUTHORIZED", 401, "Missing Bearer token");
    }

    const token = authHeader.replace("Bearer ", "");
    if (token === serviceRoleKey) {
      isServiceRole = true;
    } else {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } =
        await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return jsonError("UNAUTHORIZED", 401, "Invalid token");
      }
      actorId = claimsData.claims.sub;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: isAdmin } = await adminClient.rpc("has_role", {
        _user_id: actorId,
        _role: "admin",
      });
      if (!isAdmin) {
        return jsonError("FORBIDDEN", 403, "Admin role required");
      }
    }

    // ---- Validation body ----
    let body: NotifyBody;
    try {
      body = await req.json();
    } catch {
      return jsonError("BAD_REQUEST", 400, "Invalid JSON body");
    }

    const { channel, to } = body;
    if (!channel || !["sms", "email", "telegram", "whatsapp"].includes(channel)) {
      return jsonError(
        "BAD_REQUEST",
        400,
        "channel must be one of: sms | email | telegram | whatsapp",
      );
    }
    if (!to || typeof to !== "string") {
      return jsonError("BAD_REQUEST", 400, "`to` is required");
    }

    // ---- Config gateway ----
    const gatewayBaseUrl = Deno.env.get("AZURE_SMS_URL");
    const username = Deno.env.get("AZURE_SMS_USERNAME");
    const password = Deno.env.get("AZURE_SMS_PASSWORD");
    if (!gatewayBaseUrl || !username || !password) {
      return jsonError(
        "CONFIG_ERROR",
        500,
        "AZURE_SMS_URL / AZURE_SMS_USERNAME / AZURE_SMS_PASSWORD not configured",
      );
    }
    const unifiedUrl = buildGatewayUrl(gatewayBaseUrl);
    const defaultFrom = Deno.env.get("AZURE_SMS_FROM") || "ANSUT RADAR";

    // ---- Construction payload par canal ----
    let payload: Record<string, unknown>;
    let templateUsed: string | null = null;

    switch (channel) {
      case "sms": {
        if (!body.content) {
          return jsonError("BAD_REQUEST", 400, "SMS requires `content`");
        }
        payload = {
          to: to.replace(/^\+/, ""),
          content: body.content.slice(0, 160),
          username,
          password,
          // SMS = pas de champ channel (canal par défaut du Gateway)
        };
        break;
      }
      case "email": {
        if (!body.content || !body.subject) {
          return jsonError(
            "BAD_REQUEST",
            400,
            "Email requires `subject` and `content`",
          );
        }
        payload = {
          to,
          cc: body.cc ?? null,
          bcc: body.bcc ?? null,
          subject: body.subject,
          content: body.content,
          ishtml: body.ishtml ?? true,
          username,
          password,
          channel: "Email",
        };
        break;
      }
      case "telegram": {
        if (!body.content) {
          return jsonError("BAD_REQUEST", 400, "Telegram requires `content`");
        }
        payload = {
          to,
          from: body.from || defaultFrom,
          content: body.content,
          username,
          password,
          channel: "Telegram",
        };
        break;
      }
      case "whatsapp": {
        const tpl = body.whatsAppTemplate;
        if (!tpl?.name || !tpl?.languageCode) {
          return jsonError(
            "BAD_REQUEST",
            400,
            "WhatsApp requires whatsAppTemplate.name and whatsAppTemplate.languageCode",
          );
        }
        templateUsed = tpl.name;
        payload = {
          username,
          password,
          channel: "WhatsApp",
          to: to.replace(/^\+/, ""),
          content: "null",
          whatsAppTemplate: {
            name: tpl.name,
            languageCode: tpl.languageCode,
          },
        };
        break;
      }
    }

    // ---- Appel Hub ANSUT ----
    let gatewayResponse: Response;
    try {
      gatewayResponse = await fetch(unifiedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      return jsonError(
        "GATEWAY_ERROR",
        502,
        "Failed to reach ANSUT Hub",
        String(err),
      );
    }

    const rawText = await gatewayResponse.text();
    let parsed: unknown = rawText;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      /* keep text */
    }

    if (!gatewayResponse.ok) {
      return jsonError(
        "GATEWAY_ERROR",
        gatewayResponse.status,
        `Hub returned ${gatewayResponse.status}`,
        parsed,
      );
    }

    // ---- Audit (best effort, ne bloque pas la réponse) ----
    try {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      await adminClient.from("admin_audit_logs").insert({
        admin_id: actorId ?? "00000000-0000-0000-0000-000000000000",
        action: "NOTIFY_SENT",
        details: {
          channel,
          to,
          template: templateUsed,
          service_role: isServiceRole,
          subject: body.subject ?? null,
        },
      });
    } catch (e) {
      console.warn("Audit insert failed:", e);
    }

    return jsonSuccess(channel, to, parsed);
  } catch (err) {
    console.error("ansut-notify error:", err);
    return jsonError(
      "INTERNAL_ERROR",
      500,
      err instanceof Error ? err.message : String(err),
    );
  }
});
