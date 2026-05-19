import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Only use in server-side code (Server Actions, Route Handlers).
// Never import this from client components.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
