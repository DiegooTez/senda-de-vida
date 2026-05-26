import { createAdminClient } from './admin'

export type AuditAccion =
  | 'crear_transaccion'
  | 'editar_transaccion'
  | 'solicitar_eliminacion'
  | 'aprobar_eliminacion'
  | 'rechazar_eliminacion'
  | 'crear_caja'
  | 'editar_caja'
  | 'asignar_caja'
  | 'desasignar_caja'
  | 'cambiar_rol'
  | 'invitar_usuario'
  | 'eliminar_permiso'

type AuditParams = {
  accion: AuditAccion
  entidad: string
  entidad_id?: string
  detalle?: Record<string, unknown>
  usuario_id: string
  usuario_email: string
  admin_id?: string
  admin_email?: string
}

export async function writeAuditLog(params: AuditParams) {
  try {
    const admin = createAdminClient()
    await admin.from('audit_log').insert({
      accion: params.accion,
      entidad: params.entidad,
      entidad_id: params.entidad_id ?? null,
      detalle: params.detalle ?? null,
      usuario_id: params.usuario_id,
      usuario_email: params.usuario_email,
      admin_id: params.admin_id ?? null,
      admin_email: params.admin_email ?? null,
    })
  } catch (e) {
    // El log nunca debe romper el flujo principal
    console.error('[audit_log] Error escribiendo log:', e)
  }
}
