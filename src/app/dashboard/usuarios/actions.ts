'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cambiarRol(
  userId: string,
  nuevoRol: string
): Promise<{ error?: string }> {
  if (nuevoRol !== 'admin' && nuevoRol !== 'user') {
    return { error: 'Rol inválido' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado' }

  // Verificar que el caller es admin
  const { data: perfilCaller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (perfilCaller?.role !== 'admin') return { error: 'Sin permisos de administrador' }

  const { error } = await supabase
    .from('profiles')
    .update({ role: nuevoRol })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/usuarios')
  return {}
}
