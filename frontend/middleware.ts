import { NextRequest, NextResponse } from "next/server";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value
    ?? request.headers.get("authorization")?.replace("Bearer ", "");

  // Check auth via cookie — zustand persists to localStorage (client only),
  // so we use a cookie set on login for SSR middleware checks.
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const hasToken = !!token;

  if (!isPublic && !hasToken) {
    return NextResponse.redirect(new URL(`${basePath}/login`, request.url));
  }
  if (isPublic && hasToken) {
    return NextResponse.redirect(new URL(`${basePath}/dashboard`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
