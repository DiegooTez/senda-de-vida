import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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

  // IMPORTANT: do not add logic between createServerClient and getUser().
  // Any mistake here causes random logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Check whitelist once for routes that need it
  let isWhitelisted: boolean | null = null
  if (user && (path.startsWith('/dashboard') || path === '/login' || path === '/registro')) {
    const { data } = await supabase
      .from('usuarios_permitidos')
      .select('id')
      .eq('email', (user.email ?? '').toLowerCase())
      .maybeSingle()
    isWhitelisted = !!data
  }

  if (path.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    if (isWhitelisted === false) return NextResponse.redirect(new URL('/sin-acceso', request.url))
  }

  if ((path === '/login' || path === '/registro') && user) {
    if (isWhitelisted === false) return NextResponse.redirect(new URL('/sin-acceso', request.url))
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png$).*)'],
}
