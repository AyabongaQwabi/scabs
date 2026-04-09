import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAuthMiddlewareClient } from "@/lib/supabase/auth-middleware";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin/* except /admin/login
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createSupabaseAuthMiddlewareClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};

