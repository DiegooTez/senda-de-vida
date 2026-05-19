import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const { sent, error } = await searchParams

  async function resetPassword(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') ?? `http://${headersList.get('host')}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
    })

    if (error) redirect('/login/reset?error=' + encodeURIComponent(error.message))
    redirect('/login/reset?sent=1')
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Revisá tu correo</h1>
          <p className="text-slate-500 text-sm mb-6">
            Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Restablecer contraseña</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={resetPassword} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
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
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Enviar enlace
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
