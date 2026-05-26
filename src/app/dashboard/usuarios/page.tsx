import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RolSelector } from './RolSelector'
import { PermisoManager } from './PermisoManager'

type Perfil = {
  id: string
  email: string | null
  full_name: string | null
  rol: string | null
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-navy/10 text-navy flex items-center justify-center font-bold text-sm flex-shrink-0">
      {initial}
    </div>
  )
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
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfilActual?.rol !== 'admin') redirect('/dashboard')

  const [{ data: perfiles, error: perfilesError }, { data: permisos }] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, rol').order('email'),
    supabase.from('usuarios_permitidos').select('id, email').order('creado_at', { ascending: true }),
  ])

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Header navy ─────────────────────────────────── */}
      <div className="bg-gradient-to-br from-navy-dark via-navy to-navy-mid">
        <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="Senda de Vida"
              width={36}
              height={36}
              className="rounded-lg object-contain flex-shrink-0"
            />
            <h1 className="text-white font-bold text-lg tracking-tight leading-none">
              Senda de Vida
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <a
              href="/dashboard"
              className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/dashboard/usuarios"
              className="text-white text-sm px-3 py-1.5 rounded-lg bg-white/15 font-medium"
            >
              Usuarios
            </a>
            <form action={signOut}>
              <button
                type="submit"
                className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                Salir
              </button>
            </form>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 pt-1 pb-10">
          <p className="text-blue-300 text-[11px] font-bold uppercase tracking-widest mb-1">
            Administración
          </p>
          <h2 className="text-white text-2xl font-bold">Gestión de usuarios</h2>
          <p className="text-blue-200 text-sm mt-1">
            {(perfiles ?? []).length} usuario{(perfiles ?? []).length !== 1 ? 's' : ''} registrado{(perfiles ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Contenido ────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 -mt-4 pb-12 space-y-6">
        {perfilesError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            Error al cargar usuarios: {perfilesError.message}
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {(perfiles ?? []).length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-slate-400 text-sm">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Usuario
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                      Email
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Rol
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(perfiles as Perfil[]).map((perfil) => (
                    <tr
                      key={perfil.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={perfil.full_name ?? perfil.email ?? '?'} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">
                              {perfil.full_name ?? '—'}
                            </p>
                            <p className="text-xs text-slate-400 truncate sm:hidden">
                              {perfil.email ?? ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 hidden sm:table-cell">
                        {perfil.email ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <RolSelector
                          userId={perfil.id}
                          rolActual={perfil.rol ?? 'user'}
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

        {/* Lista blanca */}
        <div>
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Acceso
            </p>
            <h3 className="text-xl font-bold text-slate-800">Lista blanca</h3>
            <p className="mt-1 text-slate-500 text-sm">
              Solo pueden ingresar los correos habilitados en esta lista.
            </p>
          </div>
          <PermisoManager permisos={permisos ?? []} />
        </div>
      </main>
    </div>
  )
}
