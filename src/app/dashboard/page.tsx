import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NuevaTransaccionModal } from './NuevaTransaccionModal'
import { TransaccionesHistorial } from './TransaccionesHistorial'

type Caja = {
  id: string
  nombre: string
  tipo: 'personal' | 'comunitaria'
  moneda: 'ARS' | 'USD' | 'AMBAS'
  saldo_ars: number
  saldo_usd: number
}

type Categoria = {
  id: string
  nombre: string
  tipo: string | null
  caja_tipo: string | null
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function formatUSD(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
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

  const [{ data: perfilActual }, { data: accesosRaw }, { data: categoriasRaw }, { data: transaccionesRaw }] =
    await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase
        .from('caja_accesos')
        .select('cajas(id, nombre, tipo, moneda, saldo_ars, saldo_usd)')
        .eq('user_id', user.id),
      supabase
        .from('categorias_transaccion')
        .select('id, nombre, tipo, caja_tipo')
        .order('nombre'),
      supabase
        .from('transacciones')
        .select(
          'id, tipo, moneda, monto, descripcion, fecha, caja_id, categoria_id, cajas(nombre), categorias_transaccion(nombre)'
        )
        .order('fecha', { ascending: false }),
    ])

  const esAdmin = perfilActual?.role === 'admin'

  const cajas: Caja[] = (accesosRaw ?? [])
    .map((a) => {
      const c = Array.isArray(a.cajas) ? a.cajas[0] : a.cajas
      if (!c) return null
      return {
        id: c.id as string,
        nombre: c.nombre as string,
        tipo: c.tipo as 'personal' | 'comunitaria',
        moneda: c.moneda as 'ARS' | 'USD' | 'AMBAS',
        saldo_ars: Number(c.saldo_ars),
        saldo_usd: Number(c.saldo_usd),
      } satisfies Caja
    })
    .filter((c): c is Caja => c !== null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const categorias: Categoria[] = (categoriasRaw ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    tipo: c.tipo as string | null,
    caja_tipo: c.caja_tipo as string | null,
  }))

  const cajaMap = new Map(cajas.map((c) => [c.id, c]))

  const rows = (transaccionesRaw ?? []).map((t) => ({
    id: t.id as string,
    tipo: t.tipo as 'ingreso' | 'egreso',
    moneda: t.moneda as 'ARS' | 'USD',
    monto: t.monto as number,
    descripcion: t.descripcion as string | null,
    fecha: t.fecha as string,
    caja_id: t.caja_id as string,
    categoria_id: t.categoria_id as string | null,
    cajaNombre: (Array.isArray(t.cajas) ? t.cajas[0]?.nombre : null) as string | null,
    cajaTipo: (cajaMap.get(t.caja_id as string)?.tipo ?? null) as string | null,
    categoriaNombre: (
      Array.isArray(t.categorias_transaccion)
        ? t.categorias_transaccion[0]?.nombre
        : null
    ) as string | null,
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.jpeg"
                alt="Senda de Vida"
                width={32}
                height={32}
                className="rounded-lg object-contain"
              />
              <h1 className="text-xl font-bold text-slate-800">Senda de Vida</h1>
            </div>
            {esAdmin && (
              <a
                href="/dashboard/usuarios"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Usuarios
              </a>
            )}
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
          <h2 className="text-2xl font-bold text-slate-800">Bienvenido, {name}</h2>
          <p className="mt-1 text-slate-500 text-sm">Panel de administración</p>
        </div>

        {/* Cajas */}
        <section>
          <h3 className="text-base font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Cajas
          </h3>
          {cajas.length === 0 ? (
            <p className="text-slate-400 text-sm">No tenés acceso a ninguna caja.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cajas.map((caja) => (
                <div
                  key={caja.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-500">{caja.nombre}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        caja.tipo === 'comunitaria'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {caja.tipo === 'comunitaria' ? 'Comunitaria' : 'Personal'}
                    </span>
                  </div>

                  {(caja.moneda === 'ARS' || caja.moneda === 'AMBAS') && (
                    <div className={caja.moneda === 'AMBAS' ? 'mb-3' : ''}>
                      {caja.moneda === 'AMBAS' && (
                        <p className="text-xs text-slate-400 mb-0.5">ARS</p>
                      )}
                      <p className="text-3xl font-bold text-slate-800 tabular-nums">
                        {formatARS(caja.saldo_ars)}
                      </p>
                    </div>
                  )}

                  {(caja.moneda === 'USD' || caja.moneda === 'AMBAS') && (
                    <div>
                      {caja.moneda === 'AMBAS' && (
                        <p className="text-xs text-slate-400 mb-0.5">USD</p>
                      )}
                      <p
                        className={`${caja.moneda === 'AMBAS' ? 'text-xl' : 'text-3xl'} font-bold text-slate-800 tabular-nums`}
                      >
                        {formatUSD(caja.saldo_usd)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Acciones */}
        <div className="flex justify-end">
          <NuevaTransaccionModal cajas={cajas} categorias={categorias} />
        </div>

        <TransaccionesHistorial
          rows={rows}
          cajas={cajas}
          categorias={categorias}
          esAdmin={esAdmin}
        />
      </main>
    </div>
  )
}
