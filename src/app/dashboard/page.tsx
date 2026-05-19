import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NuevaTransaccionModal } from './NuevaTransaccionModal'
import { TransaccionesHistorial } from './TransaccionesHistorial'

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

  const [{ data: perfilActual }, { data: cajas }, { data: categorias }, { data: transacciones }] =
    await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('cajas').select('id, nombre, saldo').order('nombre'),
      supabase.from('categorias').select('id, nombre, tipo').order('nombre'),
      supabase
        .from('transacciones')
        .select('id, tipo, monto, descripcion, fecha, caja_id, categoria_id, cajas(nombre), categorias(nombre)')
        .order('fecha', { ascending: false }),
    ])

  const esAdmin = perfilActual?.role === 'admin'

  const rows = (transacciones ?? []).map((t) => ({
    id: t.id as string,
    tipo: t.tipo as 'ingreso' | 'egreso',
    monto: t.monto as number,
    descripcion: t.descripcion as string | null,
    fecha: t.fecha as string,
    caja_id: t.caja_id as string,
    categoria_id: t.categoria_id as string | null,
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

        <TransaccionesHistorial
          rows={rows}
          cajas={cajas ?? []}
          categorias={(categorias ?? []) as Categoria[]}
          esAdmin={esAdmin}
        />
      </main>
    </div>
  )
}
