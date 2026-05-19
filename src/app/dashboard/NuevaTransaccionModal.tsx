'use client'

import { useActionState, useEffect, useState } from 'react'
import { crearTransaccion, type TransaccionState } from './actions'

type Caja = { id: string; nombre: string }
type Categoria = { id: string; nombre: string; tipo?: string | null }

// Desmonta en cada apertura → useActionState siempre arranca limpio
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

  const today = new Date().toISOString().split('T')[0]

  const categoriasFiltradas = categorias.filter(
    (c) => !c.tipo || c.tipo === tipo
  )

  useEffect(() => {
    if (state.success) onClose()
  }, [state.success, onClose])

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Caja
          </label>
          <select
            name="caja_id"
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Fecha
          </label>
          <input
            type="date"
            name="fecha"
            defaultValue={today}
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Tipo
        </label>
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
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Categoría
        </label>
        <select
          name="categoria_id"
          required
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Seleccioná una categoría</option>
          {categoriasFiltradas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Monto
        </label>
        <input
          type="number"
          name="monto"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Descripción{' '}
          <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          name="descripcion"
          placeholder="Ej: Diezmo de julio"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nota <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <textarea
          name="nota_libre"
          rows={2}
          placeholder="Nota adicional..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
      <button
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm"
      >
        + Nueva transacción
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                Nueva transacción
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* TransaccionForm desmonta cuando open=false, reseteando el estado del action */}
            <TransaccionForm
              cajas={cajas}
              categorias={categorias}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
