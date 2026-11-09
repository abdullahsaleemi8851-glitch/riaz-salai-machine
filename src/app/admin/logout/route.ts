import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Could not sign out admin session:", error.message);
  }
  return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
}
