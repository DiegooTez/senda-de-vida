'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditarTransaccionModal } from './EditarTransaccionModal'
import { eliminarTransaccion, type EliminarTransaccionState } from './actions'

type Caja = { id: string; nombre: string }
type Categoria = { id: string; nombre: string; tipo?: string | null; caja_tipo?: string | null }

type Row = {
  id: string
  tipo: 'ingreso' | 'egreso'
  moneda: 'ARS' | 'USD'
  monto: number
  descripcion: string | null
  fecha: string
  caja_id: string
  categoria_id: string | null
  cajaNombre: string | null
  cajaTipo: string | null
  categoriaNombre: string | null
}

function EliminarForm({
  transaccionId,
  onCancel,
}: {
  transaccionId: string
  onCancel: () => void
}) {
  const [state, action, pending] = useActionState<EliminarTransaccionState, FormData>(
    eliminarTransaccion,
    {}
  )
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {state.error ? (
        <span className="text-xs text-red-500">{state.error}</span>
      ) : (
        <span className="text-xs text-slate-500">¿Eliminar?</span>
      )}
      <form action={action}>
        <input type="hidden" name="transaccion_id" value={transaccionId} />
        <button
          type="submit"
          disabled={pending}
          className="px-2.5 py-1 text-xs bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg transition-colors cursor-pointer font-medium"
        >
          {pending ? '...' : 'Sí'}
        </button>
      </form>
      <button
        onClick={onCancel}
        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
      >
        No
      </button>
    </div>
  )
}

function formatFecha(fecha: string) {
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function formatMonto(monto: number, moneda: 'ARS' | 'USD') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto)
}

export function TransaccionesHistorial({
  rows,
  cajas,
  categorias,
  esAdmin,
}: {
  rows: Row[]
  cajas: Caja[]
  categorias: Categoria[]
  esAdmin: boolean
}) {
  const router = useRouter()
  const [filtroCaja, setFiltroCaja] = useState<string>('all')
  const [filtroTipo, setFiltroTipo] = useState<string>('all')
  const [filtroMoneda, setFiltroMoneda] = useState<string>('all')
  const [editando, setEditando] = useState<Row | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  const rowsFiltradas = rows.filter((r) => {
    if (filtroCaja !== 'all' && r.caja_id !== filtroCaja) return false
    if (filtroTipo !== 'all' && r.tipo !== filtroTipo) return false
    if (filtroMoneda !== 'all' && r.moneda !== filtroMoneda) return false
    return true
  })

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-slate-500 uppercase tracking-wide">
          Transacciones
        </h3>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
            <span className="text-xs text-slate-400 mr-1">Caja:</span>
            <button
              onClick={() => setFiltroCaja('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filtroCaja === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas
            </button>
            {cajas.map((c) => (
              <button
                key={c.id}
                onClick={() => setFiltroCaja(c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filtroCaja === c.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
            <span className="text-xs text-slate-400 mr-1">Tipo:</span>
            {(
              [
                { value: 'all', label: 'Todos' },
                { value: 'ingreso', label: 'Ingresos' },
                { value: 'egreso', label: 'Egresos' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFiltroTipo(value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filtroTipo === value
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
            <span className="text-xs text-slate-400 mr-1">Moneda:</span>
            {(
              [
                { value: 'all', label: 'Todas' },
                { value: 'ARS', label: 'ARS' },
                { value: 'USD', label: 'USD' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFiltroMoneda(value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filtroMoneda === value
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rowsFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <p className="text-slate-400 text-sm">
            No hay transacciones para los filtros seleccionados
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
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Caja</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Categoría</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Monto</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Descripción</th>
                  {esAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {rowsFiltradas.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatFecha(t.fecha)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.cajaNombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{t.categoriaNombre ?? '—'}</td>
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
                        t.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {t.tipo === 'ingreso' ? '+' : '−'}
                      {formatMonto(t.monto, t.moneda)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {t.descripcion ?? '—'}
                    </td>
                    {esAdmin && (
                      <td className="px-4 py-3">
                        {confirmandoId === t.id ? (
                          <EliminarForm
                            transaccionId={t.id}
                            onCancel={() => setConfirmandoId(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditando(t)}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmandoId(t.id)}
                              className="px-2.5 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-red-200"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editando && (
        <EditarTransaccionModal
          key={editando.id}
          transaccion={editando}
          categorias={categorias}
          onClose={() => setEditando(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </section>
  )
}
