import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RolSelector } from './RolSelector'
import { AsignarCajasModal } from './AsignarCajasModal'
import { InvitarForm } from './InvitarForm'
import { CrearCajaModal, EditarCajaModal } from './CajaFormModal'
import { eliminarPermiso } from './actions'

type Perfil = {
  id: string
  email: string | null
  nombre: string | null
  rol: string | null
}

type Caja = {
  id: string
  nombre: string
  tipo: 'personal' | 'comunitaria'
  moneda: 'ARS' | 'USD' | 'AMBAS'
  visibilidad: string
  nombre_titular: string | null
  saldo_ars: number
  saldo_usd: number
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-navy/10 text-navy flex items-center justify-center font-bold text-sm flex-shrink-0">
      {initial}
    </div>
  )
}

function formatMonto(n: number, moneda: string) {
  if (moneda === 'ARS') return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
  if (moneda === 'USD') return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
  return `$${n.toLocaleString('es-AR')}`
}

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) redirect('/login')

  const { data: perfilActual } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (perfilActual?.rol !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  const [
    { data: perfiles },
    { data: cajasData },
    { data: asignaciones },
    { data: permisos },
  ] = await Promise.all([
    admin.from('profiles').select('id, email, nombre, rol').order('nombre'),
    admin.from('cajas').select('id, nombre, tipo, moneda, visibilidad, nombre_titular, saldo_ars, saldo_usd').eq('activa', true).order('nombre'),
    admin.from('caja_usuarios').select('caja_id, usuario_id'),
    admin.from('usuarios_permitidos').select('id, email, nombre, rol, activo').order('creado_en', { ascending: false }),
  ])

  const cajas: Caja[] = (cajasData ?? []) as Caja[]
  const cajasParaModal = cajas.map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, moneda: c.moneda }))

  // Mapa usuario → cajas asignadas
  const cajasPorUsuario = new Map<string, string[]>()
  for (const asig of (asignaciones ?? [])) {
    const list = cajasPorUsuario.get(asig.usuario_id) ?? []
    list.push(asig.caja_id)
    cajasPorUsuario.set(asig.usuario_id, list)
  }

  // Mapa caja → usuarios asignados
  const usuariosPorCaja = new Map<string, string[]>()
  for (const asig of (asignaciones ?? [])) {
    const list = usuariosPorCaja.get(asig.caja_id) ?? []
    list.push(asig.usuario_id)
    usuariosPorCaja.set(asig.caja_id, list)
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const totalUsuarios = (perfiles ?? []).length
  const totalCajas = cajas.length

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-navy-dark via-navy to-navy-mid">
        <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpeg" alt="Senda de Vida" width={36} height={36} className="rounded-lg object-contain flex-shrink-0" />
            <h1 className="text-white font-bold text-lg tracking-tight leading-none">Senda de Vida</h1>
          </div>
          <div className="flex items-center gap-1">
            <a href="/dashboard" className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
              Dashboard
            </a>
            <a href="/dashboard/usuarios" className="text-white text-sm px-3 py-1.5 rounded-lg bg-white/15 font-medium">
              Usuarios
            </a>
            <a href="/dashboard/log" className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors hidden sm:block">
              Log
            </a>
            <form action={signOut}>
              <button type="submit" className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                Salir
              </button>
            </form>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 pt-1 pb-10">
          <p className="text-blue-300 text-[11px] font-bold uppercase tracking-widest mb-1">Administración</p>
          <h2 className="text-white text-2xl font-bold">Gestión de usuarios y cajas</h2>
          <div className="flex gap-6 mt-2">
            <p className="text-blue-200 text-sm">{totalUsuarios} usuario{totalUsuarios !== 1 ? 's' : ''}</p>
            <p className="text-blue-200 text-sm">{totalCajas} caja{totalCajas !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <main className="max-w-6xl mx-auto px-4 -mt-4 pb-12 space-y-8">

        {/* ══ SECCIÓN: USUARIOS ══════════════════════════════════════════════ */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Acceso</p>
              <h3 className="text-xl font-bold text-slate-800">Usuarios</h3>
            </div>
          </div>

          {/* Tabla de usuarios */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-4">
            {(perfiles ?? []).length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-slate-400 text-sm">No hay usuarios registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Rol</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Cajas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(perfiles as Perfil[]).map((perfil) => {
                      const cajasAsig = cajasPorUsuario.get(perfil.id) ?? []
                      return (
                        <tr key={perfil.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={perfil.nombre ?? perfil.email ?? '?'} />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{perfil.nombre ?? '—'}</p>
                                <p className="text-xs text-slate-400 truncate sm:hidden">{perfil.email ?? ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-500 hidden sm:table-cell">{perfil.email ?? '—'}</td>
                          <td className="px-5 py-4">
                            <RolSelector
                              userId={perfil.id}
                              rolActual={perfil.rol ?? 'user'}
                              esPropioUsuario={perfil.id === user.id}
                            />
                          </td>
                          <td className="px-5 py-4">
                            <AsignarCajasModal
                              usuarioId={perfil.id}
                              usuarioNombre={perfil.nombre ?? perfil.email ?? '?'}
                              todasLasCajas={cajasParaModal}
                              cajasAsignadas={cajasAsig}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Invitar nuevo usuario */}
          <InvitarForm />
        </section>

        {/* ══ SECCIÓN: CAJAS ════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Finanzas</p>
              <h3 className="text-xl font-bold text-slate-800">Cajas</h3>
            </div>
            <CrearCajaModal />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {cajas.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-slate-400 text-sm">No hay cajas creadas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Caja</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Saldo ARS</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Saldo USD</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuarios</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {cajas.map((caja) => {
                      const usuariosAsig = usuariosPorCaja.get(caja.id) ?? []
                      const esPersonal = caja.tipo === 'personal'
                      return (
                        <tr key={caja.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-8 rounded-full flex-shrink-0 ${esPersonal ? 'bg-blue-500' : 'bg-teal-500'}`} />
                              <div>
                                <p className="font-semibold text-slate-800">{caja.nombre}</p>
                                {caja.nombre_titular && (
                                  <p className="text-xs text-slate-400">{caja.nombre_titular}</p>
                                )}
                                {caja.visibilidad === 'admin' && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold">Solo admin</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ring-1 ${esPersonal ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-teal-50 text-teal-700 ring-teal-200'}`}>
                              {esPersonal ? 'Personal' : 'Comunitaria'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-700 tabular-nums hidden sm:table-cell">
                            {formatMonto(caja.saldo_ars, 'ARS')}
                          </td>
                          <td className="px-5 py-4 text-slate-700 tabular-nums hidden sm:table-cell">
                            {formatMonto(caja.saldo_usd, 'USD')}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs text-slate-500">
                              {usuariosAsig.length === 0
                                ? <span className="text-slate-300">sin asignar</span>
                                : `${usuariosAsig.length} usuario${usuariosAsig.length !== 1 ? 's' : ''}`}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <EditarCajaModal caja={caja} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ══ SECCIÓN: LISTA DE ACCESO ══════════════════════════════════════ */}
        <section>
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Control</p>
            <h3 className="text-xl font-bold text-slate-800">Lista de acceso</h3>
            <p className="mt-1 text-slate-500 text-sm">Emails habilitados para ingresar a la aplicación.</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {(permisos ?? []).length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 text-sm">No hay emails autorizados.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(permisos ?? []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.activo ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      <div>
                        <p className="text-sm text-slate-700 font-medium">{p.email}</p>
                        {p.nombre && <p className="text-xs text-slate-400">{p.nombre}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.rol === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-slate-50 text-slate-500'}`}>
                        {p.rol === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </div>
                    <form action={eliminarPermiso}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-red-200"
                      >
                        Revocar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
