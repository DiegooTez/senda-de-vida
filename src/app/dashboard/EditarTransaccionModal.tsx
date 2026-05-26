'use client'

import { useActionState, useEffect, useState } from 'react'
import { editarTransaccion, type EditarTransaccionState } from './actions'

type Categoria = { id: string; nombre: string; tipo?: string | null; caja_tipo?: string | null }

type Transaccion = {
  id: string
  tipo: 'ingreso' | 'egreso'
  moneda: 'ARS' | 'USD'
  monto: number
  descripcion: string | null
  descripcion_custom: string | null
  fecha: string
  categoria_id: string | null
  cajaNombre: string | null
  cajaTipo: string | null
}

const inputClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all text-sm'

function EditarForm({
  transaccion,
  categorias,
  onClose,
  onSuccess,
}: {
  transaccion: Transaccion
  categorias: Categoria[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [state, action, pending] = useActionState<EditarTransaccionState, FormData>(
    editarTransaccion,
    {}
  )
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>(transaccion.tipo)

  const categoriasFiltradas = categorias.filter(
    (c) =>
      (!c.tipo || c.tipo === tipo) &&
      (!c.caja_tipo || c.caja_tipo === transaccion.cajaTipo)
  )

  useEffect(() => {
    if (state.success) {
      onSuccess()
      onClose()
    }
  }, [state.success, onSuccess, onClose])

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="transaccion_id" value={transaccion.id} />

      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      {/* Tipo */}
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
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V13a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z" clipRule="evenodd" />
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
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L9 13.586V7a1 1 0 112 0v6.586l1.293-1.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17z" clipRule="evenodd" />
            </svg>
            Egreso
          </button>
        </div>
        <input type="hidden" name="tipo" value={tipo} />
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Categoría
        </label>
        <select
          name="categoria_id"
          defaultValue={transaccion.categoria_id ?? ''}
          className={inputClass}
        >
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
          Monto ({transaccion.moneda})
        </label>
        <input
          type="number"
          name="monto"
          step="0.01"
          min="0.01"
          required
          defaultValue={transaccion.monto}
          className={inputClass}
        />
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Fecha
        </label>
        <input
          type="date"
          name="fecha"
          required
          defaultValue={transaccion.fecha}
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
          defaultValue={transaccion.descripcion ?? ''}
          placeholder="Ej: Diezmo de julio"
          className={inputClass}
        />
      </div>

      {/* Nota guardada (solo lectura) */}
      {transaccion.descripcion_custom && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
            Nota guardada
          </p>
          <p className="text-sm text-slate-600">{transaccion.descripcion_custom}</p>
        </div>
      )}

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
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors cursor-pointer text-sm"
        >
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

export function EditarTransaccionModal({
  transaccion,
  categorias,
  onClose,
  onSuccess,
}: {
  transaccion: Transaccion
  categorias: Categoria[]
  onClose: () => void
  onSuccess: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white w-full max-h-[95svh] rounded-t-3xl sm:rounded-2xl sm:max-w-lg overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl px-5 pt-4 pb-3 border-b border-slate-100 z-10">
          {/* Drag handle (móvil) */}
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Editar movimiento</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {transaccion.cajaNombre && (
                  <span className="text-xs text-slate-500">{transaccion.cajaNombre}</span>
                )}
                <span className="text-[11px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                  {transaccion.moneda}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-xl leading-none flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5">
          <EditarForm
            transaccion={transaccion}
            categorias={categorias}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  )
}
