'use client'

import { useActionState, useEffect, useState } from 'react'
import { crearTransaccion, type TransaccionState } from './actions'

type Caja = {
  id: string
  nombre: string
  tipo: string
  moneda: 'ARS' | 'USD' | 'AMBAS'
}

type Categoria = {
  id: string
  nombre: string
  tipo?: string | null
  caja_tipo?: string | null
}

function TransaccionForm({
  cajas,
  categorias,
  onClose,
}: {
  cajas: Caja[]
  categorias: Categoria[]
  onClose: () => void
}) {
  const [state, action, pending] = useActionState<TransaccionState, FormData>(
    crearTransaccion,
    {}
  )
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [cajaId, setCajaId] = useState<string>(cajas[0]?.id ?? '')
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS')

  const today = new Date().toISOString().split('T')[0]

  const cajaSeleccionada = cajas.find((c) => c.id === cajaId)
  const monedaEfectiva: 'ARS' | 'USD' =
    cajaSeleccionada?.moneda === 'AMBAS'
      ? moneda
      : ((cajaSeleccionada?.moneda as 'ARS' | 'USD' | undefined) ?? 'ARS')

  const categoriasFiltradas = categorias.filter(
    (c) =>
      (!c.tipo || c.tipo === tipo) &&
      (!c.caja_tipo || c.caja_tipo === cajaSeleccionada?.tipo)
  )

  useEffect(() => {
    if (state.success) onClose()
  }, [state.success, onClose])

  const inputClass =
    'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all text-sm'

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      <input type="hidden" name="moneda" value={monedaEfectiva} />

      {/* Tipo: Ingreso / Egreso */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Tipo de movimiento
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('ingreso')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tipo === 'ingreso'
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V13a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z"
                clipRule="evenodd"
              />
            </svg>
            Ingreso
          </button>
          <button
            type="button"
            onClick={() => setTipo('egreso')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tipo === 'egreso'
                ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L9 13.586V7a1 1 0 112 0v6.586l1.293-1.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17z"
                clipRule="evenodd"
              />
            </svg>
            Egreso
          </button>
        </div>
        <input type="hidden" name="tipo" value={tipo} />
      </div>

      {/* Caja y Fecha */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Caja
          </label>
          <select
            name="caja_id"
            required
            value={cajaId}
            onChange={(e) => setCajaId(e.target.value)}
            className={inputClass}
          >
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Fecha
          </label>
          <input
            type="date"
            name="fecha"
            defaultValue={today}
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* Moneda (solo si AMBAS) */}
      {cajaSeleccionada?.moneda === 'AMBAS' && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Moneda
          </label>
          <div className="flex gap-2">
            {(['ARS', 'USD'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMoneda(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  moneda === m
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m} {m === 'ARS' ? '$' : 'USD'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categoría */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Categoría
        </label>
        <select name="categoria_id" className={inputClass}>
          <option value="">Sin categoría</option>
          {categoriasFiltradas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Monto */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Monto {monedaEfectiva === 'ARS' ? '(ARS)' : '(USD)'}
        </label>
        <input
          type="number"
          name="monto"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className={inputClass}
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Descripción{' '}
          <span className="text-slate-400 normal-case font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          name="descripcion"
          placeholder="Ej: Diezmo de julio"
          className={inputClass}
        />
      </div>

      {/* Nota */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Nota{' '}
          <span className="text-slate-400 normal-case font-normal">(opcional)</span>
        </label>
        <textarea
          name="descripcion_custom"
          rows={2}
          placeholder="Nota adicional..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors cursor-pointer text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className={`flex-1 py-3 rounded-xl font-semibold text-white transition-colors cursor-pointer text-sm ${
            tipo === 'ingreso'
              ? 'bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60'
              : 'bg-red-500 hover:bg-red-600 disabled:opacity-60'
          }`}
        >
          {pending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

export function NuevaTransaccionModal({
  cajas,
  categorias,
}: {
  cajas: Caja[]
  categorias: Categoria[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── FAB ────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Nueva transacción"
        className="fixed bottom-6 right-5 z-40 flex items-center gap-2 bg-brand hover:bg-blue-700 active:scale-95 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all rounded-full px-4 py-3.5 sm:px-5 sm:py-3 cursor-pointer"
      >
        {/* + icon */}
        <svg
          className="w-5 h-5 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        <span className="hidden sm:inline text-sm">Nueva transacción</span>
      </button>

      {/* ── Modal / Bottom sheet ────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            className="bg-white w-full max-h-[95svh] rounded-t-3xl sm:rounded-2xl sm:max-w-lg overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl px-5 pt-4 pb-3 border-b border-slate-100 z-10">
              {/* Drag handle (solo móvil) */}
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">
                  Nueva transacción
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5">
              <TransaccionForm
                cajas={cajas}
                categorias={categorias}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
