import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * Segundo cliente de Supabase.
 *
 * Se usa EXCLUSIVAMENTE para el flujo de "crear usuario" desde el panel
 * de administración (supabase.auth.signUp). Usa la misma URL y la misma
 * anon key que el cliente principal, pero con persistSession: false para
 * que, al crear un nuevo usuario, NO se sobrescriba la sesión del
 * administrador que está logueado en el cliente principal.
 *
 * Nunca debe usarse la service_role key aquí ni en ningún otro lugar
 * del frontend.
 */
export const supabaseAdminAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
