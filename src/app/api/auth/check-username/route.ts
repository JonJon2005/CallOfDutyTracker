import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin not configured" }, { status: 500 });
  }

  try {
    const { username, excludeUserId } = await request.json();
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }
    const trimmed = username.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const query = supabaseAdmin.from("profiles").select("id").ilike("username", trimmed).limit(1);
    if (excludeUserId) {
      query.neq("id", excludeUserId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[check-username] lookup failed", error.message);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }
    const exists = Array.isArray(data) && data.length > 0;
    return NextResponse.json({ available: !exists });
  } catch (err: any) {
    console.error("[check-username] unexpected error", err?.message || err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
