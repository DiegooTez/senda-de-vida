'use client'

import { useActionState, useState } from 'react'
import { crearCaja, editarCaja } from './actions'

type CajaData = {
  id: string
  nombre: string
  tipo: 'personal' | 'comunitaria'
  moneda: 'ARS' | 'USD' | 'AMBAS'
  visibilidad: string
  nombre_titular: string | null
}

type State = { error?: string; success?: boolean }

// ─── Modal crear caja ─────────────────────────────────────────────────────────
export function CrearCajaModal() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<State, FormData>(crearCaja, {})

  // Cerrar al tener éxito
  if (state.success && open) setOpen(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 bg-navy hover:bg-navy-dark text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
      >
        + Nueva caja
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-br from-navy to-brand px-6 py-4">
              <h2 className="text-white font-bold text-lg">Nueva caja</h2>
            </div>

            <form action={action} className="p-6 space-y-4">
              {state.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {state.error}
                </div>
              )}

              <CajaFields />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white rounded-xl text-sm font-semibold cursor-pointer"
                >
                  {pending ? 'Creando...' : 'Crear caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Modal editar caja ────────────────────────────────────────────────────────
export function EditarCajaModal({ caja }: { caja: CajaData }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<State, FormData>(editarCaja, {})

  if (state.success && open) setOpen(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-br from-navy to-brand px-6 py-4">
              <h2 className="text-white font-bold text-lg">Editar caja</h2>
              <p className="text-blue-200 text-sm">{caja.nombre}</p>
            </div>

            <form action={action} className="p-6 space-y-4">
              <input type="hidden" name="id" value={caja.id} />

              {state.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {state.error}
                </div>
              )}

              <CajaFields defaults={caja} />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white rounded-xl text-sm font-semibold cursor-pointer"
                >
                  {pending ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Campos compartidos ───────────────────────────────────────────────────────
function CajaFields({ defaults }: { defaults?: Partial<CajaData> }) {
  const inputClass =
    'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5'

  return (
    <>
      <div>
        <label className={labelClass}>Nombre</label>
        <input
          name="nombre"
          type="text"
          required
          defaultValue={defaults?.nombre}
          placeholder="Ej: Caja Principal"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Tipo</label>
          <select name="tipo" defaultValue={defaults?.tipo ?? 'comunitaria'} className={inputClass}>
            <option value="comunitaria">Comunitaria</option>
            <option value="personal">Personal</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Moneda</label>
          <select name="moneda" defaultValue={defaults?.moneda ?? 'AMBAS'} className={inputClass}>
            <option value="AMBAS">ARS + USD</option>
            <option value="ARS">Solo ARS</option>
            <option value="USD">Solo USD</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Titular (opcional)</label>
        <input
          name="nombre_titular"
          type="text"
          defaultValue={defaults?.nombre_titular ?? ''}
          placeholder="Nombre del titular"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Visibilidad</label>
        <select
          name="visibilidad"
          defaultValue={defaults?.visibilidad ?? 'todos'}
          className={inputClass}
        >
          <option value="todos">Todos los usuarios</option>
          <option value="admin">Solo admins</option>
        </select>
      </div>
    </>
  )
}
