import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RolSelector } from './RolSelector'

type Perfil = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
}

export default async function UsuariosPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) redirect('/login')

  const { data: perfilActual } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (perfilActual?.role !== 'admin') redirect('/dashboard')

  const { data: perfiles, error: perfilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .order('email')

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.jpeg"
                alt="Senda de Vida"
                width={32}
                height={32}
                className="rounded-lg object-contain"
              />
              <span className="text-xl font-bold text-slate-800">Senda de Vida</span>
            </div>
            <nav className="flex items-center gap-1">
              <a
                href="/dashboard"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/dashboard/usuarios"
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg"
              >
                Usuarios
              </a>
            </nav>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Gestión de usuarios</h2>
          <p className="mt-1 text-slate-500 text-sm">
            {(perfiles ?? []).length} usuario{(perfiles ?? []).length !== 1 ? 's' : ''} registrado{(perfiles ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>

        {perfilesError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            Error al cargar usuarios: {perfilesError.message}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {(perfiles ?? []).length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">
                      Usuario
                    </th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">
                      Email
                    </th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">
                      Rol
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(perfiles as Perfil[]).map((perfil) => (
                    <tr
                      key={perfil.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs flex-shrink-0">
                            {(perfil.full_name ?? perfil.email ?? '?')
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">
                            {perfil.full_name ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {perfil.email ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <RolSelector
                          userId={perfil.id}
                          rolActual={perfil.role ?? 'user'}
                          esPropioUsuario={perfil.id === user.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
