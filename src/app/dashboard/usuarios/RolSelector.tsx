'use client'

import { useState, useTransition } from 'react'
import { cambiarRol } from './actions'

export function RolSelector({
  userId,
  rolActual,
  esPropioUsuario,
}: {
  userId: string
  rolActual: string
  esPropioUsuario: boolean
}) {
  const [rol, setRol] = useState(rolActual)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoRol = e.target.value
    const rolAnterior = rol
    setRol(nuevoRol)
    setError(null)

    startTransition(async () => {
      const result = await cambiarRol(userId, nuevoRol)
      if (result.error) {
        setRol(rolAnterior)
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={rol}
        onChange={handleChange}
        disabled={isPending || esPropioUsuario}
        title={esPropioUsuario ? 'No podés cambiar tu propio rol' : undefined}
        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="user">Usuario</option>
        <option value="admin">Admin</option>
      </select>

      {isPending && (
        <span className="text-xs text-slate-400">Guardando...</span>
      )}
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  )
}
