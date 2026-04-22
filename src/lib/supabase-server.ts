import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Server client with anon key */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/** Service role client -- bypasses RLS, use only on server */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}
