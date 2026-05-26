import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ACCION_LABELS: Record<string, string> = {
  crear_transaccion: 'Nueva transacción',
  editar_transaccion: 'Editar transacción',
  solicitar_eliminacion: 'Solicitar eliminación',
  aprobar_eliminacion: 'Aprobó eliminación',
  rechazar_eliminacion: 'Rechazó eliminación',
  crear_caja: 'Crear caja',
  editar_caja: 'Editar caja',
  asignar_caja: 'Asignar caja',
  desasignar_caja: 'Desasignar caja',
  cambiar_rol: 'Cambiar rol',
  invitar_usuario: 'Invitar usuario',
  eliminar_permiso: 'Revocar acceso',
}

const ACCION_COLOR: Record<string, string> = {
  crear_transaccion: 'bg-emerald-100 text-emerald-700',
  editar_transaccion: 'bg-blue-100 text-blue-700',
  solicitar_eliminacion: 'bg-amber-100 text-amber-700',
  aprobar_eliminacion: 'bg-red-100 text-red-700',
  rechazar_eliminacion: 'bg-slate-100 text-slate-600',
  crear_caja: 'bg-purple-100 text-purple-700',
  editar_caja: 'bg-purple-100 text-purple-700',
  asignar_caja: 'bg-teal-100 text-teal-700',
  desasignar_caja: 'bg-orange-100 text-orange-700',
  cambiar_rol: 'bg-indigo-100 text-indigo-700',
  invitar_usuario: 'bg-sky-100 text-sky-700',
  eliminar_permiso: 'bg-red-100 text-red-700',
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default async function LogPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) redirect('/login')

  const { data: perfilActual } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (perfilActual?.rol !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()
  const { data: logs } = await admin
    .from('audit_log')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(200)

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-dark via-navy to-navy-mid">
        <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpeg" alt="Senda de Vida" width={36} height={36} className="rounded-lg object-contain flex-shrink-0" />
            <h1 className="text-white font-bold text-lg tracking-tight">Senda de Vida</h1>
          </div>
          <div className="flex items-center gap-1">
            <a href="/dashboard" className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">Dashboard</a>
            <a href="/dashboard/usuarios" className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">Usuarios</a>
            <a href="/dashboard/log" className="text-white text-sm px-3 py-1.5 rounded-lg bg-white/15 font-medium">Log</a>
            <form action={signOut}>
              <button type="submit" className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">Salir</button>
            </form>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 pt-1 pb-10">
          <p className="text-blue-300 text-[11px] font-bold uppercase tracking-widest mb-1">Auditoría</p>
          <h2 className="text-white text-2xl font-bold">Log de actividad</h2>
          <p className="text-blue-200 text-sm mt-1">{(logs ?? []).length} registros más recientes · Solo lectura</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 -mt-4 pb-12">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {(logs ?? []).length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No hay actividad registrada todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha y hora</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Acción</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Usuario</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(logs ?? []).map((log) => {
                    const colorClass = ACCION_COLOR[log.accion] ?? 'bg-slate-100 text-slate-600'
                    const label = ACCION_LABELS[log.accion] ?? log.accion
                    const detalle = log.detalle as Record<string, unknown> | null
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                          {formatFecha(log.fecha)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${colorClass}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <p className="text-slate-700 text-xs truncate max-w-[180px]">
                            {log.usuario_email || '—'}
                          </p>
                          {log.admin_email && log.admin_email !== log.usuario_email && (
                            <p className="text-slate-400 text-[11px] truncate max-w-[180px]">
                              admin: {log.admin_email}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          {detalle && (
                            <div className="text-xs text-slate-500 space-y-0.5">
                              {Object.entries(detalle).slice(0, 3).map(([k, v]) => (
                                <p key={k}>
                                  <span className="font-medium text-slate-600">{k}:</span>{' '}
                                  {String(v)}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
