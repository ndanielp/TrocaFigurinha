export const runtime = 'nodejs';
import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/sw.js",
  "/workbox-",
  "/swe-worker",
];

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.webmanifest";

  if (isPublic) return NextResponse.next();

  const session = req.auth;

  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.accountStatus === "incomplete_onboarding" && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
