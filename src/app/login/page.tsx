import Image from 'next/image'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

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
    const origin =
      headersList.get('origin') ?? `http://${headersList.get('host')}`

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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) redirect('/login?error=' + encodeURIComponent(error.message))
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image
              src="/logo.jpeg"
              alt="Senda de Vida"
              width={96}
              height={96}
              className="rounded-xl object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Senda de Vida</h1>
          <p className="text-slate-500 mt-2 text-sm">Sistema de administración</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            Iniciar sesión con Google
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-slate-400">o</span>
          </div>
        </div>

        <form action={signInWithEmail} className="space-y-4">
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

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
