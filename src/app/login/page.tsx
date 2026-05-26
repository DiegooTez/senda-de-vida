import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  async function signInWithGoogle() {
    'use server'
    const supabase = await createClient()
    const headersList = await headers()
    const forwardedHost = headersList.get('x-forwarded-host')
    const forwardedProto = headersList.get('x-forwarded-proto') ?? 'https'
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : (headersList.get('origin') ?? 'http://localhost:3000'))

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    })

    if (error) redirect('/login?error=' + encodeURIComponent(error.message))
    redirect(data.url!)
  }

  async function signInWithEmail(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) redirect('/login?error=' + encodeURIComponent(error.message))

    const admin = createAdminClient()
    const { data: permitido } = await admin
      .from('usuarios_permitidos')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('activo', true)
      .maybeSingle()

    if (!permitido) {
      await supabase.auth.signOut()
      redirect('/login?error=' + encodeURIComponent('No tenés acceso. Contactá al administrador.'))
    }

    redirect('/dashboard')
  }

  const inputClass =
    'w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm bg-white'

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-dark via-navy to-brand flex flex-col items-center justify-center p-4">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header de la card */}
        <div className="bg-gradient-to-br from-navy to-brand px-8 py-7 text-center">
          <div className="flex justify-center mb-3">
            <Image
              src="/logo.jpeg"
              alt="Senda de Vida"
              width={72}
              height={72}
              className="rounded-2xl object-contain shadow-lg"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Senda de Vida</h1>
          <p className="text-blue-200 text-sm mt-1">Sistema de administración</p>
        </div>

        <div className="px-8 py-6">
          {/* Error */}
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          {/* Google */}
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              Continuar con Google
            </button>
          </form>

          {/* Separador */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400">o iniciá sesión</span>
            </div>
          </div>

          {/* Email / contraseña */}
          <form action={signInWithEmail} className="space-y-3.5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="tu@email.com"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-navy hover:bg-navy-dark text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm mt-1"
            >
              Iniciar sesión
            </button>
          </form>

          {/* Links */}
          <div className="mt-5 space-y-2 text-center">
            <Link
              href="/login/reset"
              className="block text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <Link
              href="/registro"
              className="block text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              ¿No tenés cuenta?{' '}
              <span className="font-semibold text-brand">Registrate</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
