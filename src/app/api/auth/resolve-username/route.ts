import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn("[resolve-username] Missing Supabase env vars");
}

const supabaseAdmin =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin not configured" }, { status: 500 });
  }

  try {
    const { identifier } = await request.json();
    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
    }

    const trimmed = identifier.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .ilike("username", trimmed)
      .maybeSingle();

    if (error) {
      console.error("[resolve-username] lookup failed", error.message);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }

    if (!data?.email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch (err: any) {
    console.error("[resolve-username] unexpected error", err?.message || err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
