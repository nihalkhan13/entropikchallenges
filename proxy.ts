import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js middleware (exported as "middleware" so Next.js picks it up).
 * Lives in proxy.ts because Vercel requires only one of middleware.ts / proxy.ts.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session on every request (keeps cookies fresh).
 *    Without this, createBrowserClient cannot find a valid session after
 *    the OAuth callback redirect → infinite loading spinner.
 * 2. Protect /(app)/* routes: redirect unauthenticated users to /login.
 * 3. Redirect authenticated users away from /login back to /dashboard.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add logic between createServerClient and getUser().
  // getUser() also handles token refresh internally.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect all app routes — redirect to login if not authenticated
  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/report-preview')

  if (isAppRoute && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from /login
  if (pathname === '/login' && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (JS/CSS bundles)
     * - _next/image   (image optimisation)
     * - /api/*        (API routes handle their own auth)
     * - /auth/*       (OAuth callback must not be intercepted)
     * - Static assets (favicon, manifest, icons, service worker, images)
     */
    '/((?!_next/static|_next/image|api/|auth/|favicon.ico|manifest.json|apple-touch-icon|app-icon|logo.png|OneSignalSDKWorker.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
