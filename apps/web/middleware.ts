import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Content Security Policy
  // Allow self, inline styles (needed by Next.js), and specific service origins
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "connect-src 'self' wss://*.onrender.com https://*.onrender.com wss://*.intervue.app https://*.intervue.app https://cdn.jsdelivr.net",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Strict Transport Security — 1 year, include subdomains, allow preload list
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  // Control what information is sent in the Referer header
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Opt out of FLoC / Topics API tracking
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");

  // Prevent XSS reflected attacks in older browsers
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Redirect protected routes to login if no token cookie
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/dashboard")) {
    // Client-side auth check handles actual redirect via AuthProvider
    // This middleware just ensures security headers are set
  }

  return response;
}

export const config = {
  // Apply to all routes except static files and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
