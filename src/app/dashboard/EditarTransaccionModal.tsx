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
  categoria_id: string | null
  cajaNombre: string | null
  cajaTipo: string | null
}

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

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('ingreso')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              tipo === 'ingreso'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ingreso
          </button>
          <button
            type="button"
            onClick={() => setTipo('egreso')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              tipo === 'egreso'
                ? 'bg-red-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Egreso
          </button>
        </div>
        <input type="hidden" name="tipo" value={tipo} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
        <select
          name="categoria_id"
          defaultValue={transaccion.categoria_id ?? ''}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Sin categoría</option>
          {categoriasFiltradas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
        <input
          type="number"
          name="monto"
          step="0.01"
          min="0.01"
          required
          defaultValue={transaccion.monto}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Descripción <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          name="descripcion"
          defaultValue={transaccion.descripcion ?? ''}
          placeholder="Ej: Diezmo de julio"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors cursor-pointer"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Editar transacción</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {transaccion.cajaNombre && (
                <p className="text-sm text-slate-500">Caja: {transaccion.cajaNombre}</p>
              )}
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                {transaccion.moneda}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>
        <EditarForm
          transaccion={transaccion}
          categorias={categorias}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  )
}
