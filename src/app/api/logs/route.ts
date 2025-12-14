import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn("[logs api] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Logging not configured on server (missing env vars)" },
      { status: 500 },
    );
  }

  try {
    const { userId, level = "info", message, context = {} } = await request.json();
    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }
    const allowedLevels = ["debug", "info", "warn", "error"];
    const logLevel = allowedLevels.includes(level) ? level : "info";

    const now = new Date().toISOString();
    console.log(
      `[${now}] [${logLevel.toUpperCase()}] ${message}` +
        (context?.email ? ` (user: ${context.email})` : ""),
      context || {},
    );

    await supabaseAdmin.from("logs").insert({
      user_id: userId ?? null,
      level: logLevel,
      message,
      context,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[log] failed to record log", err?.message || err);
    return NextResponse.json({ error: "Failed to record log" }, { status: 500 });
  }
}
