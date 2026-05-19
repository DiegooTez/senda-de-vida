import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pendiente?: string }>
}) {
  const { error, pendiente } = await searchParams

  async function registrar(formData: FormData) {
    'use server'
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const password = formData.get('password') as string
    const confirmar = formData.get('confirmar') as string

    if (!email || !password) {
      redirect('/registro?error=' + encodeURIComponent('Completá todos los campos'))
    }
    if (password !== confirmar) {
      redirect('/registro?error=' + encodeURIComponent('Las contraseñas no coinciden'))
    }
    if (password.length < 6) {
      redirect('/registro?error=' + encodeURIComponent('La contraseña debe tener al menos 6 caracteres'))
    }

    // Verificar lista blanca con cliente admin (el usuario aún no está autenticado)
    const adminSupabase = createAdminClient()
    const { data: permitido } = await adminSupabase
      .from('usuarios_permitidos')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (!permitido) {
      redirect(
        '/registro?error=' +
          encodeURIComponent('No tenés acceso. Contactá al administrador.')
      )
    }

    const supabase = await createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      redirect('/registro?error=' + encodeURIComponent(signUpError.message))
    }

    // Si hay sesión activa → confirmación deshabilitada, usuario ya autenticado
    if (data.session) {
      redirect('/dashboard')
    }

    // Sin sesión → Supabase envió email de confirmación
    redirect('/registro?pendiente=1')
  }

  if (pendiente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Revisá tu correo</h1>
          <p className="text-slate-500 text-sm mb-6">
            Te enviamos un enlace de confirmación. Hacé clic en él para activar tu cuenta.
          </p>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image
              src="/logo.jpeg"
              alt="Senda de Vida"
              width={72}
              height={72}
              className="rounded-xl object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Crear cuenta</h1>
          <p className="text-slate-500 mt-2 text-sm">Sistema de administración</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={registrar} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="tu@email.com"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="confirmar"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirmar"
              name="confirmar"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Crear cuenta
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
            ¿Ya tenés cuenta? Iniciá sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
