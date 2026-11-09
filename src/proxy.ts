import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const loginUrl = new URL("/admin/login", request.url);
  const isRecoveryPage = request.nextUrl.pathname === "/admin/reset-password";

  if (!url || !key) {
    if (request.nextUrl.pathname !== "/admin/login" && !isRecoveryPage) {
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!user) {
    if (isLoginPage || isRecoveryPage) return response;
    return NextResponse.redirect(loginUrl);
  }

  if (isRecoveryPage) return response;

  const { data: membership, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    if (isLoginPage) return response;
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage) return NextResponse.redirect(new URL("/admin", request.url));
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
