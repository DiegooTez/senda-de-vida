'use client'

import { useState, useTransition } from 'react'
import { guardarAsignacionesCajas } from './actions'

type Caja = {
  id: string
  nombre: string
  tipo: 'personal' | 'comunitaria'
  moneda: string
}

type Props = {
  usuarioId: string
  usuarioNombre: string
  todasLasCajas: Caja[]
  cajasAsignadas: string[] // IDs
}

export function AsignarCajasModal({ usuarioId, usuarioNombre, todasLasCajas, cajasAsignadas }: Props) {
  const [open, setOpen] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState<string[]>(cajasAsignadas)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(id: string) {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleGuardar() {
    setError(null)
    startTransition(async () => {
      const result = await guardarAsignacionesCajas(usuarioId, seleccionadas)
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  const personales = todasLasCajas.filter((c) => c.tipo === 'personal')
  const comunitarias = todasLasCajas.filter((c) => c.tipo === 'comunitaria')

  return (
    <>
      <button
        onClick={() => { setSeleccionadas(cajasAsignadas); setOpen(true) }}
        className="text-xs px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
      >
        Cajas ({cajasAsignadas.length})
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-navy to-brand px-6 py-4">
              <h2 className="text-white font-bold text-lg">Asignar cajas</h2>
              <p className="text-blue-200 text-sm">{usuarioNombre}</p>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Cajas personales */}
              {personales.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Personales
                  </p>
                  <div className="space-y-2">
                    {personales.map((caja) => (
                      <label
                        key={caja.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={seleccionadas.includes(caja.id)}
                          onChange={() => toggle(caja.id)}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{caja.nombre}</p>
                          <p className="text-xs text-slate-400">{caja.moneda}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 font-semibold">
                          Personal
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Cajas comunitarias */}
              {comunitarias.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Comunitarias
                  </p>
                  <div className="space-y-2">
                    {comunitarias.map((caja) => (
                      <label
                        key={caja.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={seleccionadas.includes(caja.id)}
                          onChange={() => toggle(caja.id)}
                          className="w-4 h-4 rounded accent-teal-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{caja.nombre}</p>
                          <p className="text-xs text-slate-400">{caja.moneda}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-200 font-semibold">
                          Comunitaria
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={isPending}
                className="flex-1 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
