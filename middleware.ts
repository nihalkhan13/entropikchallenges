import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Required by @supabase/ssr for Next.js App Router.
 *
 * Runs on every non-static request and:
 *  1. Refreshes the Supabase session token (keeps the user logged in).
 *  2. Forwards the refreshed cookies to the response — without this the
 *     browser client can't find a valid session after OAuth redirect.
 *  3. Redirects unauthenticated users away from protected routes.
 *  4. Redirects already-authenticated users away from login / home.
 */
export async function middleware(request: NextRequest) {
  // We must create a new response object and mutate it inside setAll so that
  // any refreshed auth cookies are actually forwarded to the browser.
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
          // Write cookies onto both the request (for downstream server code)
          // and the response (so the browser actually receives them).
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

  // IMPORTANT: Do NOT add any logic between createServerClient and getUser().
  // getUser() also refreshes the session internally — it must run unconditionally.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Routes that require a logged-in user
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/report-preview')

  if (!user && isProtected) {
    // Not logged in → send to login page
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (user && (pathname === '/' || pathname === '/login')) {
    // Already logged in → skip the login page
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashUrl)
  }

  // Return the (potentially cookie-updated) response
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     * - _next/static  (JS/CSS bundles)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - /api/*        (server-side API routes handle their own auth)
     * - /auth/*       (OAuth callback must be excluded to avoid redirect loops)
     * - files with an extension (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|auth/|[^/]*\\.[^/]*$).*)',
  ],
}
