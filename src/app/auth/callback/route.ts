import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email) {
        const admin = createAdminClient()

        // 1. Verificar whitelist
        const { data: permitido } = await admin
          .from('usuarios_permitidos')
          .select('id, nombre, rol')
          .eq('email', user.email.toLowerCase())
          .eq('activo', true)
          .maybeSingle()

        if (!permitido) {
          await supabase.auth.signOut()
          return NextResponse.redirect(
            new URL('/login?error=' + encodeURIComponent('No tenés acceso. Contactá al administrador.'), origin)
          )
        }

        // 2. Crear perfil si no existe
        const { data: perfilExistente } = await admin
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (!perfilExistente) {
          const nombre =
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            permitido.nombre ??
            user.email

          await admin.from('profiles').insert({
            id: user.id,
            email: user.email.toLowerCase(),
            nombre,
            rol: permitido.rol ?? 'user',
            activo: true,
          })
        }
      }

      return NextResponse.redirect(new URL(next, origin))
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent(error.message), origin)
    )
  }

  console.error('[auth/callback] No code in URL')
  return NextResponse.redirect(
    new URL('/login?error=' + encodeURIComponent('No se recibió código de autorización'), origin)
  )
}
