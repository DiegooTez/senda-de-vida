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
  const moneda = formData.get('moneda') as 'ARS' | 'USD'
  const tipo = formData.get('tipo') as 'ingreso' | 'egreso'
  const categoria_id = (formData.get('categoria_id') as string) || null
  const monto = parseFloat(formData.get('monto') as string)
  const descripcion = (formData.get('descripcion') as string) || null
  const descripcion_custom = (formData.get('descripcion_custom') as string) || null
  const fecha = formData.get('fecha') as string

  if (!caja_id || !moneda || !tipo || !fecha) {
    return { error: 'Completá todos los campos requeridos' }
  }
  if (isNaN(monto) || monto <= 0) {
    return { error: 'El monto debe ser mayor a 0' }
  }

  const { data: caja, error: cajaError } = await supabase
    .from('cajas')
    .select('saldo_ars, saldo_usd')
    .eq('id', caja_id)
    .single()

  if (cajaError || !caja) return { error: 'No se encontró la caja' }

  const delta = tipo === 'ingreso' ? monto : -monto
  const nuevoSaldoArs = moneda === 'ARS' ? Number(caja.saldo_ars) + delta : Number(caja.saldo_ars)
  const nuevoSaldoUsd = moneda === 'USD' ? Number(caja.saldo_usd) + delta : Number(caja.saldo_usd)

  const { error: insertError } = await supabase.from('transacciones').insert({
    caja_id,
    moneda,
    tipo,
    categoria_id,
    monto,
    descripcion,
    descripcion_custom,
    fecha,
    creado_por: user.id,
    saldo_posterior_ars: nuevoSaldoArs,
    saldo_posterior_usd: nuevoSaldoUsd,
  })

  if (insertError) return { error: insertError.message }

  const { error: updateError } = await supabase
    .from('cajas')
    .update(moneda === 'ARS' ? { saldo_ars: nuevoSaldoArs } : { saldo_usd: nuevoSaldoUsd })
    .eq('id', caja_id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export type EditarTransaccionState = {
  error?: string
  success?: boolean
}

export async function editarTransaccion(
  _prevState: EditarTransaccionState,
  formData: FormData
): Promise<EditarTransaccionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  if (perfil?.rol !== 'admin') return { error: 'No autorizado' }

  const transaccion_id = formData.get('transaccion_id') as string
  const tipo = formData.get('tipo') as 'ingreso' | 'egreso'
  const categoria_id = (formData.get('categoria_id') as string) || null
  const monto = parseFloat(formData.get('monto') as string)
  const descripcion = (formData.get('descripcion') as string) || null
  const fecha = (formData.get('fecha') as string) || null

  if (!transaccion_id || !tipo || !fecha) return { error: 'Datos incompletos' }
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0' }

  const { data: tx, error: txError } = await supabase
    .from('transacciones')
    .select('tipo, monto, moneda, caja_id')
    .eq('id', transaccion_id)
    .single()

  if (txError || !tx) return { error: 'Transacción no encontrada' }

  const { data: caja, error: cajaError } = await supabase
    .from('cajas')
    .select('saldo_ars, saldo_usd')
    .eq('id', tx.caja_id)
    .single()

  if (cajaError || !caja) return { error: 'Error al obtener el saldo de la caja' }

  const deltaAnterior = tx.tipo === 'ingreso' ? Number(tx.monto) : -Number(tx.monto)
  const deltaNuevo = tipo === 'ingreso' ? monto : -monto

  const nuevoSaldoArs =
    tx.moneda === 'ARS'
      ? Number(caja.saldo_ars) - deltaAnterior + deltaNuevo
      : Number(caja.saldo_ars)

  const nuevoSaldoUsd =
    tx.moneda === 'USD'
      ? Number(caja.saldo_usd) - deltaAnterior + deltaNuevo
      : Number(caja.saldo_usd)

  const { error: updateTxError } = await supabase
    .from('transacciones')
    .update({
      tipo,
      categoria_id,
      monto,
      descripcion,
      fecha,
      saldo_posterior_ars: nuevoSaldoArs,
      saldo_posterior_usd: nuevoSaldoUsd,
    })
    .eq('id', transaccion_id)

  if (updateTxError) return { error: updateTxError.message }

  const { error: updateCajaError } = await supabase
    .from('cajas')
    .update(tx.moneda === 'ARS' ? { saldo_ars: nuevoSaldoArs } : { saldo_usd: nuevoSaldoUsd })
    .eq('id', tx.caja_id)

  if (updateCajaError) return { error: updateCajaError.message }

  revalidatePath('/dashboard')
  return { success: true }
}
