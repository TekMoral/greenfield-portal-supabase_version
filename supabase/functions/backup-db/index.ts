// supabase/functions/backup-db/index.ts
// Purpose: Triggerable Edge Function to export selected tables to Google Drive as JSON
// Security: Call with Authorization: Bearer <SECRET_CRON_TOKEN> (or FUNCTION_SECRET)
// Body (optional): { tables?: string[], includeAudit?: boolean, cleanupWebVitalsOlderThan?: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BackupRequest = {
  tables?: string[];
  includeAudit?: boolean;
  cleanupWebVitalsOlderThan?: string; // e.g., '30 days'
};

type TableBackupResult = {
  table: string;
  rows: number;
  bytes: number;
  driveFileId?: string;
  error?: string;
};

type FailureStage =
  | "auth"
  | "parseBody"
  | "envValidation"
  | "token.jwtBuild"
  | "token.importKey"
  | "token.sign"
  | "token.exchange"
  | "drive.createFolder"
  | "db.fetchRows"
  | "drive.upload"
  | "rpc.cleanupWebVitals"
  | "audit.insert"
  | "unknown";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const start = Date.now();
  const dlog = (...args: unknown[]) => console.log("[backup-db]", requestId, "-", ...args);
  let failureStage: FailureStage | null = null;

  try {
    dlog("start", { ts: new Date().toISOString() });

    // AuthZ: Bearer token header
    failureStage = "auth";
    const expectedToken = Deno.env.get("SECRET_CRON_TOKEN") || Deno.env.get("FUNCTION_SECRET") || "";
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : "";

    if (!expectedToken) {
      dlog("config missing: SECRET_CRON_TOKEN/FUNCTION_SECRET not set");
      return new Response(
        JSON.stringify({ success: false, error: "Server not configured", code: "CONFIG_MISSING", stage: failureStage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    if (!provided || provided !== expectedToken) {
      dlog("auth failed: bearer mismatch or missing");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", code: "UNAUTHORIZED", stage: failureStage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
      );
    }
    dlog("auth ok");

    // Inputs
    failureStage = "parseBody";
    let body: BackupRequest = {};
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        body = await req.json();
      }
    } catch (e) {
      dlog("parse body error", (e as Error).message);
      // non-fatal
    }

    const defaultTablesEnv = (Deno.env.get("BACKUP_TABLES") || "user_profiles,classes,subjects,audit_logs").split(",").map((s) => s.trim()).filter(Boolean);
    const includeAudit = body.includeAudit !== undefined ? !!body.includeAudit : true;

    // Final list of tables
    let tables = (body.tables && body.tables.length > 0) ? body.tables : defaultTablesEnv;
    if (!includeAudit) tables = tables.filter((t) => t !== "audit_logs");
    dlog("tables", tables);

    // Admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Google Drive credentials
    failureStage = "envValidation";
    const driveClientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL") || "";
    const drivePrivateKeyRaw = Deno.env.get("GOOGLE_PRIVATE_KEY") || "";
    const driveFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || "";

    const missing: string[] = [];
    if (!driveClientEmail) missing.push("GOOGLE_CLIENT_EMAIL");
    if (!drivePrivateKeyRaw) missing.push("GOOGLE_PRIVATE_KEY");
    if (!driveFolderId) missing.push("GOOGLE_DRIVE_FOLDER_ID");

    if (missing.length) {
      dlog("gdrive config missing", missing);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Google Drive not configured",
          code: "GDRIVE_CONFIG_MISSING",
          missing,
          stage: failureStage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    // Private key may be provided with escaped newlines; normalize
    const drivePrivateKey = drivePrivateKeyRaw.replace(/\\n/g, "\n");

    // Acquire OAuth2 access token for Drive API
    async function getDriveAccessToken(): Promise<string> {
      const nowSec = Math.floor(Date.now() / 1000);
      failureStage = "token.jwtBuild";
      const header = base64UrlEncodeJSON({ alg: "RS256", typ: "JWT" });
      const claim = base64UrlEncodeJSON({
        iss: driveClientEmail,
        scope: "https://www.googleapis.com/auth/drive.file",
        aud: "https://oauth2.googleapis.com/token",
        iat: nowSec,
        exp: nowSec + 3600,
      });

      failureStage = "token.importKey";
      const payload = `${header}.${claim}`;
      const signature = await signWithPrivateKey(drivePrivateKey, payload);

      failureStage = "token.sign";
      const jwt = `${payload}.${signature}`;

      failureStage = "token.exchange";
      const params = new URLSearchParams();
      params.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
      params.set("assertion", jwt);

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!res.ok) {
        const txt = await res.text();
        dlog("token exchange failed", { status: res.status, statusText: res.statusText, body: txt?.slice(0, 500) });
        throw new Error(`Token exchange failed: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      const token = json.access_token as string;
      if (!token) {
        dlog("token missing in response", json);
        throw new Error("No access_token in response");
      }
      dlog("token ok");
      return token;
    }

    function base64UrlEncodeJSON(obj: unknown): string {
      const json = JSON.stringify(obj);
      return base64UrlEncode(new TextEncoder().encode(json));
    }

    function base64UrlEncode(bytes: Uint8Array): string {
      // Standard base64
      let b64 = btoa(String.fromCharCode(...bytes));
      // Convert to base64url
      return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    async function signWithPrivateKey(pem: string, input: string): Promise<string> {
      try {
        failureStage = "token.importKey";
        const pkcs8 = pemToArrayBuffer(pem);
        const key = await crypto.subtle.importKey(
          "pkcs8",
          pkcs8,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["sign"],
        );
        failureStage = "token.sign";
        const signature = await crypto.subtle.sign(
          { name: "RSASSA-PKCS1-v1_5" },
          key,
          new TextEncoder().encode(input),
        );
        return base64UrlEncode(new Uint8Array(signature));
      } catch (e) {
        dlog("signWithPrivateKey error", (e as Error)?.message);
        throw e;
      }
    }

    function pemToArrayBuffer(pem: string): ArrayBuffer {
      try {
        const b64 = pem
          .replace(/-----BEGIN PRIVATE KEY-----/g, "")
          .replace(/-----END PRIVATE KEY-----/g, "")
          .replace(/\r?\n/g, "");
        const binString = atob(b64);
        const len = binString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binString.charCodeAt(i);
        return bytes.buffer;
      } catch (e) {
        dlog("pemToArrayBuffer error: invalid key format?", (e as Error)?.message);
        throw e;
      }
    }

    // Create a dated backup folder under the configured parent folder
    async function createDriveFolder(accessToken: string, name: string, parentFolderId: string): Promise<string> {
      failureStage = "drive.createFolder";
      const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentFolderId],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        dlog("createFolder failed", { status: res.status, statusText: res.statusText, body: txt?.slice(0, 500) });
        throw new Error(`Create folder failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      dlog("folder created", { name, id: data.id });
      return data.id as string;
    }

    async function uploadJsonToDrive(accessToken: string, folderId: string, fileName: string, jsonContent: string): Promise<{ id: string }>{
      failureStage = "drive.upload";
      const boundary = `boundary_${crypto.randomUUID()}`;
      const metadata = {
        name: fileName,
        parents: [folderId],
        mimeType: "application/json",
      };

      const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${jsonContent}\r\n` +
        `--${boundary}--`;

      const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      });

      if (!res.ok) {
        const txt = await res.text();
        dlog("upload failed", { file: fileName, status: res.status, statusText: res.statusText, body: txt?.slice(0, 500) });
        throw new Error(`Upload failed for ${fileName}: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      dlog("upload ok", { file: fileName, id: data.id });
      return { id: data.id as string };
    }

    // Timestamp for naming
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const hh = String(now.getUTCHours()).padStart(2, "0");
    const mi = String(now.getUTCMinutes()).padStart(2, "0");
    const ss = String(now.getUTCSeconds()).padStart(2, "0");
    const isoSafe = `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
    const folderName = `backup-${isoSafe}`;

    // Fetch Drive token and create daily folder
    const accessToken = await getDriveAccessToken();
    const backupFolderId = await createDriveFolder(accessToken, folderName, driveFolderId);

    const encoder = new TextEncoder();
    const results: TableBackupResult[] = [];

    // Helper to fetch all rows in pages (to avoid default limits)
    async function fetchAllRows(table: string, pageSize = 1000) {
      let from = 0;
      let to = pageSize - 1;
      const all: any[] = [];
      while (true) {
        failureStage = "db.fetchRows";
        const { data, error } = await supabaseAdmin.from(table).select("*", { count: "exact" }).range(from, to);
        if (error) throw error;
        const chunk = data || [];
        all.push(...chunk);
        if (chunk.length < pageSize) break;
        from += pageSize;
        to += pageSize;
      }
      return all;
    }

    // Backup loop -> upload each table JSON to Drive
    for (const table of tables) {
      try {
        dlog("table start", table);
        const rows = await fetchAllRows(table);
        const json = JSON.stringify({ table, exported_at: now.toISOString(), row_count: rows.length, rows });
        const bytes = encoder.encode(json);
        const { id: fileId } = await uploadJsonToDrive(accessToken, backupFolderId, `${table}.json`, json);
        results.push({ table, rows: rows.length, bytes: bytes.byteLength, driveFileId: fileId });
      } catch (e) {
        dlog("table error", { table, stage: failureStage, message: (e as Error).message });
        results.push({ table, rows: 0, bytes: 0, error: (e as Error).message });
      }
    }

    // Optional: cleanup web vitals via RPC if requested
    let webVitalsCleanup: { attempted: boolean; deleted?: number; error?: string } = { attempted: false };
    if (body.cleanupWebVitalsOlderThan) {
      failureStage = "rpc.cleanupWebVitals";
      webVitalsCleanup.attempted = true;
      try {
        const { data, error } = await supabaseAdmin.rpc("rpc_web_vitals_cleanup", { p_older_than: body.cleanupWebVitalsOlderThan });
        if (error) throw error;
        webVitalsCleanup.deleted = Number(data) || 0;
        dlog("rpc cleanup ok", webVitalsCleanup);
      } catch (e) {
        webVitalsCleanup.error = (e as Error).message;
        dlog("rpc cleanup error", webVitalsCleanup.error);
      }
    }

    // Log run to audit_logs (best effort)
    failureStage = "audit.insert";
    try {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: null,
        action: "scheduled_backup_run",
        resource_type: "maintenance",
        resource_id: requestId,
        details: {
          request_id: requestId,
          drive_parent_folder: driveFolderId,
          backup_folder: backupFolderId,
          tables,
          results,
          webVitalsCleanup,
          duration_ms: Date.now() - start,
        },
        description: `Scheduled backup to Google Drive completed (${results.filter(r => !r.error).length}/${tables.length} succeeded)`,
        ip_address: req.headers.get("x-forwarded-for") || "scheduler",
      });
      dlog("audit inserted");
    } catch (e) {
      dlog("audit insert warning", (e as Error).message);
      // non-fatal
    }

    const succeeded = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => r.error).length;

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        driveParentFolderId: driveFolderId,
        backupFolderId,
        tables,
        results,
        webVitalsCleanup,
        summary: { succeeded, failed, durationMs: Date.now() - start },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: failed > 0 ? 207 : 200 },
    );
  } catch (error) {
    const message = (error as Error)?.message || "Unknown error";
    dlog("fatal", { stage: failureStage || "unknown", message });
    return new Response(
      JSON.stringify({ success: false, error: message, stage: failureStage || "unknown" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
