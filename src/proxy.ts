import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const participantRoutes = ["/dashboard", "/partidos", "/mis-pronosticos", "/tabla", "/perfil"];

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? "dev-auth-secret",
  });

  const { pathname } = request.nextUrl;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (participantRoutes.some((route) => pathname.startsWith(route)) && token.role === "admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/partidos/:path*", "/mis-pronosticos/:path*", "/tabla/:path*", "/perfil/:path*", "/admin/:path*"],
};
