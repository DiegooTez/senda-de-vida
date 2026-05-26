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
  visibilidad: string
  nombre_titular: string | null
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
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 hover:shadow-md transition-shadow overflow-hidden ${
        esPersonal ? 'border-l-blue-600' : 'border-l-teal-600'
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Cabecera de la tarjeta */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate leading-snug">
              {caja.nombre}
            </h4>
            {caja.nombre_titular && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{caja.nombre_titular}</p>
            )}
          </div>
          <span
            className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-semibold ring-1 ${
              esPersonal
                ? 'bg-blue-50 text-blue-700 ring-blue-200'
                : 'bg-teal-50 text-teal-700 ring-teal-200'
            }`}
          >
            {esPersonal ? 'Personal' : 'Comunitaria'}
          </span>
        </div>

        {/* Saldos */}
        {caja.moneda === 'AMBAS' ? (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Pesos
              </p>
              <p className="text-base font-bold text-slate-900 tabular-nums leading-tight">
                {formatARS(caja.saldo_ars)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Dólares
              </p>
              <p className="text-base font-bold text-slate-900 tabular-nums leading-tight">
                {formatUSD(caja.saldo_usd)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              {caja.moneda === 'ARS' ? 'Saldo en pesos' : 'Saldo en dólares'}
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
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

  const firstName = (name as string)?.split(' ')[0] ?? name

  const [
    { data: perfilActual },
    { data: cajasRaw },
    { data: categoriasRaw },
    { data: transaccionesRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('rol').eq('id', user.id).single(),
    supabase
      .from('cajas')
      .select('id, nombre, tipo, moneda, saldo_ars, saldo_usd, visibilidad, nombre_titular')
      .eq('activa', true)
      .order('nombre'),
    supabase
      .from('categorias_transaccion')
      .select('id, nombre, tipo, caja_tipo')
      .order('nombre'),
    supabase
      .from('transacciones')
      .select(
        'id, tipo, moneda, monto, descripcion, descripcion_custom, fecha, caja_id, categoria_id, cajas(nombre), categorias_transaccion(nombre)'
      )
      .order('fecha', { ascending: false }),
  ])

  const esAdmin = perfilActual?.rol === 'admin'

  const cajas: Caja[] = (cajasRaw ?? [])
    .map((c) => ({
      id: c.id as string,
      nombre: c.nombre as string,
      tipo: c.tipo as 'personal' | 'comunitaria',
      moneda: c.moneda as 'ARS' | 'USD' | 'AMBAS',
      saldo_ars: Number(c.saldo_ars),
      saldo_usd: Number(c.saldo_usd),
      visibilidad: c.visibilidad as string,
      nombre_titular: c.nombre_titular as string | null,
    }))
    .sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'personal' ? -1 : 1
      return a.nombre.localeCompare(b.nombre)
    })

  const cajasPersonales = cajas.filter((c) => c.tipo === 'personal')
  const cajasComunitarias = cajas.filter((c) => c.tipo === 'comunitaria')

  // Totales generales
  const totalARS = cajas.reduce((sum, c) => sum + c.saldo_ars, 0)
  const totalUSD = cajas.reduce((sum, c) => sum + c.saldo_usd, 0)

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
    descripcion_custom: t.descripcion_custom as string | null,
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

  // Saludo según hora
  const hora = new Date().getHours()
  const saludo =
    hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  // Fecha en español
  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Header + Hero (navy gradient) ─────────────────── */}
      <div className="bg-gradient-to-br from-navy-dark via-navy to-navy-mid">
        {/* Header */}
        <header className="max-w-5xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
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
            {esAdmin && (
              <a
                href="/dashboard/usuarios"
                className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors hidden sm:block"
              >
                Usuarios
              </a>
            )}
            <span className="text-blue-200 text-sm px-2 hidden sm:block">{name}</span>
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

        {/* Hero: balance total */}
        <div className="max-w-5xl mx-auto px-4 pt-3 pb-10">
          <p className="text-blue-200 text-sm mb-3 capitalize">
            {saludo}, <span className="text-white font-medium">{firstName}</span>
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <p className="text-blue-300 text-[11px] font-bold uppercase tracking-widest mb-1">
                Balance general
              </p>
              <p className="text-white text-3xl sm:text-4xl font-bold tabular-nums leading-none">
                {formatARS(totalARS)}
              </p>
              {totalUSD > 0 && (
                <p className="text-blue-200 text-base font-semibold tabular-nums mt-1">
                  + {formatUSD(totalUSD)}
                </p>
              )}
            </div>
            <p className="text-blue-300 text-xs capitalize">{fechaHoy}</p>
          </div>
        </div>
      </div>

      {/* ── Contenido principal ───────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 -mt-4 pb-28 space-y-6">
        {/* ── Cajas ── */}
        <section>
          {cajas.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-10 text-center shadow-sm">
              <p className="text-slate-400 text-sm">No hay cajas disponibles.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cajasPersonales.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2 px-0.5">
                    Mis cuentas
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cajasPersonales.map((caja) => (
                      <CajaCard
                        key={caja.id}
                        caja={caja}
                        formatARS={formatARS}
                        formatUSD={formatUSD}
                      />
                    ))}
                  </div>
                </div>
              )}

              {cajasComunitarias.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-2 px-0.5">
                    Fondos comunitarios
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cajasComunitarias.map((caja) => (
                      <CajaCard
                        key={caja.id}
                        caja={caja}
                        formatARS={formatARS}
                        formatUSD={formatUSD}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Historial de transacciones ── */}
        <TransaccionesHistorial
          rows={rows}
          cajas={cajas}
          categorias={categorias}
          esAdmin={esAdmin}
        />
      </main>

      {/* ── FAB: Nueva transacción ─────────────────────────── */}
      <NuevaTransaccionModal cajas={cajas} categorias={categorias} />
    </div>
  )
}
