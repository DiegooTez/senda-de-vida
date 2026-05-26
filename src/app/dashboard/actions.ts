'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/supabase/audit'
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const caja_id = formData.get('caja_id') as string
  const moneda = formData.get('moneda') as 'ARS' | 'USD'
  const tipo = formData.get('tipo') as 'ingreso' | 'egreso'
  const categoria_id = (formData.get('categoria_id') as string) || null
  const monto = parseFloat(formData.get('monto') as string)
  const descripcion = (formData.get('descripcion') as string) || null
  const descripcion_custom = (formData.get('descripcion_custom') as string) || null
  const fecha = formData.get('fecha') as string

  if (!caja_id || !moneda || !tipo || !fecha) return { error: 'Completá todos los campos requeridos' }
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0' }

  const { data: caja, error: cajaError } = await supabase
    .from('cajas').select('saldo_ars, saldo_usd, nombre').eq('id', caja_id).single()

  if (cajaError || !caja) return { error: 'No se encontró la caja' }

  const delta = tipo === 'ingreso' ? monto : -monto
  const nuevoSaldoArs = moneda === 'ARS' ? Number(caja.saldo_ars) + delta : Number(caja.saldo_ars)
  const nuevoSaldoUsd = moneda === 'USD' ? Number(caja.saldo_usd) + delta : Number(caja.saldo_usd)

  const { data: tx, error: insertError } = await supabase.from('transacciones').insert({
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
  }).select('id').single()

  if (insertError) return { error: insertError.message }

  const { error: updateError } = await supabase
    .from('cajas')
    .update(moneda === 'ARS' ? { saldo_ars: nuevoSaldoArs } : { saldo_usd: nuevoSaldoUsd })
    .eq('id', caja_id)

  if (updateError) return { error: updateError.message }

  // Audit log
  await writeAuditLog({
    accion: 'crear_transaccion',
    entidad: 'transacciones',
    entidad_id: tx?.id,
    detalle: { tipo, moneda, monto, caja_nombre: caja.nombre, descripcion, fecha },
    usuario_id: user.id,
    usuario_email: user.email!,
  })

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: perfil } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
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
    .from('transacciones').select('tipo, monto, moneda, caja_id').eq('id', transaccion_id).single()

  if (txError || !tx) return { error: 'Transacción no encontrada' }

  const { data: caja, error: cajaError } = await supabase
    .from('cajas').select('saldo_ars, saldo_usd, nombre').eq('id', tx.caja_id).single()

  if (cajaError || !caja) return { error: 'Error al obtener el saldo de la caja' }

  const deltaAnterior = tx.tipo === 'ingreso' ? Number(tx.monto) : -Number(tx.monto)
  const deltaNuevo = tipo === 'ingreso' ? monto : -monto

  const nuevoSaldoArs = tx.moneda === 'ARS'
    ? Number(caja.saldo_ars) - deltaAnterior + deltaNuevo
    : Number(caja.saldo_ars)
  const nuevoSaldoUsd = tx.moneda === 'USD'
    ? Number(caja.saldo_usd) - deltaAnterior + deltaNuevo
    : Number(caja.saldo_usd)

  const { error: updateTxError } = await supabase
    .from('transacciones')
    .update({ tipo, categoria_id, monto, descripcion, fecha, saldo_posterior_ars: nuevoSaldoArs, saldo_posterior_usd: nuevoSaldoUsd })
    .eq('id', transaccion_id)

  if (updateTxError) return { error: updateTxError.message }

  const { error: updateCajaError } = await supabase
    .from('cajas')
    .update(tx.moneda === 'ARS' ? { saldo_ars: nuevoSaldoArs } : { saldo_usd: nuevoSaldoUsd })
    .eq('id', tx.caja_id)

  if (updateCajaError) return { error: updateCajaError.message }

  // Audit log
  await writeAuditLog({
    accion: 'editar_transaccion',
    entidad: 'transacciones',
    entidad_id: transaccion_id,
    detalle: {
      tipo_nuevo: tipo,
      monto_nuevo: monto,
      monto_anterior: tx.monto,
      tipo_anterior: tx.tipo,
      caja_nombre: caja.nombre,
      descripcion,
      fecha,
    },
    usuario_id: user.id,
    usuario_email: user.email!,
    admin_id: user.id,
    admin_email: user.email!,
  })

  revalidatePath('/dashboard')
  return { success: true }
}

// ─── SOLICITUD DE ELIMINACIÓN ─────────────────────────────────────────────────
export type SolicitudState = { error?: string; success?: boolean }

export async function solicitarEliminacion(
  _prevState: SolicitudState,
  formData: FormData
): Promise<SolicitudState> {
  const transaccion_id = formData.get('transaccion_id') as string
  const motivo = (formData.get('motivo') as string) || null

  if (!transaccion_id) return { error: 'ID de transacción requerido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verificar que ya no hay una solicitud pendiente para esta transacción
  const { data: existente } = await supabase
    .from('solicitudes_eliminacion')
    .select('id')
    .eq('transaccion_id', transaccion_id)
    .eq('estado', 'pendiente')
    .maybeSingle()

  if (existente) return { error: 'Ya existe una solicitud pendiente para esta transacción' }

  const { error } = await supabase
    .from('solicitudes_eliminacion')
    .insert({ transaccion_id, solicitado_por: user.id, motivo })

  if (error) return { error: error.message }

  await writeAuditLog({
    accion: 'solicitar_eliminacion',
    entidad: 'transacciones',
    entidad_id: transaccion_id,
    detalle: { motivo },
    usuario_id: user.id,
    usuario_email: user.email!,
  })

  revalidatePath('/dashboard')
  return { success: true }
}

// ─── PROCESAR SOLICITUD (ADMIN) ───────────────────────────────────────────────
export async function procesarEliminacion(
  solicitudId: string,
  accion: 'aprobar' | 'rechazar'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: perfil } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return { error: 'Sin permisos de administrador' }

  const { data: solicitud } = await supabase
    .from('solicitudes_eliminacion')
    .select('transaccion_id, solicitado_por')
    .eq('id', solicitudId)
    .single()

  if (!solicitud) return { error: 'Solicitud no encontrada' }

  const estado = accion === 'aprobar' ? 'aprobada' : 'rechazada'

  const { error: updateError } = await supabase
    .from('solicitudes_eliminacion')
    .update({ estado, revisado_por: user.id, revisado_en: new Date().toISOString() })
    .eq('id', solicitudId)

  if (updateError) return { error: updateError.message }

  if (accion === 'aprobar') {
    // Usar admin client para poder eliminar (admin RLS)
    const admin = createAdminClient()

    // Obtener datos de la tx para revertir saldo
    const { data: tx } = await admin
      .from('transacciones')
      .select('tipo, monto, moneda, caja_id, saldo_posterior_ars, saldo_posterior_usd')
      .eq('id', solicitud.transaccion_id)
      .single()

    if (tx) {
      const { data: caja } = await admin
        .from('cajas').select('saldo_ars, saldo_usd').eq('id', tx.caja_id).single()

      if (caja) {
        const delta = tx.tipo === 'ingreso' ? -Number(tx.monto) : Number(tx.monto)
        const nuevoArs = tx.moneda === 'ARS' ? Number(caja.saldo_ars) + delta : Number(caja.saldo_ars)
        const nuevoUsd = tx.moneda === 'USD' ? Number(caja.saldo_usd) + delta : Number(caja.saldo_usd)
        await admin.from('cajas')
          .update({ saldo_ars: nuevoArs, saldo_usd: nuevoUsd })
          .eq('id', tx.caja_id)
      }
    }

    await admin.from('transacciones').delete().eq('id', solicitud.transaccion_id)
  }

  await writeAuditLog({
    accion: accion === 'aprobar' ? 'aprobar_eliminacion' : 'rechazar_eliminacion',
    entidad: 'transacciones',
    entidad_id: solicitud.transaccion_id,
    detalle: { solicitud_id: solicitudId },
    usuario_id: solicitud.solicitado_por,
    usuario_email: '',
    admin_id: user.id,
    admin_email: user.email!,
  })

  revalidatePath('/dashboard')
  return {}
}
