'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/supabase/audit'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

// ─── Helper: obtener admin autenticado ────────────────────────────────────────
async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return null
  return user
}

async function getOrigin() {
  const headersList = await headers()
  const forwardedHost = headersList.get('x-forwarded-host')
  const forwardedProto = headersList.get('x-forwarded-proto') ?? 'https'
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'http://localhost:3000')
  )
}

// ─── ROL ──────────────────────────────────────────────────────────────────────
export async function cambiarRol(
  userId: string,
  nuevoRol: string
): Promise<{ error?: string }> {
  if (nuevoRol !== 'admin' && nuevoRol !== 'user') return { error: 'Rol inválido' }

  const admin_user = await getAdminUser()
  if (!admin_user) return { error: 'Sin permisos de administrador' }

  const admin = createAdminClient()

  // Obtener datos del usuario objetivo
  const { data: targetProfile } = await admin
    .from('profiles').select('email, rol').eq('id', userId).single()

  const { error } = await admin
    .from('profiles').update({ rol: nuevoRol }).eq('id', userId)

  if (error) return { error: error.message }

  await writeAuditLog({
    accion: 'cambiar_rol',
    entidad: 'profiles',
    entidad_id: userId,
    detalle: { rol_anterior: targetProfile?.rol, rol_nuevo: nuevoRol, email: targetProfile?.email },
    usuario_id: admin_user.id,
    usuario_email: admin_user.email!,
    admin_id: admin_user.id,
    admin_email: admin_user.email!,
  })

  revalidatePath('/dashboard/usuarios')
  return {}
}

// ─── INVITAR USUARIO ──────────────────────────────────────────────────────────
export async function invitarUsuario(
  _prevState: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const nombre = (formData.get('nombre') as string)?.trim()
  const rol = (formData.get('rol') as string) ?? 'user'

  if (!email) return { error: 'Email requerido' }
  if (rol !== 'admin' && rol !== 'user') return { error: 'Rol inválido' }

  const admin_user = await getAdminUser()
  if (!admin_user) return { error: 'Sin permisos de administrador' }

  const admin = createAdminClient()

  // Verificar si ya está en la whitelist
  const { data: existente } = await admin
    .from('usuarios_permitidos')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existente) return { error: 'Ese email ya está en la lista de acceso' }

  // Agregar a whitelist
  const { error: wlError } = await admin
    .from('usuarios_permitidos')
    .insert({ email, nombre: nombre || null, rol, activo: true, agregado_por: admin_user.id })

  if (wlError) {
    if (wlError.code === '23505') return { error: 'Ese email ya está en la lista' }
    return { error: wlError.message }
  }

  // Enviar email de invitación
  const origin = await getOrigin()
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/dashboard`,
    data: { nombre: nombre || email },
  })

  if (inviteError) {
    // Si falla el invite, al menos quedó en whitelist
    console.error('[invitar] Error enviando invite:', inviteError.message)
    // No fallar — el usuario puede registrarse manualmente
  }

  await writeAuditLog({
    accion: 'invitar_usuario',
    entidad: 'usuarios_permitidos',
    detalle: { email, nombre, rol, invite_enviado: !inviteError },
    usuario_id: admin_user.id,
    usuario_email: admin_user.email!,
    admin_id: admin_user.id,
    admin_email: admin_user.email!,
  })

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}

// ─── ELIMINAR PERMISO ─────────────────────────────────────────────────────────
export async function eliminarPermiso(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  if (!id) return

  const admin_user = await getAdminUser()
  if (!admin_user) return

  const admin = createAdminClient()

  const { data: permiso } = await admin
    .from('usuarios_permitidos').select('email').eq('id', id).single()

  await admin.from('usuarios_permitidos').delete().eq('id', id)

  await writeAuditLog({
    accion: 'eliminar_permiso',
    entidad: 'usuarios_permitidos',
    entidad_id: id,
    detalle: { email: permiso?.email },
    usuario_id: admin_user.id,
    usuario_email: admin_user.email!,
    admin_id: admin_user.id,
    admin_email: admin_user.email!,
  })

  revalidatePath('/dashboard/usuarios')
}

// ─── CAJAS ────────────────────────────────────────────────────────────────────
export async function crearCaja(
  _prevState: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const tipo = formData.get('tipo') as 'personal' | 'comunitaria'
  const moneda = formData.get('moneda') as 'ARS' | 'USD' | 'AMBAS'
  const visibilidad = (formData.get('visibilidad') as string) ?? 'todos'
  const nombre_titular = (formData.get('nombre_titular') as string)?.trim() || null

  if (!nombre || !tipo || !moneda) return { error: 'Completá todos los campos requeridos' }

  const admin_user = await getAdminUser()
  if (!admin_user) return { error: 'Sin permisos de administrador' }

  const admin = createAdminClient()
  const { data: caja, error } = await admin
    .from('cajas')
    .insert({ nombre, tipo, moneda, visibilidad, nombre_titular, saldo_ars: 0, saldo_usd: 0, activa: true })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await writeAuditLog({
    accion: 'crear_caja',
    entidad: 'cajas',
    entidad_id: caja.id,
    detalle: { nombre, tipo, moneda, visibilidad, nombre_titular },
    usuario_id: admin_user.id,
    usuario_email: admin_user.email!,
    admin_id: admin_user.id,
    admin_email: admin_user.email!,
  })

  revalidatePath('/dashboard/usuarios')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function editarCaja(
  _prevState: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const tipo = formData.get('tipo') as 'personal' | 'comunitaria'
  const moneda = formData.get('moneda') as 'ARS' | 'USD' | 'AMBAS'
  const visibilidad = (formData.get('visibilidad') as string) ?? 'todos'
  const nombre_titular = (formData.get('nombre_titular') as string)?.trim() || null

  if (!id || !nombre || !tipo || !moneda) return { error: 'Completá todos los campos requeridos' }

  const admin_user = await getAdminUser()
  if (!admin_user) return { error: 'Sin permisos de administrador' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('cajas')
    .update({ nombre, tipo, moneda, visibilidad, nombre_titular })
    .eq('id', id)

  if (error) return { error: error.message }

  await writeAuditLog({
    accion: 'editar_caja',
    entidad: 'cajas',
    entidad_id: id,
    detalle: { nombre, tipo, moneda, visibilidad, nombre_titular },
    usuario_id: admin_user.id,
    usuario_email: admin_user.email!,
    admin_id: admin_user.id,
    admin_email: admin_user.email!,
  })

  revalidatePath('/dashboard/usuarios')
  revalidatePath('/dashboard')
  return { success: true }
}

// ─── ASIGNACIÓN DE CAJAS ──────────────────────────────────────────────────────
export async function asignarCaja(
  cajaId: string,
  usuarioId: string
): Promise<{ error?: string }> {
  const admin_user = await getAdminUser()
  if (!admin_user) return { error: 'Sin permisos' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('caja_usuarios')
    .insert({ caja_id: cajaId, usuario_id: usuarioId })

  if (error) {
    if (error.code === '23505') return {} // ya asignada, ok
    return { error: error.message }
  }

  const { data: caja } = await admin.from('cajas').select('nombre').eq('id', cajaId).single()
  const { data: perfil } = await admin.from('profiles').select('email').eq('id', usuarioId).single()

  await writeAuditLog({
    accion: 'asignar_caja',
    entidad: 'caja_usuarios',
    entidad_id: cajaId,
    detalle: { caja_nombre: caja?.nombre, usuario_email: perfil?.email },
    usuario_id: admin_user.id,
    usuario_email: admin_user.email!,
    admin_id: admin_user.id,
    admin_email: admin_user.email!,
  })

  revalidatePath('/dashboard/usuarios')
  return {}
}

export async function desasignarCaja(
  cajaId: string,
  usuarioId: string
): Promise<{ error?: string }> {
  const admin_user = await getAdminUser()
  if (!admin_user) return { error: 'Sin permisos' }

  const admin = createAdminClient()
  const { data: caja } = await admin.from('cajas').select('nombre').eq('id', cajaId).single()
  const { data: perfil } = await admin.from('profiles').select('email').eq('id', usuarioId).single()

  await admin
    .from('caja_usuarios')
    .delete()
    .eq('caja_id', cajaId)
    .eq('usuario_id', usuarioId)

  await writeAuditLog({
    accion: 'desasignar_caja',
    entidad: 'caja_usuarios',
    entidad_id: cajaId,
    detalle: { caja_nombre: caja?.nombre, usuario_email: perfil?.email },
    usuario_id: admin_user.id,
    usuario_email: admin_user.email!,
    admin_id: admin_user.id,
    admin_email: admin_user.email!,
  })

  revalidatePath('/dashboard/usuarios')
  return {}
}

// ─── GUARDAR ASIGNACIONES COMPLETAS DE UN USUARIO ────────────────────────────
export async function guardarAsignacionesCajas(
  usuarioId: string,
  cajaIdsSeleccionadas: string[]
): Promise<{ error?: string }> {
  const admin_user = await getAdminUser()
  if (!admin_user) return { error: 'Sin permisos' }

  const admin = createAdminClient()

  // Obtener asignaciones actuales
  const { data: actuales } = await admin
    .from('caja_usuarios')
    .select('caja_id')
    .eq('usuario_id', usuarioId)

  const actualesIds = (actuales ?? []).map((a) => a.caja_id)

  const agregar = cajaIdsSeleccionadas.filter((id) => !actualesIds.includes(id))
  const quitar = actualesIds.filter((id) => !cajaIdsSeleccionadas.includes(id))

  if (agregar.length > 0) {
    await admin.from('caja_usuarios').insert(
      agregar.map((caja_id) => ({ caja_id, usuario_id: usuarioId }))
    )
  }
  if (quitar.length > 0) {
    await admin
      .from('caja_usuarios')
      .delete()
      .eq('usuario_id', usuarioId)
      .in('caja_id', quitar)
  }

  const { data: perfil } = await admin.from('profiles').select('email').eq('id', usuarioId).single()

  await writeAuditLog({
    accion: 'asignar_caja',
    entidad: 'caja_usuarios',
    detalle: {
      usuario_email: perfil?.email,
      cajas_agregadas: agregar.length,
      cajas_quitadas: quitar.length,
    },
    usuario_id: admin_user.id,
    usuario_email: admin_user.email!,
    admin_id: admin_user.id,
    admin_email: admin_user.email!,
  })

  revalidatePath('/dashboard/usuarios')
  revalidatePath('/dashboard')
  return {}
}
