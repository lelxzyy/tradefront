import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const authenticated = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  if (request.nextUrl.pathname === "/login") {
    return authenticated ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api/auth|api/internal|_next/static|_next/image|favicon.ico).*)"] };
