import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NuevaTransaccionModal } from './NuevaTransaccionModal'

type Caja = {
  id: string
  nombre: string
  saldo: number
}

type Categoria = {
  id: string
  nombre: string
  tipo: string | null
}


function formatSaldo(saldo: number, nombre: string) {
  const esDolar =
    nombre.toLowerCase().includes('dólar') ||
    nombre.toLowerCase().includes('dolar') ||
    nombre.toLowerCase().includes('usd')

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: esDolar ? 'USD' : 'ARS',
    minimumFractionDigits: 2,
  }).format(saldo)
}

function formatFecha(fecha: string) {
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) redirect('/login')

  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email

  const [{ data: cajas }, { data: categorias }, { data: transacciones }] =
    await Promise.all([
      supabase.from('cajas').select('id, nombre, saldo').order('nombre'),
      supabase.from('categorias').select('id, nombre, tipo').order('nombre'),
      supabase
        .from('transacciones')
        .select('id, tipo, monto, descripcion, fecha, cajas(nombre), categorias(nombre)')
        .order('fecha', { ascending: false })
        .limit(10),
    ])

  const rows = (transacciones ?? []).map((t) => ({
    id: t.id as string,
    tipo: t.tipo as 'ingreso' | 'egreso',
    monto: t.monto as number,
    descripcion: t.descripcion as string | null,
    fecha: t.fecha as string,
    cajaNombre: (Array.isArray(t.cajas) ? t.cajas[0]?.nombre : null) as string | null,
    categoriaNombre: (Array.isArray(t.categorias) ? t.categorias[0]?.nombre : null) as string | null,
  }))

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
          <div className="flex items-center gap-2">
            <span className="text-xl">✝</span>
            <h1 className="text-xl font-bold text-slate-800">Senda de Vida</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:block">{name}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Bienvenido, {name}
          </h2>
          <p className="mt-1 text-slate-500 text-sm">Panel de administración</p>
        </div>

        {/* Cajas */}
        <section>
          <h3 className="text-base font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Cajas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(cajas ?? []).map((caja: Caja) => (
              <div
                key={caja.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-500">{caja.nombre}</p>
                <p className="mt-2 text-3xl font-bold text-slate-800 tabular-nums">
                  {formatSaldo(Number(caja.saldo), caja.nombre)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Acciones */}
        <div className="flex justify-end">
          <NuevaTransaccionModal
            cajas={cajas ?? []}
            categorias={(categorias ?? []) as Categoria[]}
          />
        </div>

        {/* Historial */}
        <section>
          <h3 className="text-base font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Últimas transacciones
          </h3>

          {rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <p className="text-slate-400 text-sm">
                Todavía no hay transacciones registradas
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        Caja
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        Categoría
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        Monto
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {formatFecha(t.fecha)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {t.cajaNombre ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {t.categoriaNombre ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              t.tipo === 'ingreso'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                            t.tipo === 'ingreso'
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}
                        >
                          {t.tipo === 'ingreso' ? '+' : '−'}
                          {new Intl.NumberFormat('es-AR', {
                            minimumFractionDigits: 2,
                          }).format(t.monto)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {t.descripcion ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
