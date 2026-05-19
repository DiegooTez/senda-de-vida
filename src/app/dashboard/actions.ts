'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type TransaccionState = {
  error?: string
  success?: boolean
}

export async function crearTransaccion(
  _prevState: TransaccionState,
  formData: FormData
): Promise<TransaccionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado' }

  const caja_id = formData.get('caja_id') as string
  const tipo = formData.get('tipo') as 'ingreso' | 'egreso'
  const categoria_id = formData.get('categoria_id') as string
  const monto = parseFloat(formData.get('monto') as string)
  const descripcion = (formData.get('descripcion') as string) || null
  const nota = (formData.get('nota') as string) || null
  const fecha = formData.get('fecha') as string

  if (!caja_id || !tipo || !categoria_id || !fecha) {
    return { error: 'Completá todos los campos requeridos' }
  }
  if (isNaN(monto) || monto <= 0) {
    return { error: 'El monto debe ser mayor a 0' }
  }

  const { error: insertError } = await supabase.from('transacciones').insert({
    caja_id,
    tipo,
    categoria_id,
    monto,
    descripcion,
    nota,
    fecha,
  })

  if (insertError) return { error: insertError.message }

  // Actualizar saldo de la caja
  const { data: caja, error: cajaError } = await supabase
    .from('cajas')
    .select('saldo')
    .eq('id', caja_id)
    .single()

  if (cajaError || !caja) return { error: 'Error al actualizar el saldo de la caja' }

  const nuevoSaldo =
    tipo === 'ingreso'
      ? Number(caja.saldo) + monto
      : Number(caja.saldo) - monto

  const { error: updateError } = await supabase
    .from('cajas')
    .update({ saldo: nuevoSaldo })
    .eq('id', caja_id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/dashboard')
  return { success: true }
}
