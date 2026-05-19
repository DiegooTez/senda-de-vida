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

export async function agregarPermiso(
  _prevState: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'Email requerido' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (perfil?.role !== 'admin') return { error: 'Sin permisos de administrador' }

  const { error } = await supabase
    .from('usuarios_permitidos')
    .insert({ email, agregado_por: user.id })

  if (error) {
    if (error.code === '23505') return { error: 'Ese email ya está en la lista' }
    return { error: error.message }
  }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}

export async function eliminarPermiso(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (perfil?.role !== 'admin') return

  await supabase.from('usuarios_permitidos').delete().eq('id', id)
  revalidatePath('/dashboard/usuarios')
}
