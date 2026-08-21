import { NextResponse, type NextRequest } from "next/server";

// Cookie-presence gate at the edge; role checks (which need the database)
// live in the /app and /admin layouts. SPEC §7: students can never reach
// /admin — the layout redirects them; logged-out users land on /login.
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has("lumen_session");
  const { pathname } = request.nextUrl;

  if (!hasSession && (pathname.startsWith("/app") || pathname.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
