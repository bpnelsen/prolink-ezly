import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Service role client — bypasses RLS; used for all server-side business logic
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anon client — used only for auth operations (signIn, signUp, refresh)
export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
