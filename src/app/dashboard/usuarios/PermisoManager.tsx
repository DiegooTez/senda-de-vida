'use client'

import { useActionState } from 'react'
import { agregarPermiso, eliminarPermiso } from './actions'

type Permiso = { id: string; email: string }
type AgregarState = { error?: string; success?: boolean }

export function PermisoManager({ permisos }: { permisos: Permiso[] }) {
  const [state, addAction, pending] = useActionState<AgregarState, FormData>(
    agregarPermiso,
    {}
  )

  return (
    <div className="space-y-3">
      <form action={addAction} className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="correo@ejemplo.com"
          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
        >
          {pending ? 'Agregando...' : '+ Agregar'}
        </button>
      </form>

      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          Email agregado correctamente.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {permisos.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">No hay emails autorizados todavía.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {permisos.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-slate-700">{p.email}</span>
                <form action={eliminarPermiso}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-red-200"
                  >
                    Eliminar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
