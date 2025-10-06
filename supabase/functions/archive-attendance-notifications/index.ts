import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-archive-secret",
};

const ATTENDANCE_TTL_SECONDS = 5 * 60; // 5 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Optional protection with a shared header secret for manual invocations or scheduler headers
    const configuredSecret = Deno.env.get("ARCHIVE_CRON_SECRET") || "";
    if (configuredSecret) {
      const provided = req.headers.get("x-archive-secret") || "";
      if (provided !== configuredSecret) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
    }

    const url = new URL(req.url);
    const ttl = Number(url.searchParams.get("ttl")) || ATTENDANCE_TTL_SECONDS;
    const cutoffIso = new Date(Date.now() - ttl * 1000).toISOString();

    const TYPES = [
      "attendance",
      "attendance_range",
      "term_attendance",
      "mid_term_attendance",
    ];

    const { data, error } = await supabase
      .from("notifications")
      .update({ status: "archived" })
      .in("type", TYPES)
      .neq("status", "archived")
      .lte("created_at", cutoffIso)
      .select("id");

    if (error) throw error;

    return new Response(
      JSON.stringify({ archived: Array.isArray(data) ? data.length : 0, cutoff: cutoffIso }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: corsHeaders });
  }
});
