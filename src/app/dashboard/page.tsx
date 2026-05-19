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

function CajaCard({
  caja,
  formatARS,
  formatUSD,
}: {
  caja: Caja
  formatARS: (n: number) => string
  formatUSD: (n: number) => string
}) {
  const esPersonal = caja.tipo === 'personal'
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Barra de color superior */}
      <div className={`h-1.5 ${esPersonal ? 'bg-violet-400' : 'bg-blue-400'}`} />

      <div className="p-5">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <h4 className="text-xl font-bold text-slate-800 leading-snug">{caja.nombre}</h4>
          <span
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ring-1 ${
              esPersonal
                ? 'bg-violet-50 text-violet-700 ring-violet-200'
                : 'bg-blue-50 text-blue-700 ring-blue-200'
            }`}
          >
            {esPersonal ? 'Personal' : 'Comunitaria'}
          </span>
        </div>

        {/* Saldos */}
        {caja.moneda === 'AMBAS' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Pesos
              </p>
              <p className="text-lg font-bold text-slate-800 tabular-nums leading-tight">
                {formatARS(caja.saldo_ars)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Dólares
              </p>
              <p className="text-lg font-bold text-slate-800 tabular-nums leading-tight">
                {formatUSD(caja.saldo_usd)}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {caja.moneda === 'ARS' ? 'Pesos' : 'Dólares'}
            </p>
            <p className="text-3xl font-bold text-slate-800 tabular-nums">
              {caja.moneda === 'ARS' ? formatARS(caja.saldo_ars) : formatUSD(caja.saldo_usd)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
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
        .is('eliminado_en', null)
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
    .sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'personal' ? -1 : 1
      return a.nombre.localeCompare(b.nombre)
    })

  const categorias: Categoria[] = (categoriasRaw ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    tipo: c.tipo as string | null,
    caja_tipo: c.caja_tipo as string | null,
  }))

  const cajasPersonales = cajas.filter((c) => c.tipo === 'personal')
  const cajasComunitarias = cajas.filter((c) => c.tipo === 'comunitaria')
  const tieneAmbos = cajasPersonales.length > 0 && cajasComunitarias.length > 0

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
          <h3 className="text-base font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Cajas
          </h3>

          {cajas.length === 0 ? (
            <p className="text-slate-400 text-sm">No tenés acceso a ninguna caja.</p>
          ) : (
            <div className="space-y-6">
              {cajasPersonales.length > 0 && (
                <div>
                  {tieneAmbos && (
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-3">
                      Mis cajas
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cajasPersonales.map((caja) => (
                      <CajaCard key={caja.id} caja={caja} formatARS={formatARS} formatUSD={formatUSD} />
                    ))}
                  </div>
                </div>
              )}

              {cajasComunitarias.length > 0 && (
                <div>
                  {tieneAmbos && (
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
                      Cajas comunitarias
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cajasComunitarias.map((caja) => (
                      <CajaCard key={caja.id} caja={caja} formatARS={formatARS} formatUSD={formatUSD} />
                    ))}
                  </div>
                </div>
              )}
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
