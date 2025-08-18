// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
// };

// serve(async (req) => {
//   if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

//   try {
//     const supabase = createClient(
//       Deno.env.get("SUPABASE_URL") ?? "",
//       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
//     );

//     const authHeader = req.headers.get("Authorization");
//     if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });

//     const token = authHeader.replace("Bearer ", "");
//     const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
//     if (!user || authErr) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

//     // Check super_admin in user_profiles
//     const { data: profile, error: pfErr } = await supabase
//       .from("user_profiles")
//       .select("role")
//       .eq("id", user.id)
//       .single();
//     if (pfErr || !profile || profile.role !== "super_admin")
//       return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

//     // Pagination params
//     const url = new URL(req.url);
//     const limit = Math.max(1, Math.min(250, Number(url.searchParams.get("limit")) || 50));
//     const offset = Number(url.searchParams.get("offset")) || 0;

//     const { data: audits, error } = await supabase
//       .from("audit_logs")
//       .select("id, user_id, action, resource_type, resource_id, details, created_at")
//       .order("created_at", { ascending: false })
//       .range(offset, offset + limit - 1);

//     if (error) throw error;

//     return new Response(JSON.stringify({ audits }), { status: 200, headers: corsHeaders });
//   } catch (e) {
//     return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
//   }
// });



import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (!user || authErr) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    // Check super_admin in user_profiles
    const { data: profile, error: pfErr } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (pfErr || !profile || profile.role !== "super_admin")
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    // Extract pagination params from POST body
    const body = await req.json();
    const limit = Math.max(1, Math.min(250, Number(body.limit) || 50));
    const offset = Number(body.offset) || 0;

    const { data: audits, error } = await supabase
      .from("audit_logs")
      .select("id, user_id, action, resource_type, resource_id, details, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Enrich audits with actor_name (from user_profiles)
    let enriched = audits ?? [];
    try {
      const actorIds = Array.from(new Set((enriched as any[]).map(a => a.user_id).filter(Boolean)));
      if (actorIds.length > 0) {
        const { data: actors } = await supabase
          .from("user_profiles")
          .select("id, full_name, email")
          .in("id", actorIds as string[]);
        const nameMap = Object.fromEntries((actors || []).map(a => [a.id, a.full_name || a.email || a.id]));
        enriched = (enriched as any[]).map(a => ({ ...a, actor_name: nameMap[a.user_id] || a.user_id }));
      }
    } catch (_) {
      // If enrichment fails for any reason, fall back to raw audits
    }

    // Enrich audits with resource_name based on resource_type
    try {
      const byType: Record<string, string[]> = {};
      for (const a of enriched as any[]) {
        if (!a.resource_id || !a.resource_type) continue;
        if (!byType[a.resource_type]) byType[a.resource_type] = [];
        byType[a.resource_type].push(a.resource_id);
      }

      const maps: Record<string, Record<string, string>> = {};

      // user-like types from user_profiles
      const userLikeTypes = ['student', 'teacher', 'admin'];
      const userIds = (userLikeTypes.flatMap(t => byType[t] || [])).filter(Boolean);
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', Array.from(new Set(userIds)) as string[]);
        const map = Object.fromEntries((users || []).map(u => [u.id, u.full_name || u.email || u.id]));
        for (const t of userLikeTypes) maps[t] = map;
      }

      // classes
      if ((byType['class'] || []).length > 0) {
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', Array.from(new Set(byType['class'])) as string[]);
        maps['class'] = Object.fromEntries((classes || []).map(c => [c.id, c.name || c.id]));
      }

      // subjects
      if ((byType['subject'] || []).length > 0) {
        const { data: subjects } = await supabase
          .from('subjects')
          .select('id, name')
          .in('id', Array.from(new Set(byType['subject'])) as string[]);
        maps['subject'] = Object.fromEntries((subjects || []).map(s => [s.id, s.name || s.id]));
      }

      enriched = (enriched as any[]).map(a => ({
        ...a,
        resource_name: (maps[a.resource_type]?.[a.resource_id]) || a.resource_id
      }));
    } catch (_) {
      // Ignore enrichment failure and use raw IDs
    }

    return new Response(JSON.stringify({ audits: enriched }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});