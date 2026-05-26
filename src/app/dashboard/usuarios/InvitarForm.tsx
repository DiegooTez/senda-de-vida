'use client'

import { useActionState, useState } from 'react'
import { invitarUsuario } from './actions'

type State = { error?: string; success?: boolean }

export function InvitarForm() {
  const [state, action, pending] = useActionState<State, FormData>(invitarUsuario, {})
  const [rol, setRol] = useState('user')

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">
        Invitar nuevo usuario
      </h3>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
          ✓ Invitación enviada correctamente.
        </div>
      )}

      <form action={action} className="flex flex-col sm:flex-row gap-3">
        <input
          name="nombre"
          type="text"
          placeholder="Nombre (opcional)"
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-40"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="correo@ejemplo.com"
          className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="rol"
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="user">Usuario</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
        >
          {pending ? 'Enviando...' : 'Enviar invitación'}
        </button>
      </form>
      <p className="text-xs text-slate-400 mt-3">
        El usuario recibirá un email con un enlace para acceder. Solo puede ingresar si está en esta lista.
      </p>
    </div>
  )
}
