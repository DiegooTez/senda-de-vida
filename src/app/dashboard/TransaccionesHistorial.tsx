'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditarTransaccionModal } from './EditarTransaccionModal'

type Caja = { id: string; nombre: string }
type Categoria = { id: string; nombre: string; tipo?: string | null; caja_tipo?: string | null }

type Row = {
  id: string
  tipo: 'ingreso' | 'egreso'
  moneda: 'ARS' | 'USD'
  monto: number
  descripcion: string | null
  descripcion_custom: string | null
  fecha: string
  caja_id: string
  categoria_id: string | null
  cajaNombre: string | null
  cajaTipo: string | null
  categoriaNombre: string | null
}

function formatFecha(fecha: string) {
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function formatFechaCorta(fecha: string) {
  const [, month, day] = fecha.split('-')
  return `${day}/${month}`
}

function formatMonto(monto: number, moneda: 'ARS' | 'USD') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto)
}

/* ── Íconos de flecha ─────────────────────────────────────── */
function IconIngreso() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V13a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z"
        clipRule="evenodd"
      />
    </svg>
  )
}
function IconEgreso() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L9 13.586V7a1 1 0 112 0v6.586l1.293-1.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17z"
        clipRule="evenodd"
      />
    </svg>
  )
}
function IconEditar() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}

const selectClass =
  'text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer'

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

  const rowsFiltradas = rows.filter((r) => {
    if (filtroCaja !== 'all' && r.caja_id !== filtroCaja) return false
    if (filtroTipo !== 'all' && r.tipo !== filtroTipo) return false
    if (filtroMoneda !== 'all' && r.moneda !== filtroMoneda) return false
    return true
  })

  return (
    <section>
      {/* ── Encabezado y filtros ───────────────────────────── */}
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Movimientos
          </h3>
          {rowsFiltradas.length > 0 && (
            <span className="text-xs text-slate-400">{rowsFiltradas.length} registros</span>
          )}
        </div>

        {/* Filtros móvil: selects compactos */}
        <div className="flex gap-2 sm:hidden">
          <select
            value={filtroCaja}
            onChange={(e) => setFiltroCaja(e.target.value)}
            className={`flex-1 ${selectClass}`}
          >
            <option value="all">Todas las cajas</option>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className={selectClass}
          >
            <option value="all">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>
          <select
            value={filtroMoneda}
            onChange={(e) => setFiltroMoneda(e.target.value)}
            className={selectClass}
          >
            <option value="all">$</option>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </div>

        {/* Filtros desktop: pill buttons */}
        <div className="hidden sm:flex flex-wrap gap-2">
          {/* Caja */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
            <span className="text-xs text-slate-400 mr-1">Caja:</span>
            {[{ value: 'all', label: 'Todas' }, ...cajas.map((c) => ({ value: c.id, label: c.nombre }))].map(
              ({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFiltroCaja(value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    filtroCaja === value
                      ? 'bg-navy text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          {/* Tipo */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
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
                    ? 'bg-navy text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Moneda */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
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
                    ? 'bg-navy text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sin resultados ────────────────────────────────── */}
      {rowsFiltradas.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-14 text-center shadow-sm">
          <p className="text-slate-400 text-sm">
            No hay movimientos para los filtros seleccionados.
          </p>
        </div>
      )}

      {/* ── Vista MÓVIL: lista de cards ───────────────────── */}
      {rowsFiltradas.length > 0 && (
        <div className="space-y-2 sm:hidden">
          {rowsFiltradas.map((t) => {
            const esIngreso = t.tipo === 'ingreso'
            const titulo = t.descripcion ?? t.categoriaNombre ?? 'Sin descripción'
            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3"
              >
                {/* Ícono */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    esIngreso
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-red-100 text-red-500'
                  }`}
                >
                  {esIngreso ? <IconIngreso /> : <IconEgreso />}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800 text-sm truncate leading-snug">
                      {titulo}
                    </p>
                    <p
                      className={`font-bold text-sm tabular-nums shrink-0 ${
                        esIngreso ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {esIngreso ? '+' : '−'}
                      {formatMonto(t.monto, t.moneda)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {t.cajaNombre && (
                      <span className="text-xs text-slate-400">{t.cajaNombre}</span>
                    )}
                    {t.categoriaNombre && t.descripcion && (
                      <>
                        <span className="text-slate-300 text-xs">·</span>
                        <span className="text-xs text-slate-400">{t.categoriaNombre}</span>
                      </>
                    )}
                    <span className="text-slate-300 text-xs">·</span>
                    <span className="text-xs text-slate-400">{formatFechaCorta(t.fecha)}</span>
                  </div>

                  {t.descripcion_custom && (
                    <p className="text-xs text-slate-400 italic mt-0.5 truncate">
                      {t.descripcion_custom}
                    </p>
                  )}
                </div>

                {/* Editar (admin) */}
                {esAdmin && (
                  <button
                    onClick={() => setEditando(t)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0"
                    aria-label="Editar"
                  >
                    <IconEditar />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Vista DESKTOP: tabla ─────────────────────────── */}
      {rowsFiltradas.length > 0 && (
        <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    Caja
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    Descripción
                  </th>
                  {esAdmin && <th className="px-4 py-3 w-16" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rowsFiltradas.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {formatFecha(t.fecha)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-sm">{t.cajaNombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{t.categoriaNombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.tipo === 'ingreso'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {t.tipo === 'ingreso' ? <IconIngreso /> : <IconEgreso />}
                        {t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap ${
                        t.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {t.tipo === 'ingreso' ? '+' : '−'}
                      {formatMonto(t.monto, t.moneda)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs text-sm">
                      {t.descripcion && (
                        <div className="truncate">{t.descripcion}</div>
                      )}
                      {t.descripcion_custom && (
                        <div className="text-xs text-slate-400 truncate mt-0.5 italic">
                          {t.descripcion_custom}
                        </div>
                      )}
                      {!t.descripcion && !t.descripcion_custom && (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    {esAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditando(t)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
                        >
                          <IconEditar />
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal edición ─────────────────────────────────── */}
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
